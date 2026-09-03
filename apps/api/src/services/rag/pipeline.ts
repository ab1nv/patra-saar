import type { Env } from '../../types/bindings'
import { chunkDocument } from './chunker'
import { embedTexts } from './embedder'
import { retrieveChunks } from './retriever'

/**
 * Orchestrates the full RAG pipeline for both ingestion and retrieval.
 * Keeps route handlers thin — they call pipeline functions, not individual services.
 */

/** Ingest a document: chunk it, embed it, store vectors + text. */
export async function ingestDocument(
  documentId: string,
  userId: string,
  text: string,
  env: Env,
): Promise<{ chunkCount: number }> {
  const chunks = chunkDocument(text, documentId)

  // Embed all chunks in one batch call
  const embeddings = await embedTexts(
    chunks.map((c) => c.text),
    env,
  )

  // Insert vectors into the user-docs namespace
  await env.CHUNKS_INDEX.insert(
    chunks.map((chunk, i) => ({
      id: `${documentId}:${chunk.chunkIndex}`,
      values: embeddings[i],
      metadata: {
        documentId,
        userId,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
      },
    })),
  )

  // Store chunk text in D1 for retrieval (Vectorize only stores vectors, not text)
  const stmt = env.DB.prepare(
    'INSERT INTO chunks (id, document_id, chunk_index, page_number, text, token_count, vector_id, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )

  await env.DB.batch(
    chunks.map((chunk, i) => {
      const id = crypto.randomUUID().replace(/-/g, '')
      return stmt.bind(
        id,
        documentId,
        chunk.chunkIndex,
        chunk.pageNumber,
        chunk.text,
        chunk.tokenCount,
        `${documentId}:${chunk.chunkIndex}`,
        'user-doc',
      )
    }),
  )

  return { chunkCount: chunks.length }
}

/** Build the context window for an LLM query from retrieved chunks. */
export async function buildContext(
  documentIds: string[],
  question: string,
  userId: string,
  env: Env,
): Promise<{ context: string; chunkIds: string[] }> {
  const retrieved = await retrieveChunks(documentIds, question, userId, env)

  const chunkIds = retrieved.map((r) => r.id)

  if (retrieved.length === 0) {
    return { context: '', chunkIds: [] }
  }

  // Fetch full text for all retrieved chunks from D1 in a single query
  const placeholders = retrieved.map(() => '?').join(', ')
  const rows = await env.DB.prepare(
    `SELECT vector_id, text, document_id FROM chunks WHERE vector_id IN (${placeholders})`,
  )
    .bind(...chunkIds)
    .all<{ vector_id: string; text: string; document_id: string }>()

  const textByVectorId = new Map(rows.results.map((r) => [r.vector_id, r]))

  // Build context window with source attribution and full chunk text
  const contextParts: string[] = []

  for (const chunk of retrieved) {
    const row = textByVectorId.get(chunk.id)
    if (!row) continue

    const label = chunk.source === 'legal-corpus' ? 'LEGAL REFERENCE' : 'DOCUMENT CONTEXT'
    const source =
      chunk.source === 'legal-corpus'
        ? ((chunk.metadata.file_name as string) ?? 'legal corpus')
        : row.document_id

    contextParts.push(
      `[${label}: ${source}] (relevance: ${chunk.score.toFixed(2)})\n${row.text}`,
    )
  }

  return {
    context: contextParts.join('\n\n---\n\n'),
    chunkIds,
  }
}
