import { nanoid } from 'nanoid'

// ~512 tokens at ~4 chars/token = ~2048 chars
export const KB_CHUNK_MAX_CHARS = 2000
export const KB_OVERLAP_CHARS = 200

export interface KbChunk {
  id: string
  chunkIndex: number
  content: string
  sectionRef: string | null
}

/**
 * Extracts the section reference from a chunk of legal text.
 * Returns e.g. "Section 105", "Article 3", "Clause 2(a)"
 */
function extractSectionRef(text: string): string | null {
  const sectionMatch = text.match(/Section\s+(\d+[\w.()*-]*)/i)
  if (sectionMatch) return `Section ${sectionMatch[1]}`

  const articleMatch = text.match(/Article\s+(\d+[\w.()*-]*)/i)
  if (articleMatch) return `Article ${articleMatch[1]}`

  const clauseMatch = text.match(/Clause\s+(\d+[\w.()*-]*)/i)
  if (clauseMatch) return `Clause ${clauseMatch[1]}`

  return null
}

/**
 * Splits a long section into smaller chunks at sentence boundaries,
 * with overlap between consecutive chunks.
 */
function splitLongSection(section: string, startIndex: number): KbChunk[] {
  const chunks: KbChunk[] = []
  let chunkIndex = startIndex
  const sentences = section.split(/(?<=[.!?])\s+/)
  let current = ''

  for (const sentence of sentences) {
    // If a single sentence exceeds max, split it by hard character boundaries
    if (sentence.length > KB_CHUNK_MAX_CHARS) {
      if (current.trim()) {
        chunks.push({
          id: nanoid(),
          chunkIndex: chunkIndex++,
          content: current.trim(),
          sectionRef: extractSectionRef(current),
        })
        current = ''
      }
      let pos = 0
      while (pos < sentence.length) {
        const end = Math.min(pos + KB_CHUNK_MAX_CHARS, sentence.length)
        const content = sentence.slice(pos, end).trim()
        if (content) {
          chunks.push({
            id: nanoid(),
            chunkIndex: chunkIndex++,
            content,
            sectionRef: extractSectionRef(content),
          })
        }
        if (end >= sentence.length) break
        pos = end - KB_OVERLAP_CHARS
        if (pos <= 0) break
      }
      continue
    }

    if ((current + ' ' + sentence).length > KB_CHUNK_MAX_CHARS && current.length > 0) {
      chunks.push({
        id: nanoid(),
        chunkIndex: chunkIndex++,
        content: current.trim(),
        sectionRef: extractSectionRef(current),
      })
      // Keep overlap: last ~OVERLAP_CHARS worth of words
      const words = current.split(' ')
      const overlapWords = words.slice(-Math.floor(KB_OVERLAP_CHARS / 5))
      current = overlapWords.join(' ') + ' ' + sentence
    } else {
      current = current ? current + ' ' + sentence : sentence
    }
  }

  if (current.trim().length > 0) {
    chunks.push({
      id: nanoid(),
      chunkIndex: chunkIndex++,
      content: current.trim(),
      sectionRef: extractSectionRef(current),
    })
  }

  return chunks
}

/**
 * Legal-aware chunker for KB ingestion.
 * Splits text at section/article/clause boundaries, respects KB_CHUNK_MAX_CHARS.
 */
export function chunkLegalText(text: string): KbChunk[] {
  if (!text || !text.trim()) return []

  const sectionRegex =
    /(?=(?:^|\n)(?:Section\s+\d|Article\s+\d|Clause\s+\d|\d+\.\s+[A-Z]|CHAPTER\s|SCHEDULE\s))/gi

  const sections = text.split(sectionRegex).filter((s) => s.trim().length > 0)

  const chunks: KbChunk[] = []
  let chunkIndex = 0

  for (const section of sections) {
    if (section.length <= KB_CHUNK_MAX_CHARS) {
      chunks.push({
        id: nanoid(),
        chunkIndex: chunkIndex++,
        content: section.trim(),
        sectionRef: extractSectionRef(section),
      })
    } else {
      const subChunks = splitLongSection(section, chunkIndex)
      chunkIndex += subChunks.length
      chunks.push(...subChunks)
    }
  }

  // Fallback: sliding window when no section markers found
  if (chunks.length === 0) {
    let pos = 0
    while (pos < text.length) {
      const end = Math.min(pos + KB_CHUNK_MAX_CHARS, text.length)
      const content = text.slice(pos, end).trim()
      if (content.length > 0) {
        chunks.push({
          id: nanoid(),
          chunkIndex: chunkIndex++,
          content,
          sectionRef: extractSectionRef(content),
        })
      }
      if (end >= text.length) break
      pos = end - KB_OVERLAP_CHARS
      if (pos <= 0) break
    }
  }

  return chunks
}
