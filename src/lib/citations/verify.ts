import { resolveSection } from '../corpus/index'
import type { Section } from '../corpus/types'
import { normalizeForMatch } from '../text'
import { parseCitations, type ParsedCitation } from './format'

export type CitationFailure = 'section_not_found' | 'not_retrieved' | 'quote_not_verbatim'

export type VerifiedCitation = {
  index: number
  actName: string
  actFull?: string
  number: string
  /** sub-section the model cited, if any (e.g. "2" from "BNS s.318(2)") */
  subsection?: string
  quote: string
  sectionId?: string
  title?: string
  sectionText?: string
  verified: boolean
  failureReason?: CitationFailure
}

export type VerificationResult = {
  answer: string
  citations: VerifiedCitation[]
  verifiedCount: number
  unverifiedCount: number
}

const MIN_QUOTE_CHARS = 8

/** Check 1 + 3, exposed so the audit can score an ungrounded baseline answer. */
export function checkSectionExists(c: ParsedCitation): Section | undefined {
  return resolveSection(c.actName, c.number)
}

export function checkQuoteVerbatim(section: Section, quote: string): boolean {
  const normalizedQuote = normalizeForMatch(quote)
  return (
    normalizedQuote.length >= MIN_QUOTE_CHARS &&
    normalizeForMatch(section.text).includes(normalizedQuote)
  )
}

/**
 * Server-side citation verifier. Runs on the assembled answer, after generation.
 * Three checks, in order:
 *   1. sectionExists  - the cited section resolves in the corpus
 *   2. wasRetrieved   - that section was actually retrieved for this query
 *   3. quoteVerbatim  - the quoted string appears verbatim in the section text
 */
export function verifyCitations(answer: string, retrieved: Section[]): VerificationResult {
  const { citations, answerWithMarkers } = parseCitations(answer)
  const retrievedIds = new Set(retrieved.map((s) => s.id))

  const verified: VerifiedCitation[] = citations.map((c, i) => {
    const section = checkSectionExists(c)
    const base: VerifiedCitation = {
      index: i + 1,
      actName: c.actName,
      number: c.number,
      subsection: c.subsection,
      quote: c.quote,
      sectionId: section?.id,
      actFull: section?.actFull,
      title: section?.title,
      sectionText: section?.text,
      verified: false,
    }

    if (!section) {
      return { ...base, failureReason: 'section_not_found' }
    }
    if (!retrievedIds.has(section.id)) {
      return { ...base, failureReason: 'not_retrieved' }
    }
    if (!checkQuoteVerbatim(section, c.quote)) {
      return { ...base, failureReason: 'quote_not_verbatim' }
    }
    return { ...base, verified: true }
  })

  return {
    answer: answerWithMarkers,
    citations: verified,
    verifiedCount: verified.filter((c) => c.verified).length,
    unverifiedCount: verified.filter((c) => !c.verified).length,
  }
}
