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
  caseId: z.string().min(1).optional(),
})

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

function buildCaseNameFromQuestion(question: string): string {
  const words = question
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)

  const titleWords = words.slice(0, 6)
  while (titleWords.length < 3) {
    titleWords.push('inquiry')
  }

  return titleWords.join(' ').slice(0, 80)
}

function extractStreamText(payload: any): string {
  const choice = payload?.choices?.[0]
  const delta = choice?.delta ?? choice?.message ?? {}
  const content = delta?.content ?? choice?.text ?? payload?.text ?? ''

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && typeof part.text === 'string') {
          return part.text
        }
        return ''
      })
      .join('')
  }

  return ''
}

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

DEPTH REQUIREMENT:
- Provide a substantial, practical answer by default.
- Unless the user explicitly asks for a short response, each section should contain multiple concrete bullet points and explanatory detail.
- Aim for legal and procedural completeness over brevity.

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

  const { documentIds, question, mode, crossQuestionContext, caseId } = parsed.data
  const userId = c.get('userId')

  let activeCaseId = caseId ?? ''
  let activeCaseName = ''
  const derivedCaseName = buildCaseNameFromQuestion(question)
  let casePersisted = false

  if (activeCaseId) {
    const caseRow = await c.env.DB.prepare(
      'SELECT id, name FROM cases WHERE id = ? AND user_id = ? LIMIT 1',
    )
      .bind(activeCaseId, userId)
      .first<{ id: string; name: string }>()

    if (caseRow) {
      activeCaseName = caseRow.name
      casePersisted = true
    } else {
      activeCaseName = derivedCaseName
    }
  } else {
    activeCaseId = crypto.randomUUID().replace(/-/g, '')
    activeCaseName = derivedCaseName
  }

  const ensureCasePersisted = async () => {
    if (casePersisted) return true
    try {
      await c.env.DB.prepare('INSERT INTO cases (id, user_id, name) VALUES (?, ?, ?)')
        .bind(activeCaseId, userId, activeCaseName)
        .run()
      casePersisted = true
      return true
    } catch (err) {
      console.error('Failed to persist case for stream:', err)
      return false
    }
  }

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
    body: JSON.stringify({
      model: MODELS.primary,
      messages,
      stream: true,
      max_tokens: 1800,
      temperature: 0.2,
    }),
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
  const fallbackAnswer =
    "I'm sorry, I couldn't generate a response right now. Please retry your question."

  // Collect full answer in background to persist after stream completes
  let fullAnswer = ''
  let inquiryPersisted = false

  const pump = async () => {
    const reader = llmRes.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const ensureInquiryPersisted = async () => {
      if (inquiryPersisted) return true

      try {
        await c.env.DB.prepare(
          'INSERT INTO inquiries (id, user_id, case_id, document_ids, question, answer, model_used) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
          .bind(
            inquiryId,
            userId,
            activeCaseId,
            JSON.stringify(documentIds),
            finalQuestion,
            '',
            MODELS.primary,
          )
          .run()

        inquiryPersisted = true
        return true
      } catch (err) {
        console.error('Failed to create inquiry row during stream:', err)
        return false
      }
    }

    const processLine = async (rawLine: string) => {
      const trimmed = rawLine.trim()
      if (!trimmed.startsWith('data:') || trimmed.includes('[DONE]')) return

      const jsonPayload = trimmed.replace(/^data:\s*/, '')
      if (!jsonPayload) return

      try {
        const delta = JSON.parse(jsonPayload)
        const text = extractStreamText(delta)

        if (!text) return

        if (!(await ensureCasePersisted())) {
          return
        }

        if (!(await ensureInquiryPersisted())) {
          return
        }

        fullAnswer += text
        await writer.write(encoder.encode(text))
      } catch {
        // malformed SSE line — skip
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (buffer.trim()) {
            await processLine(buffer)
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Split by newlines, keep the last fragment in the buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          await processLine(line)
        }
      }

      if (!fullAnswer.trim()) {
        fullAnswer = fallbackAnswer
        await writer.write(encoder.encode(fallbackAnswer))
      }
    } finally {
      await writer.close()

      // Save global user's inquiry context to cloudflare D1.
      // We wrap it in a microtask/catch to not explode node process on background failure.
      if (fullAnswer.trim() && (await ensureCasePersisted())) {
        try {
          if (!inquiryPersisted) {
            await c.env.DB.prepare(
              'INSERT INTO inquiries (id, user_id, case_id, document_ids, question, answer, model_used) VALUES (?, ?, ?, ?, ?, ?, ?)',
            )
              .bind(
                inquiryId,
                userId,
                activeCaseId,
                JSON.stringify(documentIds),
                finalQuestion,
                fullAnswer,
                MODELS.primary,
              )
              .run()
            inquiryPersisted = true
          } else {
            await c.env.DB.prepare(
              'UPDATE inquiries SET answer = ?, model_used = ? WHERE id = ? AND user_id = ?',
            )
              .bind(fullAnswer, MODELS.primary, inquiryId, userId)
              .run()
          }
        } catch (err) {
          console.error('Failed to log inquiry background:', err)
        }
      }
    }
  }

  c.executionCtx.waitUntil(pump())

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Inquiry-Id': inquiryId,
      'X-Case-Id': activeCaseId,
      'X-Case-Name': encodeURIComponent(activeCaseName),
    },
  })
})

/** List past inquiries for the current user */
inquiryRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT question, answer, created_at FROM inquiries WHERE user_id = ? ORDER BY created_at ASC',
    )
      .bind(userId)
      .all()

    return c.json({ inquiries: results })
  } catch (err) {
    console.error('Failed to fetch inquiries:', err)
    return c.json({ inquiries: [] })
  }
})

/** Get a single inquiry with its full answer and citations */
inquiryRoutes.get('/:id', async (c) => {
  return c.json({ error: 'Inquiry not found' }, 404)
})
