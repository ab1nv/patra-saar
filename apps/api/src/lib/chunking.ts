import { nanoid } from 'nanoid'

const MAX_CHUNK_LENGTH = 1500 // characters, roughly 400 tokens
const OVERLAP = 200

export interface TextChunk {
  id: string
  index: number
  content: string
  metadata: Record<string, any>
}

// Legal-aware text chunking: splits by sections first, then by sentence boundaries with overlap
export function chunkText(text: string): TextChunk[] {
  const sectionRegex =
    /(?=(?:^|\n)(?:Section\s+\d|Article\s+\d|Clause\s+\d|\d+\.\s+[A-Z]|CHAPTER\s|SCHEDULE\s))/gi
  const sections = text.split(sectionRegex).filter((s) => s.trim().length > 0)

  const chunks: TextChunk[] = []
  let chunkIndex = 0

  for (const section of sections) {
    if (section.length <= MAX_CHUNK_LENGTH) {
      chunks.push({
        id: nanoid(),
        index: chunkIndex++,
        content: section.trim(),
        metadata: extractSectionMetadata(section),
      })
    } else {
      const sentences = section.split(/(?<=[.!?])\s+/)
      let current = ''

      for (const sentence of sentences) {
        if ((current + ' ' + sentence).length > MAX_CHUNK_LENGTH && current.length > 0) {
          chunks.push({
            id: nanoid(),
            index: chunkIndex++,
            content: current.trim(),
            metadata: extractSectionMetadata(current),
          })
          const words = current.split(' ')
          current = words.slice(-Math.floor(OVERLAP / 5)).join(' ') + ' ' + sentence
        } else {
          current = current ? current + ' ' + sentence : sentence
        }
      }

      if (current.trim().length > 0) {
        chunks.push({
          id: nanoid(),
          index: chunkIndex++,
          content: current.trim(),
          metadata: extractSectionMetadata(current),
        })
      }
    }
  }

  // Fallback: sliding window for text without section markers
  if (chunks.length === 0) {
    let pos = 0
    while (pos < text.length) {
      const end = Math.min(pos + MAX_CHUNK_LENGTH, text.length)
      chunks.push({
        id: nanoid(),
        index: chunkIndex++,
        content: text.slice(pos, end).trim(),
        metadata: {},
      })
      pos = end - OVERLAP
      if (pos >= text.length) break
    }
  }

  return chunks
}

export function extractSectionMetadata(text: string): Record<string, any> {
  const meta: Record<string, any> = {}

  const sectionMatch = text.match(/Section\s+(\d+[\w.]*)/i)
  if (sectionMatch) meta.section = sectionMatch[1]

  const articleMatch = text.match(/Article\s+(\d+[\w.]*)/i)
  if (articleMatch) meta.section = `Article ${articleMatch[1]}`

  const clauseMatch = text.match(/Clause\s+(\d+[\w.]*)/i)
  if (clauseMatch) meta.section = `Clause ${clauseMatch[1]}`

  return meta
}
