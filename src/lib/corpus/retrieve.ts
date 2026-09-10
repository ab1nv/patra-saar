import { BM25 } from './bm25'
import {
  actSlugFromName,
  allSections,
  getSectionByActNumber,
  getSectionsByNumber,
  normalizeSectionNumber,
} from './index'
import type { RetrievedSection, RetrievalResult, Section } from './types'
import { contentTokens } from '../text'

const TOP_K = 8
const MIN_COVERAGE = 0.34
const NAMED_ACT_BOOST = 1.8

/** act names recognized inside a free-text question (longest first at match time). */
const ACT_PATTERNS: { re: RegExp; slug: string }[] = [
  { re: /\bindian penal code\b/i, slug: 'ipc' },
  { re: /\bbharatiya nyaya sanhita\b/i, slug: 'bns' },
  { re: /\bindian contract act\b/i, slug: 'contract' },
  { re: /\bcontract act\b/i, slug: 'contract' },
  { re: /\binformation technology act\b/i, slug: 'it' },
  { re: /\bcompanies act\b/i, slug: 'companies' },
  { re: /\bbharatiya sakshya adhiniyam\b/i, slug: 'bsa' },
  { re: /\bsakshya adhiniyam\b/i, slug: 'bsa' },
  { re: /\bipc\b/i, slug: 'ipc' },
  { re: /\bbns\b/i, slug: 'bns' },
  { re: /\bit act\b/i, slug: 'it' },
  { re: /\bbsa\b/i, slug: 'bsa' },
]

const SECTION_NUM_RES = [
  /\b(?:section|sec|s)\.?\s*(\d{1,3}[A-Z]{0,2})\b/gi,
  /\b(\d{1,3}[A-Z]{0,2})\s+(?:of\s+the\s+)?(?:ipc|bns|indian penal code|bharatiya nyaya sanhita|contract act|it act|companies act|bsa)\b/gi,
  /\b(?:ipc|bns|it act|companies act|bsa)\s+(\d{1,3}[A-Z]{0,2})\b/gi,
]

let bm25: BM25 | null = null
const sections = allSections()

function getIndex(): BM25 {
  if (!bm25) bm25 = new BM25(sections.map((s) => ({ id: s.id, tokens: s.tokens })))
  return bm25
}

function findActInQuery(question: string): string | undefined {
  for (const { re, slug } of ACT_PATTERNS) {
    if (re.test(question)) return slug
  }
  return undefined
}

function extractExactSections(question: string): Section[] {
  const found: Section[] = []
  const seen = new Set<string>()

  for (const re of SECTION_NUM_RES) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(question)) !== null) {
      const num = normalizeSectionNumber(m[1]!)
      const act = findActInQuery(question)

      let hits: Section[]
      if (act) {
        const s = getSectionByActNumber(act, num)
        hits = s ? [s] : []
      } else {
        hits = getSectionsByNumber(num)
      }

      for (const h of hits) {
        if (!seen.has(h.id)) {
          seen.add(h.id)
          found.push(h)
        }
      }
    }
  }

  return found
}

/**
 * Retrieves the most relevant statutory sections for a question.
 *
 * 1. Direct section references ("section 302 IPC") are resolved with an exact
 *    hash lookup and pinned to the top.
 * 2. The remaining question is scored with BM25 over section title + body.
 * 3. If nothing is exact and the best lexical hit fails the coverage gate, the
 *    result abstains.
 */
export function retrieve(question: string, opts: { topK?: number } = {}): RetrievalResult {
  const topK = opts.topK ?? TOP_K
  const queryTokens = contentTokens(question)
  const exact = extractExactSections(question)
  const exactIds = new Set(exact.map((s) => s.id))
  const namedAct = findActInQuery(question)

  const hits = getIndex().search(queryTokens, topK * 3)
  const byId = new Map(sections.map((s) => [s.id, s]))

  const lexical: RetrievedSection[] = hits
    .filter((h) => !exactIds.has(h.id))
    .map((h) => {
      const s = byId.get(h.id)!
      // If the question names an act, prefer sections from that act.
      const boost = namedAct && actSlugFromName(s.act) === namedAct ? NAMED_ACT_BOOST : 1
      return { ...s, score: h.score * boost, matchType: 'lexical' as const }
    })
    .sort((a, b) => b.score - a.score)

  // coverage = share of the question's content terms present in the best hit
  let coverage = 0
  let topScore = 0
  if (lexical.length > 0) {
    const best = lexical[0]!
    topScore = best.score
    const bestTokens = new Set(best.tokens)
    const matched = queryTokens.filter((t) => bestTokens.has(t)).length
    coverage = queryTokens.length > 0 ? matched / queryTokens.length : 0
  }

  const pinned: RetrievedSection[] = exact.map((s) => ({
    ...s,
    score: 9999,
    matchType: 'exact' as const,
  }))

  const sectionsOut = [...pinned, ...lexical].slice(0, topK)
  const abstain = exact.length === 0 && (topScore === 0 || coverage < MIN_COVERAGE)

  return { sections: sectionsOut, abstain, topScore, coverage }
}
