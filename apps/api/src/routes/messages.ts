import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import {
  isAllowedExtension,
  isWithinSizeLimit,
  MAX_FILE_SIZE_BYTES,
  LEGAL_DISCLAIMER,
} from '@patrasaar/shared'
import type { Env } from '../env'
<<<<<<< master
import { optionalAuth } from '../auth/middleware'
=======
import { requireAuth } from '../auth/middleware'
>>>>>>> master
import {
  extractDualCitations,
  verifyDualCitations,
} from '../lib/citation-extractor'
import {
  assembleDualContext,
  buildDualSystemPrompt,
  type KbContextChunk,
  type UserContextChunk,
} from '../lib/dual-rag'
import { processDocument } from '../lib/process-document'

type AuthVariables = {
  user: { id: string; email: string; name: string }
}

const messages = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

messages.use('*', optionalAuth)

// Send a message in a chat (with optional file upload)
// Returns SSE stream — progress events during doc processing, then AI response tokens
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

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData()
    userText = (formData.get('content') as string) || ''
    file = formData.get('file') as File | null
  } else {
    const body = await c.req.json()
    userText = body.content || ''
  }

  if (!userText && !file) {
    return c.json(
      { error: { message: 'Provide text or a file', code: 'INVALID_INPUT' } },
      400,
    )
  }

  if (file) {
    if (!isAllowedExtension(file.name)) {
      return c.json(
        { error: { message: 'File type not supported. Use PDF, TXT, DOC, or DOCX.', code: 'INVALID_FILE_TYPE' } },
        400,
      )
    }
    if (!isWithinSizeLimit(file.size)) {
      return c.json(
        { error: { message: `File too large. Maximum is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`, code: 'FILE_TOO_LARGE' } },
        400,
      )
    }
    if (!c.env.STORAGE) {
      return c.json(
        { error: { message: 'File uploads unavailable. Ask your question as text.', code: 'STORAGE_UNAVAILABLE' } },
        503,
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

  // Update chat timestamp
  await c.env.DB.prepare(
    "UPDATE chats SET updated_at = datetime('now') WHERE id = ?",
  )
    .bind(chatId)
    .run()

  // File upload path — inline processing via SSE stream
  if (file) {
    const documentId = nanoid()
    const jobId = nanoid()
    const r2Key = `${user.id}/${chatId}/${documentId}/${file.name}`
    const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown'

    // Upload to R2 before opening stream
    const fileBuffer = await file.arrayBuffer()
    await c.env.STORAGE!.put(r2Key, fileBuffer, {
      customMetadata: { userId: user.id, chatId, documentId, originalName: file.name },
    })

    // Create document + job records
    await c.env.DB.prepare(
      `INSERT INTO documents (id, chat_id, message_id, user_id, original_filename, file_type, file_size, r2_key, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
      .bind(documentId, chatId, userMessageId, user.id, file.name, ext, file.size, r2Key)
      .run()

    await c.env.DB.prepare(
      'INSERT INTO processing_jobs (id, document_id) VALUES (?, ?)',
    )
      .bind(jobId, documentId)
      .run()

    const env = c.env
    const capturedUserText = userText
    const capturedUserId = user.id

    // Stream: progress events → optional RAG response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

        send({ type: 'progress', stage: 'uploading', progress: 10, documentId, jobId })

        // Process document inline
        await processDocument(
          { documentId, jobId, chatId, userId: capturedUserId, r2Key, filename: file.name, fileType: ext },
          env,
        )

<<<<<<< master
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
  // Update chat timestamp
  await c.env.DB.prepare(
    "UPDATE chats SET updated_at = datetime('now') WHERE id = ?",
  )
    .bind(chatId)
    .run()

  // File upload path — inline processing via SSE stream
  if (file) {
    const documentId = nanoid()
    const jobId = nanoid()
    const r2Key = `${user.id}/${chatId}/${documentId}/${file.name}`
    const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown'

    // Upload to R2 before opening stream
    const fileBuffer = await file.arrayBuffer()
    await c.env.STORAGE!.put(r2Key, fileBuffer, {
      customMetadata: { userId: user.id, chatId, documentId, originalName: file.name },
    })

    // Create document + job records
    await c.env.DB.prepare(
      `INSERT INTO documents (id, chat_id, message_id, user_id, original_filename, file_type, file_size, r2_key, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
      .bind(documentId, chatId, userMessageId, user.id, file.name, ext, file.size, r2Key)
      .run()

    await c.env.DB.prepare(
      'INSERT INTO processing_jobs (id, document_id) VALUES (?, ?)',
    )
      .bind(jobId, documentId)
      .run()

    const env = c.env
    const capturedUserText = userText
    const capturedUserId = user.id

    // Stream: progress events → optional RAG response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

        send({ type: 'progress', stage: 'uploading', progress: 10, documentId, jobId })

        // Process document inline
        await processDocument(
          { documentId, jobId, chatId, userId: capturedUserId, r2Key, filename: file.name, fileType: ext },
          env,
        )

        send({ type: 'progress', stage: 'ready', progress: 100, documentId })

        // If user included a query, run RAG immediately after processing
        if (capturedUserText) {
          await streamRagIntoController(controller, encoder, env, chatId, capturedUserId, capturedUserText, userMessageId)
        } else {
          send({ type: 'done', documentId })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
=======
        send({ type: 'progress', stage: 'ready', progress: 100, documentId })

        // If user included a query, run RAG immediately after processing
        if (capturedUserText) {
          await streamRagIntoController(controller, encoder, env, chatId, capturedUserId, capturedUserText, userMessageId)
        } else {
          send({ type: 'done', documentId })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
>>>>>>> master
  }

  // Text-only path — straight to dual-RAG
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

// ---------------------------------------------------------------------------
// Dual-RAG helpers
// ---------------------------------------------------------------------------

async function fetchKbChunks(
  env: Env,
  vectorIds: string[],
): Promise<KbContextChunk[]> {
  if (vectorIds.length === 0) return []
  const placeholders = vectorIds.map(() => '?').join(',')
  const rows = await env.DB.prepare(
    `SELECT kc.id, kc.content, kc.section_ref, ks.title, ks.jurisdiction
     FROM kb_chunks kc
     JOIN kb_sources ks ON kc.source_id = ks.id
     WHERE kc.id IN (${placeholders})`,
  )
    .bind(...vectorIds)
    .all()

  return rows.results.map((row) => ({
    id: row.id as string,
    content: row.content as string,
    sectionRef: (row.section_ref as string | null) ?? null,
    sourceTitle: row.title as string,
    jurisdiction: row.jurisdiction as string,
  }))
}

async function fetchUserDocChunks(
  env: Env,
  vectorIds: string[],
): Promise<UserContextChunk[]> {
  if (vectorIds.length === 0) return []
  const placeholders = vectorIds.map(() => '?').join(',')
  const rows = await env.DB.prepare(
    `SELECT id, content, metadata FROM document_chunks WHERE id IN (${placeholders})`,
  )
    .bind(...vectorIds)
    .all()

  return rows.results.map((row) => {
    const meta = row.metadata ? JSON.parse(row.metadata as string) : {}
    return {
      id: row.id as string,
      content: row.content as string,
      sectionRef: (meta.section as string | null) ?? null,
      documentId: (meta.document_id as string | null) ?? '',
    }
  })
}

// ---------------------------------------------------------------------------
// Core RAG streaming — writes into an existing ReadableStream controller
// ---------------------------------------------------------------------------

async function streamRagIntoController(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  env: Env,
  chatId: string,
  userId: string,
  query: string,
  userMessageId: string,
): Promise<void> {
  const send = (obj: unknown) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
<<<<<<< master

  // Get chat's category
  const chatRow = await env.DB.prepare(
    'SELECT category_id, jurisdiction FROM chats WHERE id = ?',
  )
    .bind(chatId)
    .first() as { category_id: string | null; jurisdiction: string | null } | null

  const categoryId = chatRow?.category_id ?? null
  const jurisdiction = chatRow?.jurisdiction ?? null

  let categoryName = 'General Legal'
  if (categoryId) {
    const cat = await env.DB.prepare('SELECT name FROM kb_categories WHERE id = ?')
      .bind(categoryId)
      .first() as { name: string } | null
    if (cat) categoryName = cat.name
  }

=======

  // Get chat's category
  const chatRow = await env.DB.prepare(
    'SELECT category_id, jurisdiction FROM chats WHERE id = ?',
  )
    .bind(chatId)
    .first() as { category_id: string | null; jurisdiction: string | null } | null

  const categoryId = chatRow?.category_id ?? null
  const jurisdiction = chatRow?.jurisdiction ?? null

  let categoryName = 'General Legal'
  if (categoryId) {
    const cat = await env.DB.prepare('SELECT name FROM kb_categories WHERE id = ?')
      .bind(categoryId)
      .first() as { name: string } | null
    if (cat) categoryName = cat.name
  }

>>>>>>> master
  // Embed query
  let queryEmbedding: number[]
  try {
    const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] })
    if (!('data' in embeddingResult) || !embeddingResult.data) {
      throw new Error('Unexpected async response from embedding model')
    }
    queryEmbedding = embeddingResult.data[0]
  } catch (err) {
    const assistantId = nanoid()
    const fallback = `Unable to process query. Workers AI unavailable. ${LEGAL_DISCLAIMER}`
    await env.DB.prepare('INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)')
      .bind(assistantId, chatId, 'assistant', fallback)
      .run()
    send({ type: 'error', message: 'Workers AI unavailable' })
    controller.close()
    return
  }

  // Parallel dual Vectorize search
  let kbChunks: KbContextChunk[] = []
  let userDocChunks: UserContextChunk[] = []
  try {
    const [kbResults, userResults] = await Promise.all([
      categoryId
        ? env.VECTORIZE.query(queryEmbedding, {
<<<<<<< master
          topK: 8,
          filter: { type: 'kb', category_id: categoryId },
          returnMetadata: 'all',
        })
=======
            topK: 8,
            filter: { type: 'kb', category_id: categoryId },
            returnMetadata: 'all',
          })
>>>>>>> master
        : Promise.resolve({ matches: [] }),
      env.VECTORIZE.query(queryEmbedding, {
        topK: 5,
        filter: { type: 'user', chat_id: chatId, user_id: userId },
        returnMetadata: 'all',
      }),
    ])
    const [kbFetched, userFetched] = await Promise.all([
      fetchKbChunks(env, (kbResults.matches ?? []).map((m) => m.id)),
      fetchUserDocChunks(env, (userResults.matches ?? []).map((m) => m.id)),
    ])
    kbChunks = kbFetched
    userDocChunks = userFetched
  } catch {
    // proceed without context
  }

  // Chat history
  const historyRows = await env.DB.prepare(
    'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 10',
  )
    .bind(chatId)
    .all()
  const chatHistory = historyRows.results.reverse().map((r) => ({
    role: r.role as string,
    content: r.content as string,
  }))

  // Build prompt
  const contextText = assembleDualContext(kbChunks, userDocChunks)
  const systemPrompt = buildDualSystemPrompt(categoryName, jurisdiction, userDocChunks.length > 0)
  const llmMessages = [
    { role: 'system', content: `${systemPrompt}\n\n${contextText}` },
    ...chatHistory.slice(-8),
    { role: 'user', content: query },
  ]

  // Stream from Groq
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

    if (!groqResponse.ok) throw new Error(`Groq API error: ${groqResponse.status}`)

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
            send({ type: 'token', content: delta })
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    send({ type: 'error', message: errorMsg })
    fullContent = `Sorry, unable to process query. Error: ${errorMsg}\n\n${LEGAL_DISCLAIMER}`
  }

  // Extract dual citations + save message
  const extracted = extractDualCitations(fullContent)
  const verifiedCitations = verifyDualCitations(extracted, kbChunks, userDocChunks)
  const citationsJson = verifiedCitations.length > 0 ? JSON.stringify(verifiedCitations) : null

  const assistantId = nanoid()
  await env.DB.prepare(
    'INSERT INTO messages (id, chat_id, role, content, citations) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(assistantId, chatId, 'assistant', fullContent, citationsJson)
    .run()

  send({ type: 'done', messageId: assistantId, citations: verifiedCitations })
  controller.close()
}

// Outer wrapper — creates a new SSE stream for text-only requests
async function streamRagResponse(
  c: any,
  chatId: string,
  userId: string,
  query: string,
  userMessageId: string,
) {
  const env: Env = c.env
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      await streamRagIntoController(controller, encoder, env, chatId, userId, query, userMessageId)
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
