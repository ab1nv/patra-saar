import type { Env } from '../../types/bindings'
import { embedQuery } from './embedder'

const SIMILARITY_THRESHOLD = 0.72

export interface RetrievedChunk {
  id: string
  score: number
  source: 'user-doc' | 'legal-corpus'
  metadata: Record<string, unknown>
}

/**
 * Queries both Vectorize namespaces in parallel and merges results.
 *
 * User docs are filtered by documentId + userId for isolation.
 * Legal corpus is shared — no user filter needed.
 * Results below the similarity threshold are discarded.
 */
export async function retrieveChunks(
  documentIds: string[],
  question: string,
  userId: string,
  env: Env,
): Promise<RetrievedChunk[]> {
  const queryVector = await embedQuery(question, env)

  const promises = [
    env.LEGAL_INDEX.query(queryVector, {
      topK: 3,
    }),
  ]

  if (documentIds.length > 0) {
    promises.push(
      env.CHUNKS_INDEX.query(queryVector, {
        topK: 5,
        filter: { documentId: { $in: documentIds }, userId },
      }),
    )
  }

  const results = await Promise.all(promises)
  const legalResults = results[0]
  const userResults = documentIds.length > 0 ? results[1] : { matches: [] }

  const merged: RetrievedChunk[] = [
    ...userResults.matches.map((m) => ({
      id: m.id,
      score: m.score,
      source: 'user-doc' as const,
      metadata: m.metadata ?? {},
    })),
    ...legalResults.matches.map((m) => ({
      id: m.id,
      score: m.score,
      source: 'legal-corpus' as const,
      metadata: m.metadata ?? {},
    })),
  ]

  return merged.filter((m) => m.score >= SIMILARITY_THRESHOLD).sort((a, b) => b.score - a.score)
}
