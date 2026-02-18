import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import {
  isAllowedExtension,
  isWithinSizeLimit,
  MAX_FILE_SIZE_BYTES,
  LEGAL_DISCLAIMER,
} from '@patrasaar/shared'
import type { Env } from '../env'
import { requireAuth } from '../auth/middleware'

type AuthVariables = {
  user: { id: string; email: string; name: string }
}

const messages = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

messages.use('*', requireAuth)

// Send a message in a chat (with optional file upload)
// Returns SSE stream for the AI response
messages.post('/:chatId/messages', async (c) => {
  const user = c.get('user')
  const chatId = c.req.param('chatId')

  // Verify chat ownership
  const chat = await c.env.DB.prepare(
    'SELECT id FROM chats WHERE id = ? AND user_id = ?',
  )
    .bind(chatId, user.id)
    .first()

  if (!chat) {
    return c.json({ error: { message: 'Chat not found', code: 'NOT_FOUND' } }, 404)
  }

  const contentType = c.req.header('content-type') || ''
  let userText = ''
  let file: File | null = null
  let sourceUrl: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData()
    userText = (formData.get('content') as string) || ''
    file = formData.get('file') as File | null
    sourceUrl = (formData.get('url') as string) || null
  } else {
    const body = await c.req.json()
    userText = body.content || ''
    sourceUrl = body.url || null
  }

  // Must have at least text, file, or URL
  if (!userText && !file && !sourceUrl) {
    return c.json(
      { error: { message: 'Provide text, a file, or a URL', code: 'INVALID_INPUT' } },
      400,
    )
  }

  // Validate file if present
  let documentId: string | null = null
  let jobId: string | null = null

  if (file) {
    if (!isAllowedExtension(file.name)) {
      return c.json(
        { error: { message: 'File type not supported. Use PDF, TXT, DOC, or DOCX.', code: 'INVALID_FILE_TYPE' } },
        400,
      )
    }
    if (!isWithinSizeLimit(file.size)) {
      return c.json(
        { error: { message: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`, code: 'FILE_TOO_LARGE' } },
        400,
      )
    }
  }

  // Save user message
  const userMessageId = nanoid()
  const displayContent = file
    ? `${userText ? userText + '\n' : ''}[Uploaded: ${file.name}]`
    : userText

  await c.env.DB.prepare(
    'INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)',
  )
    .bind(userMessageId, chatId, 'user', displayContent)
    .run()

  // Handle file upload
  if (file) {
    documentId = nanoid()
    jobId = nanoid()
    const r2Key = `${user.id}/${chatId}/${documentId}/${file.name}`
    const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown'

    // Require R2 for file uploads
    if (!c.env.STORAGE) {
      return c.json(
        { error: { message: 'File uploads are not available yet. Please ask your question as text.', code: 'STORAGE_UNAVAILABLE' } },
        503,
      )
    }

    // Upload to R2
    const fileBuffer = await file.arrayBuffer()
    await c.env.STORAGE.put(r2Key, fileBuffer, {
      customMetadata: { userId: user.id, chatId, documentId, originalName: file.name },
    })

    // Create document record
    await c.env.DB.prepare(
      `INSERT INTO documents (id, chat_id, message_id, user_id, original_filename, file_type, file_size, r2_key, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
      .bind(documentId, chatId, userMessageId, user.id, file.name, ext, file.size, r2Key)
      .run()

    // Create processing job
    await c.env.DB.prepare(
      'INSERT INTO processing_jobs (id, document_id) VALUES (?, ?)',
    )
      .bind(jobId, documentId)
      .run()

    // Enqueue processing (if queue is available)
    if (c.env.PROCESSING_QUEUE) {
      await c.env.PROCESSING_QUEUE.send({
        documentId,
        jobId,
        chatId,
        userId: user.id,
        r2Key,
        filename: file.name,
        fileType: ext,
      })
    }
  }

  // Handle URL upload (similar to file but fetch the content)
  if (sourceUrl && !file) {
    documentId = nanoid()
    jobId = nanoid()

    await c.env.DB.prepare(
      `INSERT INTO documents (id, chat_id, message_id, user_id, original_filename, file_type, source_url, status)
       VALUES (?, ?, ?, ?, ?, 'url', ?, 'pending')`,
    )
      .bind(documentId, chatId, userMessageId, user.id, sourceUrl, sourceUrl)
      .run()

    await c.env.DB.prepare(
      'INSERT INTO processing_jobs (id, document_id) VALUES (?, ?)',
    )
      .bind(jobId, documentId)
      .run()

    if (c.env.PROCESSING_QUEUE) {
      await c.env.PROCESSING_QUEUE.send({
        documentId,
        jobId,
        chatId,
        userId: user.id,
        sourceUrl,
        filename: sourceUrl,
        fileType: 'url',
      })
    }
  }

  // Update chat timestamp
  await c.env.DB.prepare(
    "UPDATE chats SET updated_at = datetime('now') WHERE id = ?",
  )
    .bind(chatId)
    .run()

  // If there is a document being processed, return early with the job info.
  // The frontend will poll for status and then re-query once ready.
  if (documentId && jobId) {
    // If user also provided text, we will answer after processing.
    // For now, just acknowledge the upload.
    return c.json({
      data: {
        userMessageId,
        documentId,
        jobId,
        hasQuery: !!userText,
        status: 'Document queued for processing',
      },
    }, 202)
  }

  // No file/URL, just a text query. Run RAG and stream the response.
  return streamRagResponse(c, chatId, user.id, userText, userMessageId)
})

// Get a job's processing status
messages.get('/jobs/:jobId/status', async (c) => {
  const user = c.get('user')
  const jobId = c.req.param('jobId')

  const job = await c.env.DB.prepare(
    `SELECT pj.* FROM processing_jobs pj
     JOIN documents d ON pj.document_id = d.id
     WHERE pj.id = ? AND d.user_id = ?`,
  )
    .bind(jobId, user.id)
    .first()

  if (!job) {
    return c.json({ error: { message: 'Job not found', code: 'NOT_FOUND' } }, 404)
  }

  return c.json({ data: job })
})

// Helper: Stream a RAG response via SSE
async function streamRagResponse(
  c: any,
  chatId: string,
  userId: string,
  query: string,
  userMessageId: string,
) {
  const env: Env = c.env

  // 1. Embed the query
  let queryEmbedding: number[]
  try {
    const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [query],
    })
    if (!('data' in embeddingResult) || !embeddingResult.data) {
      throw new Error('Unexpected async response from embedding model')
    }
    queryEmbedding = embeddingResult.data[0]
  } catch (err) {
    // If Workers AI is not available (e.g. local dev), return a simple response
    const assistantId = nanoid()
    const fallback = `I am unable to process your query right now. Workers AI is not available in this environment. ${LEGAL_DISCLAIMER}`
    await env.DB.prepare(
      'INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)',
    )
      .bind(assistantId, chatId, 'assistant', fallback)
      .run()
    return c.json({ data: { messageId: assistantId, content: fallback } })
  }

  // 2. Search Vectorize for relevant chunks
  let contextChunks: Array<{ content: string; section?: string; page?: number }> = []
  try {
    const searchResults = await env.VECTORIZE.query(queryEmbedding, {
      topK: 10,
      filter: { chat_id: chatId, user_id: userId },
      returnMetadata: 'all',
    })

    if (searchResults.matches && searchResults.matches.length > 0) {
      // Fetch chunk content from D1
      const ids = searchResults.matches.map((m) => m.id)
      const placeholders = ids.map(() => '?').join(',')
      const chunkRows = await env.DB.prepare(
        `SELECT id, content, metadata FROM document_chunks WHERE id IN (${placeholders})`,
      )
        .bind(...ids)
        .all()

      contextChunks = chunkRows.results.map((row) => {
        const meta = row.metadata ? JSON.parse(row.metadata as string) : {}
        return {
          content: row.content as string,
          section: meta.section,
          page: meta.page,
        }
      })
    }
  } catch (err) {
    // Vectorize not available or no results, proceed without context
  }

  // 3. Get recent chat history
  const historyRows = await env.DB.prepare(
    'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 10',
  )
    .bind(chatId)
    .all()

  const chatHistory = historyRows.results.reverse().map((r) => ({
    role: r.role as string,
    content: r.content as string,
  }))

  // 4. Build the prompt
  const contextText = contextChunks.length > 0
    ? contextChunks
        .map((c, i) => `[${i + 1}] ${c.section ? `Section ${c.section}` : ''}${c.page ? ` (Page ${c.page})` : ''}: ${c.content}`)
        .join('\n\n')
    : 'No document context available. Answer based on general legal knowledge if possible.'

  const systemPrompt = `You are PatraSaar, an AI assistant specialized in simplifying Indian legal documents.
Your role is to help users understand legal text. You do NOT provide legal advice.

Rules:
1. Explain legal terms in simple, everyday language.
2. Every claim must cite the specific section, clause, or page from the provided context using [N] notation.
3. If uncertain, say "I'm not certain about this based on the document."
4. Always end with: "${LEGAL_DISCLAIMER}"
5. Highlight risks and obligations clearly.
6. Format responses with clear headings and bullet points.

Retrieved Context:
${contextText}`

  const llmMessages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-8), // keep last 8 for context window
    { role: 'user', content: query },
  ]

  // 5. Stream from Groq
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let fullContent = ''

      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: llmMessages,
            stream: true,
            temperature: 0.3,
            max_tokens: 2048,
          }),
        })

        if (!groqResponse.ok) {
          throw new Error(`Groq API error: ${groqResponse.status}`)
        }

        const reader = groqResponse.body?.getReader()
        if (!reader) throw new Error('No response body from Groq')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'token', content: delta })}\n\n`),
                )
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`),
        )
        fullContent = `Sorry, I was unable to process your query. Error: ${errorMsg}\n\n${LEGAL_DISCLAIMER}`
      }

      // Save assistant message to D1
      const assistantId = nanoid()
      await env.DB.prepare(
        'INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)',
      )
        .bind(assistantId, chatId, 'assistant', fullContent)
        .run()

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'done', messageId: assistantId })}\n\n`,
        ),
      )
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export { messages }
