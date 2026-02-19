import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import type { Env } from './env'
import { createAuth } from './auth/auth'
import { chats } from './routes/chats'
import { messages } from './routes/messages'
import { chunkText } from './lib/chunking'

const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use('*', secureHeaders())
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow localhost in dev, production domain otherwise
      if (!origin) return '*'
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin
      if (origin.includes('patrasaar')) return origin
      return ''
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// BetterAuth handler -- handles all /api/auth/* routes
app.all('/api/auth/*', async (c) => {
  const auth = createAuth(c.env, c.req.header('origin'))
  return auth.handler(c.req.raw)
})

// App routes
app.route('/api/chats', chats)
app.route('/api/chats', messages) // messages are nested under /api/chats/:chatId/messages

// 404 fallback
app.notFound((c) => {
  return c.json({ error: { message: 'Not found', code: 'NOT_FOUND' } }, 404)
})

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err.message)
  return c.json(
    { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
    500,
  )
})

// Queue consumer for document processing
export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await processDocument(msg.body as any, env)
        msg.ack()
      } catch (err) {
        console.error('Queue processing error:', err)
        msg.retry()
      }
    }
  },
}

// Document processing consumer
async function processDocument(
  payload: {
    documentId: string
    jobId: string
    chatId: string
    userId: string
    r2Key?: string
    sourceUrl?: string
    filename: string
    fileType: string
  },
  env: Env,
) {
  const { documentId, jobId, chatId, userId, r2Key, sourceUrl, fileType } = payload

  async function updateJob(status: string, progress: number, errorMessage?: string) {
    await env.DB.prepare(
      "UPDATE processing_jobs SET status = ?, progress = ?, error_message = ?, updated_at = datetime('now') WHERE id = ?",
    )
      .bind(status, progress, errorMessage || null, jobId)
      .run()
  }

  async function updateDocStatus(status: string, errorMessage?: string) {
    await env.DB.prepare(
      'UPDATE documents SET status = ?, error_message = ? WHERE id = ?',
    )
      .bind(status, errorMessage || null, documentId)
      .run()
  }

  try {
    // Stage 1: Parse the document
    await updateJob('parsing', 10)
    await updateDocStatus('processing')

    let rawText = ''

    if (r2Key) {
      if (!env.STORAGE) throw new Error('R2 storage is not configured')
      const object = await env.STORAGE.get(r2Key)
      if (!object) throw new Error('File not found in R2')

      const buffer = await object.arrayBuffer()

      if (fileType === 'txt') {
        rawText = new TextDecoder().decode(buffer)
      } else if (fileType === 'pdf' || fileType === 'doc' || fileType === 'docx') {
        // For MVP we extract text using Workers AI vision model
        // In production, you would use pdf-parse or mammoth.js
        // Since those need Node.js APIs, we use AI as a universal extractor
        try {
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
          const result = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all text from this document image. Preserve the structure, sections, and numbering. Return only the extracted text, nothing else.',
                  },
                  {
                    type: 'image_url',
                    image_url: { url: `data:application/octet-stream;base64,${base64}` },
                  },
                ],
              },
            ],
          })
          rawText = (result as any).response || ''
        } catch (aiErr) {
          // Fallback: try treating it as plain text
          rawText = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
        }
      }
    } else if (sourceUrl) {
      // Fetch URL content
      const response = await fetch(sourceUrl)
      if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`)
      const html = await response.text()
      // Very basic HTML to text (strip tags)
      rawText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    }

    if (!rawText || rawText.trim().length < 10) {
      throw new Error('Could not extract meaningful text from the document')
    }

    await updateJob('parsing', 30)

    // Save raw text
    await env.DB.prepare('UPDATE documents SET raw_text = ? WHERE id = ?')
      .bind(rawText, documentId)
      .run()

    // Stage 2: Chunk the text
    await updateJob('chunking', 40)

    const chunks = chunkText(rawText)
    await updateJob('chunking', 60)

    // Save chunks to D1
    for (const chunk of chunks) {
      await env.DB.prepare(
        'INSERT INTO document_chunks (id, document_id, chunk_index, content, metadata) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(chunk.id, documentId, chunk.index, chunk.content, JSON.stringify(chunk.metadata))
        .run()
    }

    await env.DB.prepare('UPDATE documents SET chunk_count = ? WHERE id = ?')
      .bind(chunks.length, documentId)
      .run()

    // Stage 3: Generate embeddings
    await updateJob('embedding', 70)

    // Batch embed (Workers AI supports batch)
    const texts = chunks.map((c) => c.content)
    const batchSize = 50

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchChunks = chunks.slice(i, i + batchSize)

      const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: batch,
      })

      // Store in Vectorize
      const vectors = batchChunks.map((chunk, j) => ({
        id: chunk.id,
        values: (embeddingResult as any).data[j],
        metadata: {
          document_id: documentId,
          chat_id: chatId,
          user_id: userId,
          chunk_index: chunk.index,
          section: chunk.metadata.section || '',
          page: chunk.metadata.page || 0,
        },
      }))

      await env.VECTORIZE.upsert(vectors)
    }

    await updateJob('embedding', 90)

    // Done
    await updateJob('ready', 100)
    await env.DB.prepare(
      "UPDATE documents SET status = 'ready', processed_at = datetime('now') WHERE id = ?",
    )
      .bind(documentId)
      .run()
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown processing error'
    console.error(`Document processing failed for ${documentId}:`, errMsg)
    await updateJob('failed', 0, errMsg)
    await updateDocStatus('failed', errMsg)
  }
}

