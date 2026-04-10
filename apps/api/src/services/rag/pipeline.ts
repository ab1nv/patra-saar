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
  await env.VECTORIZE.insert(
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

  // Fetch full text for each retrieved chunk from D1
  const chunkIds = retrieved.map((r) => r.id)

  // Build context window with source attribution
  const contextParts: string[] = []

  for (const chunk of retrieved) {
    // The actual chunk text fetch from D1 will be implemented here
    const label = chunk.source === 'legal-corpus' ? 'LEGAL REFERENCE' : 'DOCUMENT CONTEXT'
    contextParts.push(`[${label}] (score: ${chunk.score.toFixed(2)})`)
  }

  return {
    context: contextParts.join('\n\n'),
    chunkIds,
  }
}
