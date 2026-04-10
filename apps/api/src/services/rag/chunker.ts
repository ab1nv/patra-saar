import type { Chunk } from '@patrasaar/shared'

const AVG_CHARS_PER_TOKEN = 4

/** Rough token count estimate — avoids bringing in a full tokenizer dependency. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN)
}

/**
 * Splits raw document text into overlapping chunks suitable for embedding.
 *
 * Strategy: paragraph-aware splitting with a ~512 token target per chunk
 * and ~50 token overlap between consecutive chunks. Overlap prevents
 * information loss at chunk boundaries.
 */
export function chunkDocument(text: string, documentId: string): Omit<Chunk, 'id' | 'vectorId'>[] {
  const paragraphs = text.split(/\n{2,}/)
  const chunks: Omit<Chunk, 'id' | 'vectorId'>[] = []
  let buffer = ''
  let pageNumber = 1

  for (const para of paragraphs) {
    if (para.includes('[PAGE_BREAK]')) pageNumber++
    buffer += para + '\n\n'

    if (estimateTokens(buffer) >= 480) {
      chunks.push({
        documentId,
        text: buffer.trim(),
        pageNumber,
        chunkIndex: chunks.length,
        tokenCount: estimateTokens(buffer),
        source: 'user-doc',
      })
      // ~50 token overlap to preserve context across boundaries
      buffer = buffer.slice(-200)
    }
  }

  if (buffer.trim()) {
    chunks.push({
      documentId,
      text: buffer.trim(),
      pageNumber,
      chunkIndex: chunks.length,
      tokenCount: estimateTokens(buffer),
      source: 'user-doc',
    })
  }

  return chunks
}
