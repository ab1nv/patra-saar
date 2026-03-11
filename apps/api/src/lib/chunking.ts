import { nanoid } from 'nanoid'

const MAX_CHUNK_LENGTH = 1500 // characters, roughly 400 tokens
const OVERLAP = 200

export interface TextChunkMetadata {
  section?: string
  sectionTitle?: string
  page?: number
}

export interface TextChunk {
  id: string
  index: number
  content: string
  metadata: TextChunkMetadata
}

// Section heading lookahead — also matches after form-feed (\f) as page break
const SECTION_REGEX =
  /(?=(?:^|\n|\f)(?:Section\s+\d|Article\s+\d|Clause\s+\d|\d+\.\s+[A-Z]|CHAPTER\s|SCHEDULE\s))/gi

// Legal-aware text chunking: splits by sections first, then by sentence boundaries with overlap
export function chunkText(text: string): TextChunk[] {
  const sections = text.split(SECTION_REGEX).filter((s) => s.trim().length > 0)

  const chunks: TextChunk[] = []
  let chunkIndex = 0
  let currentPage = 1

  for (const section of sections) {
    // Leading form-feeds come from the split boundary and represent page breaks
    // before this section starts — advance currentPage before recording pageAtStart
    const leadingFFs = (section.match(/^\f+/) || [''])[0].length
    currentPage += leadingFFs

    const pageAtStart = currentPage
    // Strip leading form-feeds so trackPageNumber doesn't double-count them
    const sectionForPageTracking = section.replace(/^\f+/, '')
    const pageAfterSection = trackPageNumber(sectionForPageTracking, currentPage)

    if (section.length <= MAX_CHUNK_LENGTH) {
      chunks.push({
        id: nanoid(),
        index: chunkIndex++,
        content: section.trim(),
        metadata: {
          ...extractSectionMetadata(section),
          sectionTitle: extractSectionTitle(section),
          page: pageAtStart,
        },
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
            metadata: {
              ...extractSectionMetadata(current),
              sectionTitle: extractSectionTitle(section),
              page: pageAtStart,
            },
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
          metadata: {
            ...extractSectionMetadata(current),
            sectionTitle: extractSectionTitle(section),
            page: pageAtStart,
          },
        })
      }
    }

    currentPage = pageAfterSection
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
        metadata: { page: 1 },
      })
      pos = end - OVERLAP
      if (pos >= text.length) break
    }
  }

  return chunks
}

/**
 * Given a segment of text and the current page number, returns the updated
 * page number after consuming all page-break markers in the segment.
 *
 * Handles:
 *   - \f (form feed) — increments by 1 per occurrence
 *   - \n--- Page N ---\n — sets page to N
 *   - \nPage N\n or \npage N\n — sets page to N (also matches end of string)
 *   - \nN\n (standalone digit) — sets page to N (also matches end of string)
 */
export function trackPageNumber(text: string, currentPage: number): number {
  let page = currentPage

  // Count form feeds (each is one page break increment)
  const formFeeds = (text.match(/\f/g) || []).length
  page += formFeeds

  // Match explicit page number markers; trailing \n OR end-of-string allowed
  const explicitPattern =
    /\n---\s*[Pp]age\s+(\d+)\s*---(?:\n|$)|\n[Pp]age\s+(\d+)(?:\n|$)|\n(\d+)(?:\n|$)/g
  let match: RegExpExecArray | null
  let lastExplicitPage: number | null = null

  while ((match = explicitPattern.exec(text)) !== null) {
    const pageNum = parseInt(match[1] ?? match[2] ?? match[3], 10)
    if (!isNaN(pageNum)) {
      lastExplicitPage = pageNum
    }
  }

  if (lastExplicitPage !== null) {
    page = lastExplicitPage
  }

  return page
}

/**
 * Extracts the full heading text from the first line of a section chunk.
 * Returns undefined if the first line does not start with a recognized heading keyword.
 * Normalizes internal whitespace and trims.
 */
export function extractSectionTitle(text: string): string | undefined {
  const trimmed = text.trimStart()
  const firstLine = trimmed.split('\n')[0]

  const headingPattern =
    /^(?:Section\s+\d[\w.]*|Article\s+\d[\w.]*|Clause\s+\d[\w.]*|\d+\.\s+[A-Z]|CHAPTER\s|SCHEDULE\s)/i

  if (!headingPattern.test(firstLine.trim())) {
    return undefined
  }

  return firstLine.trim().replace(/\s+/g, ' ')
}

export function extractSectionMetadata(text: string): Record<string, string> {
  const meta: Record<string, string> = {}

  const sectionMatch = text.match(/Section\s+(\d+[\w.]*)/i)
  if (sectionMatch) meta.section = sectionMatch[1]

  const articleMatch = text.match(/Article\s+(\d+[\w.]*)/i)
  if (articleMatch) meta.section = `Article ${articleMatch[1]}`

  const clauseMatch = text.match(/Clause\s+(\d+[\w.]*)/i)
  if (clauseMatch) meta.section = `Clause ${clauseMatch[1]}`

  return meta
}
