import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types/bindings'
import { buildContext } from '../services/rag/pipeline'

export const inquiryRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>()

inquiryRoutes.use('*', authMiddleware)

const streamSchema = z.object({
  documentIds: z.array(z.string()).min(1),
  question: z.string().min(1).max(2000),
})

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-flash-1.5'

const SYSTEM_PROMPT = `You are PatraSaar, an expert Indian legal assistant.
Answer the user's question using ONLY the context provided below.
Cite your sources by referencing the document label at the start of each context block.
If the context does not contain sufficient information to answer, say so clearly.
Do not fabricate legal information.`

/** Stream a RAG-powered legal inquiry response via SSE */
inquiryRoutes.post('/stream', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = streamSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400)
  }

  const { documentIds, question } = parsed.data
  const userId = c.get('userId')

  const { context, chunkIds } = await buildContext(documentIds, question, userId, c.env)

  if (!context) {
    return c.json({ error: 'No relevant context found for this question' }, 422)
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
  ]

  const llmRes = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': c.env.FRONTEND_URL,
    },
    body: JSON.stringify({ model: MODEL, messages, stream: true }),
  })

  if (!llmRes.ok || !llmRes.body) {
    return c.json({ error: 'LLM request failed', status: llmRes.status }, 502)
  }

  // Persist inquiry record (non-blocking — fire and forget, answer filled in later)
  const inquiryId = crypto.randomUUID().replace(/-/g, '')
  c.env.DB.prepare(
    'INSERT INTO inquiries (id, user_id, document_ids, question, model_used) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(inquiryId, userId, JSON.stringify(documentIds), question, MODEL)
    .run()
    .catch(() => {}) // best-effort; don't break the stream

  // Stream LLM response directly to the client as SSE
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  // Collect full answer in background to persist after stream completes
  let fullAnswer = ''

  const pump = async () => {
    const reader = llmRes.body!.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Forward raw SSE chunk to client
        await writer.write(encoder.encode(chunk))

        // Accumulate answer text from OpenRouter SSE format
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try {
            const delta = JSON.parse(line.slice(6))
            const text: string = delta?.choices?.[0]?.delta?.content ?? ''
            fullAnswer += text
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } finally {
      await writer.close()
      // Persist completed answer + citations
      c.env.DB.prepare('UPDATE inquiries SET answer = ?, citations = ? WHERE id = ?')
        .bind(fullAnswer, JSON.stringify(chunkIds), inquiryId)
        .run()
        .catch(() => {})
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
  const userId = c.get('userId')
  const rows = await c.env.DB.prepare(
    'SELECT id, question, answer, model_used, created_at FROM inquiries WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
  )
    .bind(userId)
    .all<{ id: string; question: string; answer: string; model_used: string; created_at: number }>()

  return c.json({ inquiries: rows.results })
})

/** Get a single inquiry with its full answer and citations */
inquiryRoutes.get('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const row = await c.env.DB.prepare(
    'SELECT id, question, answer, citations, model_used, confidence, created_at FROM inquiries WHERE id = ? AND user_id = ?',
  )
    .bind(id, userId)
    .first<{
      id: string
      question: string
      answer: string
      citations: string
      model_used: string
      confidence: number | null
      created_at: number
    }>()

  if (!row) {
    return c.json({ error: 'Inquiry not found' }, 404)
  }

  return c.json({
    ...row,
    citations: row.citations ? JSON.parse(row.citations) : [],
  })
})
