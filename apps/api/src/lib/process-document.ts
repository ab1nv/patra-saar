/**
 * process-document.ts
 *
 * Extracted, testable document processing pipeline.
 * Previously inline inside index.ts, now a pure function that accepts
 * all dependencies (env bindings) as parameters for easy testing.
 *
 * Stages:
 *   1. Parse   – extract raw text from PDF/DOCX/TXT via document-parser
 *   2. Chunk   – split into overlapping sections via chunking
 *   3. Embed   – generate vector embeddings via Workers AI
 *   4. Store   – persist chunks + vectors to D1 + Vectorize
 */

import { extractText, DocumentParseError } from './document-parser'
import { chunkText } from './chunking'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessDocumentPayload {
  documentId: string
  jobId: string
  chatId: string
  userId: string
  r2Key?: string
  sourceUrl?: string
  filename: string
  fileType: string
}

/** Minimal bindings interface — mirrors the Env type from env.ts */
interface ProcessingEnv {
  DB: {
    prepare: (sql: string) => {
      bind: (...args: unknown[]) => { run: () => Promise<unknown> }
    }
  }
  STORAGE?: {
    get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AI: { run: (...args: any[]) => Promise<any> }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  VECTORIZE: { upsert: (vectors: any[]) => Promise<any> }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function updateJob(
  env: ProcessingEnv,
  jobId: string,
  status: string,
  progress: number,
  errorMessage?: string,
): Promise<void> {
  await env.DB.prepare(
    "UPDATE processing_jobs SET status = ?, progress = ?, error_message = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(status, progress, errorMessage ?? null, jobId)
    .run()
}

async function updateDocStatus(
  env: ProcessingEnv,
  documentId: string,
  status: string,
  errorMessage?: string,
): Promise<void> {
  await env.DB.prepare('UPDATE documents SET status = ?, error_message = ? WHERE id = ?')
    .bind(status, errorMessage ?? null, documentId)
    .run()
}

/** Retrieve buffer from R2 storage. */
async function fetchFromR2(env: ProcessingEnv, r2Key: string): Promise<ArrayBuffer> {
  if (!env.STORAGE) {
    throw new Error('R2 storage binding (STORAGE) is not configured')
  }
  const object = await env.STORAGE.get(r2Key)
  if (!object) {
    throw new Error(`File not found in R2: ${r2Key}`)
  }
  return object.arrayBuffer()
}

/** Retrieve buffer from a remote URL, stripping HTML tags for web pages. */
async function fetchFromUrl(url: string, fileType: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch URL (HTTP ${response.status}): ${url}`)
  }

  // For HTML pages, strip tags and return as UTF-8 bytes
  if (fileType === 'html' || response.headers.get('content-type')?.includes('text/html')) {
    const html = await response.text()
    const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    return new TextEncoder().encode(plainText).buffer as ArrayBuffer
  }

  return response.arrayBuffer()
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Process a document end-to-end:
 * download → parse → chunk → embed → store.
 *
 * This function NEVER throws — all errors are caught, logged, and
 * reflected in the job/document status rows so the queue consumer
 * can ack the message.
 */
export async function processDocument(
  payload: ProcessDocumentPayload,
  env: ProcessingEnv,
): Promise<void> {
  const { documentId, jobId, chatId, userId, r2Key, sourceUrl, fileType } = payload

  // Wrap all DB calls in a try so even status updates can't crash the worker
  const safeUpdateJob = async (status: string, progress: number, errMsg?: string) => {
    try {
      await updateJob(env, jobId, status, progress, errMsg)
    } catch (dbErr) {
      console.error('Failed to update job status:', dbErr)
    }
  }

  const safeUpdateDoc = async (status: string, errMsg?: string) => {
    try {
      await updateDocStatus(env, documentId, status, errMsg)
    } catch (dbErr) {
      console.error('Failed to update document status:', dbErr)
    }
  }

  try {
    // ── Stage 1: Parse ────────────────────────────────────────────────────────
    await safeUpdateJob('parsing', 10)
    await safeUpdateDoc('processing')

    let buffer: ArrayBuffer

    if (r2Key) {
      buffer = await fetchFromR2(env, r2Key)
    } else if (sourceUrl) {
      buffer = await fetchFromUrl(sourceUrl, fileType)
    } else {
      throw new Error('Neither r2Key nor sourceUrl was provided in the payload')
    }

    const parseResult = await extractText(buffer, fileType)

    if (parseResult.warnings.length > 0) {
      console.warn(`[${documentId}] Parser warnings:`, parseResult.warnings)
    }

    const rawText = parseResult.text

    if (!rawText || rawText.trim().length < 10) {
      throw new DocumentParseError(
        'Could not extract meaningful text from the document (less than 10 characters)',
      )
    }

    await safeUpdateJob('parsing', 30)

    // Persist raw text
    await env.DB.prepare('UPDATE documents SET raw_text = ? WHERE id = ?')
      .bind(rawText, documentId)
      .run()

    // ── Stage 2: Chunk ────────────────────────────────────────────────────────
    await safeUpdateJob('chunking', 40)

    const chunks = chunkText(rawText)
    await safeUpdateJob('chunking', 60)

    // Insert chunks into D1
    for (const chunk of chunks) {
      await env.DB.prepare(
        'INSERT INTO document_chunks (id, document_id, chunk_index, content, metadata) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(chunk.id, documentId, chunk.index, chunk.content, JSON.stringify(chunk.metadata))
        .run()
    }

    // Update chunk count on the document row
    await env.DB.prepare('UPDATE documents SET chunk_count = ? WHERE id = ?')
      .bind(chunks.length, documentId)
      .run()

    // ── Stage 3: Embed ────────────────────────────────────────────────────────
    await safeUpdateJob('embedding', 70)

    const texts = chunks.map((c) => c.content)
    const BATCH_SIZE = 50

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batchTexts = texts.slice(i, i + BATCH_SIZE)
      const batchChunks = chunks.slice(i, i + BATCH_SIZE)

      const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: batchTexts })

      const vectors = batchChunks.map((chunk, j) => ({
        id: chunk.id,
        values: (embeddingResult as any).data[j],
        metadata: {
          type: 'user',
          document_id: documentId,
          chat_id: chatId,
          user_id: userId,
          chunk_index: chunk.index,
          section: chunk.metadata.section ?? '',
          page: chunk.metadata.page ?? 0,
        },
      }))

      await env.VECTORIZE.upsert(vectors)
    }

    await safeUpdateJob('embedding', 90)

    // ── Done ──────────────────────────────────────────────────────────────────
    await safeUpdateJob('ready', 100)
    await env.DB.prepare(
      "UPDATE documents SET status = 'ready', processed_at = datetime('now') WHERE id = ?",
    )
      .bind(documentId)
      .run()
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown processing error'
    console.error(`[${documentId}] Document processing failed:`, errMsg)
    await safeUpdateJob('failed', 0, errMsg)
    await safeUpdateDoc('failed', errMsg)
  }
}
