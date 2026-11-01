import { BM25 } from './bm25'
import {
  actSlugFromName,
  allSections,
  getSectionByActNumber,
  getSectionsByNumber,
  normalizeSectionNumber,
} from './index'
import { searchDense } from './dense'
import type { RetrievedSection, RetrievalResult, Section, MatchType } from './types'
import { contentTokens, normalizeForMatch } from '../text'

const TOP_K = 8
const MIN_COVERAGE = 0.34
const DENSE_THRESHOLD = 0.45
const NAMED_ACT_BOOST = 1.8
const RRF_K = 60

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
  { re: /\bevidence act\b/i, slug: 'bsa' },
  { re: /\bbharatiya nagarik suraksha sanhita\b/i, slug: 'bnss' },
  { re: /\bnagarik suraksha sanhita\b/i, slug: 'bnss' },
  { re: /\bcode of criminal procedure\b/i, slug: 'crpc' },
  { re: /\bcriminal procedure code\b/i, slug: 'crpc' },
  { re: /\bcode of civil procedure\b/i, slug: 'cpc' },
  { re: /\bcivil procedure code\b/i, slug: 'cpc' },
  { re: /\bconstitution of india\b/i, slug: 'constitution' },
  { re: /\bconstitution\b/i, slug: 'constitution' },
  { re: /\barticle\b/i, slug: 'constitution' },
  { re: /\bnegotiable instruments act\b/i, slug: 'ni' },
  { re: /\bnegotiable instruments\b/i, slug: 'ni' },
  { re: /\bni act\b/i, slug: 'ni' },
  { re: /\blimitation act\b/i, slug: 'limitation' },
  { re: /\barbitration and conciliation act\b/i, slug: 'arbitration' },
  { re: /\barbitration act\b/i, slug: 'arbitration' },
  { re: /\bspecific relief act\b/i, slug: 'specific-relief' },
  { re: /\bspecific relief\b/i, slug: 'specific-relief' },
  { re: /\bdigital personal data protection act\b/i, slug: 'dpdp' },
  { re: /\bdigital personal data protection\b/i, slug: 'dpdp' },
  { re: /\bdata protection act\b/i, slug: 'dpdp' },
  { re: /\bdpdp act\b/i, slug: 'dpdp' },
  { re: /\bdpdp\b/i, slug: 'dpdp' },
  { re: /\bipc\b/i, slug: 'ipc' },
  { re: /\bbns\b/i, slug: 'bns' },
  { re: /\bbnss\b/i, slug: 'bnss' },
  { re: /\bcrpc\b/i, slug: 'crpc' },
  { re: /\bcpc\b/i, slug: 'cpc' },
  { re: /\bit act\b/i, slug: 'it' },
  { re: /\bbsa\b/i, slug: 'bsa' },
]

const SECTION_NUM_RES = [
  /\b(?:section|sec|s)\.?\s*(\d{1,3}[A-Z]{0,2})\b/gi,
  /\barticle\s*(\d{1,3}[A-Z]{0,2})\b/gi,
  /\b(\d{1,3}[A-Z]{0,2})\s+(?:of\s+the\s+)?(?:ipc|bns|bnss|crpc|cpc|indian penal code|bharatiya nyaya sanhita|bharatiya nagarik suraksha sanhita|contract act|it act|companies act|bsa|constitution|ni act|negotiable instruments act|limitation act|arbitration act|specific relief act|dpdp act|dpdp)\b/gi,
  /\b(?:ipc|bns|bnss|crpc|cpc|it act|companies act|bsa|ni act|limitation act|arbitration act|specific relief act|dpdp act|dpdp)\s+(\d{1,3}[A-Z]{0,2})\b/gi,
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

function titlePhraseBoost(question: string, title: string): number {
  const q = normalizeForMatch(question)
  const t = normalizeForMatch(title)
  if (!q || !t) return 1

  const qWords = q.split(' ')
  for (let n = Math.min(4, qWords.length); n >= 2; n--) {
    for (let i = 0; i + n <= qWords.length; i++) {
      const phrase = qWords.slice(i, i + n).join(' ')
      if (phrase.length >= 10 && t.includes(phrase)) return 1.5
    }
  }

  const titleWords = t.split(' ').filter(Boolean)
  if (titleWords.length === 1 && titleWords[0]!.length >= 4 && qWords.includes(titleWords[0]!)) {
    return 1.3
  }
  return 1
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
 * Synchronous lexical-only fallback retrieval (BM25 + exact section pinning).
 */
export function retrieveSync(question: string, opts: { topK?: number } = {}): RetrievalResult {
  const topK = opts.topK ?? TOP_K
  const queryTokens = contentTokens(question)
  const exact = extractExactSections(question)
  const exactIds = new Set(exact.map((s) => s.id))
  const namedAct = findActInQuery(question)

  const hits = getIndex().search(queryTokens, topK * 3)
  const byId = new Map(sections.map((s) => [s.id, s]))

  const lexicalAll: RetrievedSection[] = hits
    .filter((h) => !exactIds.has(h.id))
    .map((h) => {
      const s = byId.get(h.id)!
      const actBoost = namedAct && actSlugFromName(s.act) === namedAct ? NAMED_ACT_BOOST : 1
      const phraseBoost = titlePhraseBoost(question, s.title)
      return { ...s, score: h.score * actBoost * phraseBoost, matchType: 'lexical' as const }
    })

  const scoped =
    namedAct && lexicalAll.some((s) => actSlugFromName(s.act) === namedAct)
      ? lexicalAll.filter((s) => actSlugFromName(s.act) === namedAct)
      : lexicalAll

  const lexical = scoped.sort((a, b) => b.score - a.score)

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

/**
 * Hybrid retrieval engine combining BM25 lexical ranking and Dense Vector Search
 * via Reciprocal Rank Fusion (RRF).
 *
 * 1. Exact section references ("section 302 IPC") are resolved with O(1) hash lookup and pinned.
 * 2. Dense embeddings retrieve semantic matches across 3,630 sections in < 2ms.
 * 3. BM25 ranks token frequency with act and title boosts.
 * 4. RRF fuses candidate rankings with k=60.
 * 5. Hybrid coverage gate filters out-of-corpus queries while preserving colloquial matches.
 */
export async function retrieve(
  question: string,
  opts: { topK?: number } = {},
): Promise<RetrievalResult> {
  const topK = opts.topK ?? TOP_K
  const queryTokens = contentTokens(question)
  const exact = extractExactSections(question)
  const exactIds = new Set(exact.map((s) => s.id))
  const namedAct = findActInQuery(question)
  const byId = new Map(sections.map((s) => [s.id, s]))

  // 1. BM25 search
  const bm25Hits = getIndex().search(queryTokens, 40)
  const lexicalAll = bm25Hits
    .filter((h) => !exactIds.has(h.id))
    .map((h) => {
      const s = byId.get(h.id)!
      const actBoost = namedAct && actSlugFromName(s.act) === namedAct ? NAMED_ACT_BOOST : 1
      const phraseBoost = titlePhraseBoost(question, s.title)
      return { id: h.id, score: h.score * actBoost * phraseBoost }
    })
    .sort((a, b) => b.score - a.score)

  // 2. Dense Vector Search
  const denseHitsRaw = await searchDense(question, 40)
  const denseHits = denseHitsRaw.filter((h) => !exactIds.has(h.id))

  // 3. Compute lexical coverage and top dense similarity
  let coverage = 0
  let topLexicalScore = 0
  if (lexicalAll.length > 0) {
    const bestLex = byId.get(lexicalAll[0]!.id)
    if (bestLex) {
      topLexicalScore = lexicalAll[0]!.score
      const bestTokens = new Set(bestLex.tokens)
      const matched = queryTokens.filter((t) => bestTokens.has(t)).length
      coverage = queryTokens.length > 0 ? matched / queryTokens.length : 0
    }
  }
  const topDenseScore = denseHits[0]?.score ?? 0

  // 4. Reciprocal Rank Fusion (RRF)
  const bm25RankMap = new Map<string, number>()
  lexicalAll.slice(0, 30).forEach((h, i) => bm25RankMap.set(h.id, i + 1))

  const denseRankMap = new Map<string, number>()
  denseHits.slice(0, 30).forEach((h, i) => denseRankMap.set(h.id, i + 1))

  const candidateIds = new Set([...bm25RankMap.keys(), ...denseRankMap.keys()])
  const fused: RetrievedSection[] = []

  for (const id of candidateIds) {
    const s = byId.get(id)
    if (!s) continue

    const rBM25 = bm25RankMap.get(id)
    const rDense = denseRankMap.get(id)

    const rrfScore = (rBM25 ? 1 / (RRF_K + rBM25) : 0) + (rDense ? 1 / (RRF_K + rDense) : 0)

    let matchType: MatchType = 'lexical'
    if (rBM25 && rDense) matchType = 'hybrid'
    else if (rDense) matchType = 'dense'

    // Scope preference if act is named
    const actBoost = namedAct && actSlugFromName(s.act) === namedAct ? 1.5 : 1

    fused.push({
      ...s,
      score: rrfScore * actBoost,
      matchType,
    })
  }

  // Filter scoped to named act if question specifically names an act
  const scopedFused =
    namedAct && fused.some((s) => actSlugFromName(s.act) === namedAct)
      ? fused.filter((s) => actSlugFromName(s.act) === namedAct)
      : fused

  const sortedCandidates = scopedFused.sort((a, b) => b.score - a.score)

  // 5. Pinned exact matches
  const pinned: RetrievedSection[] = exact.map((s) => ({
    ...s,
    score: 9999,
    matchType: 'exact' as const,
  }))

  const sectionsOut = [...pinned, ...sortedCandidates].slice(0, topK)

  // 6. Hybrid Abstention Gate
  const hasStrongLexical = coverage >= MIN_COVERAGE && topLexicalScore > 0
  const hasStrongDense = topDenseScore >= DENSE_THRESHOLD
  const abstain = exact.length === 0 && !hasStrongLexical && !hasStrongDense

  return {
    sections: sectionsOut,
    abstain,
    topScore: topLexicalScore || topDenseScore,
    coverage,
  }
}
