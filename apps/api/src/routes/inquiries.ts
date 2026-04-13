import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types/bindings'
import { buildContext } from '../services/rag/pipeline'
import { MODELS } from '../services/llm/models'

export const inquiryRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>()

inquiryRoutes.use('*', authMiddleware)

const streamSchema = z.object({
  documentIds: z.array(z.string()).optional().default([]),
  question: z.string().min(1).max(2000),
  mode: z.enum(['lawyer', 'client']).optional().default('lawyer'),
  crossQuestionContext: z.string().optional(),
})

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

function buildSystemPrompt(mode: 'lawyer' | 'client') {
  const modeTone =
    mode === 'lawyer'
      ? 'Use precise legal terminology, cite relevant precedents, and maintain a highly formal, professional tone suitable for a judge or attorney.'
      : 'Explain concepts in simple, easy-to-understand layman terms. Avoid heavy legal jargon where possible, or clearly explain it if necessary.'

  return `You are PatraSaar, an expert Indian legal assistant.
${modeTone}

REQUIRED RESPONSE STRUCTURE:
You must strictly organize your response into these exact sections using markdown level 2 headers (i.e. '## '). DO NOT output any introductory or conversational text (like "Namaste!" or "I understand..."). Start immediately with the first header:
## Case Summary
## Applicable Laws & Potential Charges
## Actionable Next Steps

CRITICAL INSTRUCTION FOR LAWS:
Whenever you mention an Indian statute, act, or section (e.g. Section 302 of IPC), you MUST format it as a markdown link using this exact custom URI scheme with a trailing short description:
[Display Text](law:ActShortcut:Section:A brief 1-sentence description of what this section covers)
Example: [Section 302 of the IPC](law:IPC:302:Outlines the punishment for committing murder).

OUT-OF-THE-BOX TIMELINE INSTRUCTION:
At the very end of your response, you MUST output a hidden JSON block wrapping timeline events you gathered from the user's facts. Format it EXACTLY like this:
<data>
{"timeline": [{"date": "YYYY-MM-DD or Unknown", "event": "Description"}]}
</data>

If context is provided below, prioritize it. Do not fabricate legal information.`
}

/** Stream a RAG-powered legal inquiry response via SSE */
inquiryRoutes.post('/stream', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = streamSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400)
  }

  const { documentIds, question, mode, crossQuestionContext } = parsed.data
  const userId = c.get('userId')

  // Fetch from RAG regardless of whether user uploaded docs
  // The system will hit the LEGAL_INDEX for general laws and CHUNKS_INDEX if they provided documentIds
  let context = ''
  try {
    const ragResult = await buildContext(documentIds, question, userId, c.env)
    context = ragResult.context
  } catch (e) {
    console.error('RAG error, continuing without context', e)
  }

  const finalQuestion = crossQuestionContext
    ? `The user highlighted this exact text from a previous message: "${crossQuestionContext}"\n\nThey have a follow up question about it: ${question}`
    : question

  const messages = [
    { role: 'system', content: buildSystemPrompt(mode) },
    {
      role: 'user',
      content: context
        ? `Context:\n${context}\n\nQuestion: ${finalQuestion}`
        : `Question: ${finalQuestion}`,
    },
  ]

  const llmRes = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': c.env.FRONTEND_URL,
    },
    body: JSON.stringify({ model: MODELS.primary, messages, stream: true }),
  })

  if (!llmRes.ok || !llmRes.body) {
    const errorText = await llmRes.text().catch(() => 'Failed to read error body')
    console.error('OpenRouter Failure:', llmRes.status, errorText)
    return c.json({ error: 'LLM request failed', status: llmRes.status, details: errorText }, 502)
  }

  // Removed DB insertion for now
  const inquiryId = crypto.randomUUID().replace(/-/g, '')

  // Stream LLM response directly to the client as SSE
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  // Collect full answer in background to persist after stream completes
  let fullAnswer = ''

  const pump = async () => {
    const reader = llmRes.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split by newlines, keep the last fragment in the buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        // Parse OpenRouter SSE format to extract just the text/reasoning tokens
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ') || trimmed.includes('[DONE]')) continue
          try {
            const delta = JSON.parse(trimmed.slice(6))
            const text = delta?.choices?.[0]?.delta?.content ?? ''

            if (text) {
              fullAnswer += text
              // Forward clean raw text token to client instead of SSE block
              await writer.write(encoder.encode(text))
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } finally {
      await writer.close()
    }
  }

  pump()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Inquiry-Id': inquiryId,
    },
  })
})

/** List past inquiries for the current user */
inquiryRoutes.get('/', async (c) => {
  return c.json({ inquiries: [] })
})

/** Get a single inquiry with its full answer and citations */
inquiryRoutes.get('/:id', async (c) => {
  return c.json({ error: 'Inquiry not found' }, 404)
})
