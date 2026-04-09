/**
 * Citation extraction and verification for PatraSaar RAG pipeline.
 *
 * LLM responses use [N] notation to reference retrieved document chunks.
 * This module:
 *   1. Extracts [N] citations from LLM text output
 *   2. Verifies each citation against the context chunks that were given to the LLM
 *   3. Provides a helper to build the numbered context string sent to the LLM
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A context chunk as used in the RAG pipeline.  Index is 0-based. */
export interface ContextChunk {
  /** 0-based position in the contextChunks array */
  index: number
  content: string
  section?: string
  page?: number
  documentId?: string
}

/** Raw citation parsed from LLM output text. */
export interface ExtractedCitation {
  /** 1-based reference number that appeared as [N] in the text */
  refNumber: number
  /** Character offsets inside the LLM response where [N] occurred */
  positions: number[]
}

/** Citation after cross-referencing against the original context chunks. */
export interface VerifiedCitation extends ExtractedCitation {
  valid: boolean
  /** Short excerpt from the matched chunk (≤ 200 chars), empty string if invalid */
  snippet: string
  section?: string
  page?: number
  documentId?: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Regex that matches strictly numeric [N] patterns where N >= 1. */
const CITATION_RE = /\[(\d+)\]/g

/**
 * Remove fenced code blocks (``` … ```) and inline code (` … `) from text
 * so that brackets inside code examples are not treated as citations.
 */
function stripCodeBlocks(text: string): string {
  // Remove fenced code blocks first
  const withoutFenced = text.replace(/```[\s\S]*?```/g, (match) => ' '.repeat(match.length))
  // Remove inline code spans
  return withoutFenced.replace(/`[^`]*`/g, (match) => ' '.repeat(match.length))
}

// ---------------------------------------------------------------------------
// extractCitations
// ---------------------------------------------------------------------------

/**
 * Parse all [N] citation references from an LLM response string.
 *
 * - Only strictly numeric references are returned ([1a], [2.5] are ignored).
 * - [0] is ignored – reference numbers are 1-based.
 * - Citations inside fenced code blocks or inline code are ignored.
 * - Duplicate occurrences of the same [N] are collapsed into one result with
 *   all their positions recorded.
 * - Results are sorted in ascending order by refNumber.
 */
export function extractCitations(text: string): ExtractedCitation[] {
  if (!text || !text.trim()) return []

  // Strip code blocks so their content does not produce false citations
  const strippedText = stripCodeBlocks(text)

  const byRef = new Map<number, number[]>()
  let match: RegExpExecArray | null

  // Reset lastIndex for safety when reusing the regex
  CITATION_RE.lastIndex = 0
  const re = new RegExp(CITATION_RE.source, 'g')

  while ((match = re.exec(strippedText)) !== null) {
    const refNumber = parseInt(match[1], 10)
    // Ignore zero and non-positive reference numbers
    if (refNumber < 1) continue
    // Ignore if the match position corresponds to stripped space (code block)
    if (strippedText[match.index] !== '[') continue

    const existing = byRef.get(refNumber)
    if (existing) {
      existing.push(match.index)
    } else {
      byRef.set(refNumber, [match.index])
    }
  }

  return Array.from(byRef.entries())
    .map(([refNumber, positions]) => ({ refNumber, positions }))
    .sort((a, b) => a.refNumber - b.refNumber)
}

// ---------------------------------------------------------------------------
// verifyCitations
// ---------------------------------------------------------------------------

const SNIPPET_MAX_LENGTH = 200

/**
 * Cross-reference extracted citations against the context chunks that were
 * provided to the LLM.
 *
 * The LLM uses 1-based numbering ([1] = contextChunks[0]), so we subtract 1
 * to look up the correct chunk.
 */
export function verifyCitations(
  extracted: ExtractedCitation[],
  contextChunks: ContextChunk[],
): VerifiedCitation[] {
  return extracted.map((citation) => {
    const chunkIndex = citation.refNumber - 1

    if (
      citation.refNumber < 1 ||
      chunkIndex >= contextChunks.length ||
      contextChunks.length === 0
    ) {
      return {
        ...citation,
        valid: false,
        snippet: '',
      }
    }

    const chunk = contextChunks[chunkIndex]
    const snippet = chunk.content.slice(0, SNIPPET_MAX_LENGTH)

    return {
      ...citation,
      valid: true,
      snippet,
      section: chunk.section,
      page: chunk.page,
      documentId: chunk.documentId,
    }
  })
}

// ---------------------------------------------------------------------------
// buildContextChunks
// ---------------------------------------------------------------------------

const NO_CONTEXT_FALLBACK =
  'No document context available. Answer based on general legal knowledge if possible.'

// ---------------------------------------------------------------------------
// Dual citation types and functions ([KB-N] and [DOC-N])
// ---------------------------------------------------------------------------

import type { KbContextChunk, UserContextChunk } from './dual-rag'

export interface DualExtractedCitation {
  refNumber: number
  sourceType: 'kb' | 'doc'
  positions: number[]
}

export interface DualVerifiedCitation extends DualExtractedCitation {
  valid: boolean
  snippet: string
  sectionRef?: string
  sourceTitle?: string
  documentId?: string
}

const KB_CITATION_RE = /\[KB-(\d+)\]/g
const DOC_CITATION_RE = /\[DOC-(\d+)\]/g

function extractTypedCitations(
  strippedText: string,
  re: RegExp,
  sourceType: 'kb' | 'doc',
): DualExtractedCitation[] {
  const byRef = new Map<number, number[]>()
  const pattern = new RegExp(re.source, 'g')
  let match: RegExpExecArray | null

  while ((match = pattern.exec(strippedText)) !== null) {
    const refNumber = parseInt(match[1], 10)
    if (refNumber < 1) continue
    if (strippedText[match.index] !== '[') continue
    const existing = byRef.get(refNumber)
    if (existing) {
      existing.push(match.index)
    } else {
      byRef.set(refNumber, [match.index])
    }
  }

  return Array.from(byRef.entries())
    .map(([refNumber, positions]) => ({ refNumber, sourceType, positions }))
    .sort((a, b) => a.refNumber - b.refNumber)
}

/**
 * Extracts [KB-N] and [DOC-N] citations from dual-RAG LLM responses.
 */
export function extractDualCitations(text: string): {
  kb: DualExtractedCitation[]
  doc: DualExtractedCitation[]
} {
  if (!text || !text.trim()) return { kb: [], doc: [] }
  const stripped = stripCodeBlocks(text)
  return {
    kb: extractTypedCitations(stripped, KB_CITATION_RE, 'kb'),
    doc: extractTypedCitations(stripped, DOC_CITATION_RE, 'doc'),
  }
}

/**
 * Verifies dual citations against KB and user doc chunks.
 */
export function verifyDualCitations(
  extracted: { kb: DualExtractedCitation[]; doc: DualExtractedCitation[] },
  kbChunks: KbContextChunk[],
  userChunks: UserContextChunk[],
): DualVerifiedCitation[] {
  const verified: DualVerifiedCitation[] = []

  for (const citation of extracted.kb) {
    const chunk = kbChunks[citation.refNumber - 1]
    if (!chunk) {
      verified.push({ ...citation, valid: false, snippet: '' })
      continue
    }
    verified.push({
      ...citation,
      valid: true,
      snippet: chunk.content.slice(0, SNIPPET_MAX_LENGTH),
      sectionRef: chunk.sectionRef ?? undefined,
      sourceTitle: chunk.sourceTitle,
    })
  }

  for (const citation of extracted.doc) {
    const chunk = userChunks[citation.refNumber - 1]
    if (!chunk) {
      verified.push({ ...citation, valid: false, snippet: '' })
      continue
    }
    verified.push({
      ...citation,
      valid: true,
      snippet: chunk.content.slice(0, SNIPPET_MAX_LENGTH),
      sectionRef: chunk.sectionRef ?? undefined,
      documentId: chunk.documentId,
    })
  }

  return verified
}

// ---------------------------------------------------------------------------
/**
 * Build the numbered context string injected into the LLM system prompt.
 *
 * Format for each chunk:
 *   [N] Section <section> (Page <page>): <content>
 *
 * The section and page annotations are omitted when the metadata is absent.
 */
export function buildContextChunks(chunks: ContextChunk[]): string {
  if (chunks.length === 0) return NO_CONTEXT_FALLBACK

  return chunks
    .map((chunk, i) => {
      const num = i + 1
      const parts: string[] = []
      if (chunk.section) parts.push(`Section ${chunk.section}`)
      if (chunk.page !== undefined) parts.push(`Page ${chunk.page}`)
      const meta = parts.length > 0 ? ` ${parts.join(' ')}:` : ':'
      return `[${num}]${meta} ${chunk.content}`
    })
    .join('\n\n')
}
