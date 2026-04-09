/**
 * RAG v2 utilities: Reciprocal Rank Fusion (RRF) and citation parsing.
 */

export interface RankedResult {
  chunkId: string
  content: string
  documentId: string
  sectionTitle?: string
  pageNumber?: number
  documentFilename?: string
  score: number
}

const RRF_K = 60

/**
 * Computes a Reciprocal Rank Fusion score for a single chunk given its
 * rank position in the vector search results and the FTS5 BM25 results.
 *
 * Formula: score = 1/(k + vectorRank) + 1/(k + ftsRank)
 * where Infinity rank means the chunk was not found in that retrieval set.
 */
export function computeRrfScore(vectorRank: number, ftsRank: number): number {
  const vectorScore = isFinite(vectorRank) ? 1 / (RRF_K + vectorRank) : 0
  const ftsScore = isFinite(ftsRank) ? 1 / (RRF_K + ftsRank) : 0
  return vectorScore + ftsScore
}

type SourceChunk = {
  chunkId: string
  content: string
  documentId: string
  sectionTitle?: string
  pageNumber?: number
  documentFilename?: string
}

/**
 * Merges vector search results and FTS5 results using Reciprocal Rank Fusion.
 * Deduplicates by chunkId, assigns combined RRF scores, sorts descending,
 * and returns the top `topN` results.
 */
export function mergeRrfResults(
  vectorResults: SourceChunk[],
  ftsResults: SourceChunk[],
  topN = 15,
): RankedResult[] {
  // Build rank maps: chunkId → 1-indexed rank position
  const vectorRankMap = new Map<string, number>()
  vectorResults.forEach((chunk, idx) => {
    vectorRankMap.set(chunk.chunkId, idx + 1)
  })

  const ftsRankMap = new Map<string, number>()
  ftsResults.forEach((chunk, idx) => {
    ftsRankMap.set(chunk.chunkId, idx + 1)
  })

  // Build a unified map of all unique chunks
  const chunkMap = new Map<string, SourceChunk>()
  for (const chunk of vectorResults) {
    chunkMap.set(chunk.chunkId, chunk)
  }
  for (const chunk of ftsResults) {
    if (!chunkMap.has(chunk.chunkId)) {
      chunkMap.set(chunk.chunkId, chunk)
    }
  }

  // Score each unique chunk with RRF
  const scored: RankedResult[] = []
  for (const [chunkId, chunk] of chunkMap) {
    const vectorRank = vectorRankMap.get(chunkId) ?? Infinity
    const ftsRank = ftsRankMap.get(chunkId) ?? Infinity
    scored.push({
      chunkId,
      content: chunk.content,
      documentId: chunk.documentId,
      sectionTitle: chunk.sectionTitle,
      pageNumber: chunk.pageNumber,
      documentFilename: chunk.documentFilename,
      score: computeRrfScore(vectorRank, ftsRank),
    })
  }

  // Sort descending by score and return top N
  return scored.sort((a, b) => b.score - a.score).slice(0, topN)
}

/**
 * Extracts all citation numbers in the form [N] from a text string.
 * Returns a sorted, deduplicated array of unique integer citation numbers.
 */
export function extractCitationNumbers(text: string): number[] {
  const matches = text.matchAll(/\[(\d+)\]/g)
  const nums = new Set<number>()
  for (const m of matches) {
    nums.add(parseInt(m[1], 10))
  }
  return [...nums].sort((a, b) => a - b)
}
