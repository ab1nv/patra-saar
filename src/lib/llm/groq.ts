import Groq from 'groq-sdk'

const DEFAULT_MODEL = 'qwen/qwen3.8-27b'
// The Groq free tier enforces a hard output-tokens-per-minute cap (1000). Keep the
// requested max_tokens comfortably under it; override with GROQ_MAX_TOKENS.
const DEFAULT_MAX_TOKENS = 700

function groqModel(): string {
  return process.env.GROQ_MODEL ?? DEFAULT_MODEL
}

function groqMaxTokens(): number {
  const configured = Number(process.env.GROQ_MAX_TOKENS)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_TOKENS
}

/**
 * Streams token deltas from Groq's OpenAI-compatible chat completions endpoint.
 * temperature is deliberately low: we want obedience to the citation format,
 * not creativity.
 */
export async function* streamGroq(
  messages: {
    role: 'system' | 'user' | 'assistant'
    content: string
  }[],
  maxTokens: number = groqMaxTokens(),
): AsyncGenerator<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')

  const groq = new Groq({ apiKey })
  const stream = await groq.chat.completions.create({
    model: groqModel(),
    messages,
    stream: true,
    temperature: 0.1,
    max_tokens: maxTokens,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta
  }
}

/** Non-streaming completion, used by the audit harness. */
export async function completeGroq(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  maxTokens = 900,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')
  // Keep SDK retries off and use a short timeout so the audit's own backoff owns retrying.
  const groq = new Groq({ apiKey, maxRetries: 0, timeout: 30_000 })
  const res = await groq.chat.completions.create({
    model: groqModel(),
    messages,
    temperature: 0.1,
    max_tokens: maxTokens,
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}

/** Generates a short chat title from the question + answer. Falls back to a heuristic. */
export async function generateTitle(question: string, answer: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return heuristicTitle(question)
  try {
    const groq = new Groq({ apiKey })
    const res = await groq.chat.completions.create({
      model: groqModel(),
      messages: [
        {
          role: 'system',
          content:
            'You name chat threads about Indian law. Reply with ONLY a 3 to 5 word title. No quotes, no trailing punctuation, no prefix like "Title:". Title Case.',
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nAnswer excerpt: ${answer.slice(0, 1200)}`,
        },
      ],
      max_tokens: 24,
      temperature: 0.2,
    })
    const raw = res.choices[0]?.message?.content?.trim() ?? ''
    const title = raw
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/[.!]+$/g, '')
      .replace(/^title:\s*/i, '')
      .trim()
    if (title.length >= 3 && title.length <= 60) return title
    return heuristicTitle(question)
  } catch {
    return heuristicTitle(question)
  }
}

export function heuristicTitle(question: string): string {
  const words = question.trim().replace(/\s+/g, ' ').split(' ').slice(0, 6).join(' ')
  return words.slice(0, 60) || 'New inquiry'
}
