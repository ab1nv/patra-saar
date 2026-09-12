/**
 * Citation grammar:
 *   [[ACT s.NUMBER | "verbatim quote from that section"]]
 *
 * The model must emit this exact shape. We parse it, verify each citation
 * server-side, and rewrite the markers as [[N]] for inline rendering.
 */
export type ParsedCitation = {
  raw: string
  actName: string
  number: string
  quote: string
  /** sub-section the model cited, e.g. "2" for "BNS s.318(2)" */
  subsection?: string
}

const CITATION_RE = /\[\[\s*([^|\]]+?)\s*\|\s*["“]([\s\S]*?)["”]\s*\]\]/g
// Accepts an optional sub-section, e.g. "IPC s.302", "BNS 318(2)", "IPC Section 304B".
const LEFT_RE = /^(.*?)[\s,]*(?:section|sec\.?|s\.?)?\s*(\d{1,3}[A-Z]{0,2})(?:\s*\(([^)]*)\))?\s*$/i

export function parseCitations(answer: string): {
  citations: ParsedCitation[]
  answerWithMarkers: string
} {
  const citations: ParsedCitation[] = []
  const answerWithMarkers = answer.replace(CITATION_RE, (raw, left: string, quote: string) => {
    const m = left.trim().match(LEFT_RE)
    if (!m) return raw
    const actName = m[1]!.trim()
    const number = m[2]!.trim()
    const subsection = m[3]?.trim() || undefined
    if (!actName) return raw
    citations.push({ raw, actName, number, quote: quote.trim(), subsection })
    return `[[${citations.length}]]`
  })
  return { citations, answerWithMarkers }
}
