import { parseCitations } from '../citations/format'
import { checkQuoteVerbatim, checkSectionExists } from '../citations/verify'

export type ScoredCitation = {
  actName: string
  number: string
  quote: string
  resolvedId?: string
  exists: boolean
  verbatim: boolean
  correct: boolean
  /** only set for the grounded arm */
  retrieved?: boolean
  verified?: boolean
}

export type ScoredAnswer = {
  /** true when the model produced no parseable citation at all */
  abstained: boolean
  citationCount: number
  existsCount: number
  verbatimCount: number
  correctCount: number
  fabricatedCount: number
  verifiedCount: number
  citations: ScoredCitation[]
}

export type ArmScoreInput = {
  answer: string
  /** ground-truth section id for in-corpus questions */
  expectedSectionId?: string
  /** section ids that were retrieved for this question (grounded arm only) */
  retrievedIds?: Set<string>
}

/**
 * Scores a single answer against the corpus. Pure and deterministic so the audit
 * aggregation is unit-testable. Note this deliberately does NOT apply the
 * "wasRetrieved" check unless retrievedIds is supplied - the baseline arm has no
 * retrieval, and we want to know whether its citations are real at all.
 */
export function scoreAnswer({
  answer,
  expectedSectionId,
  retrievedIds,
}: ArmScoreInput): ScoredAnswer {
  const { citations } = parseCitations(answer)

  const scored: ScoredCitation[] = citations.map((c) => {
    const section = checkSectionExists(c)
    const exists = Boolean(section)
    const verbatim = section ? checkQuoteVerbatim(section, c.quote) : false
    const correct = expectedSectionId ? section?.id === expectedSectionId : false
    const retrieved = retrievedIds ? Boolean(section && retrievedIds.has(section.id)) : undefined
    const verified = retrieved === undefined ? undefined : Boolean(retrieved && exists && verbatim)
    return {
      actName: c.actName,
      number: c.number,
      quote: c.quote,
      resolvedId: section?.id,
      exists,
      verbatim,
      correct,
      retrieved,
      verified,
    }
  })

  return {
    abstained: scored.length === 0,
    citationCount: scored.length,
    existsCount: scored.filter((c) => c.exists).length,
    verbatimCount: scored.filter((c) => c.verbatim).length,
    correctCount: scored.filter((c) => c.correct).length,
    fabricatedCount: scored.filter((c) => !c.exists).length,
    verifiedCount: scored.filter((c) => c.verified).length,
    citations: scored,
  }
}

export type ArmSummary = {
  citations: number
  existsCount: number
  verbatimCount: number
  correctCount: number
  fabricatedCount: number
  verifiedCount: number
  existsRate: number
  verbatimRate: number
  correctRate: number
  fabricatedRate: number
  verifiedRate: number
  /** per-question */
  abstainRate: number
  questionsWithCitation: number
  questionsWithFabrication: number
  fabricatedQuestionRate: number
  /** share of in-corpus questions where at least one citation hit the expected section */
  questionAccuracy: number
  correctQuestions: number
  inCorpusQuestions: number
}

export type QuestionResult = {
  id: string
  kind: 'in-corpus' | 'nonexistent' | 'out-of-corpus'
  question: string
  expectedSection?: string
  baseline: ScoredAnswer & { answer: string }
  grounded: ScoredAnswer & { answer: string; providerAbstained: boolean }
}

export type AuditSummary = {
  sampleSize: number
  inCorpus: number
  baseline: ArmSummary
  grounded: ArmSummary
}

function rate(n: number, d: number): number {
  return d === 0 ? 0 : n / d
}

export function summarizeArm(results: QuestionResult[], arm: 'baseline' | 'grounded'): ArmSummary {
  const citations = results.reduce((n, r) => n + r[arm].citationCount, 0)
  const exists = results.reduce((n, r) => n + r[arm].existsCount, 0)
  const verbatim = results.reduce((n, r) => n + r[arm].verbatimCount, 0)
  const correct = results.reduce((n, r) => n + r[arm].correctCount, 0)
  const fabricated = results.reduce((n, r) => n + r[arm].fabricatedCount, 0)
  const verified = results.reduce((n, r) => n + r[arm].verifiedCount, 0)
  const abstained = results.filter((r) => r[arm].abstained).length
  const withCitation = results.filter((r) => r[arm].citationCount > 0).length
  const withFabrication = results.filter((r) => r[arm].fabricatedCount > 0).length
  // correct-rate is only meaningful over in-corpus questions with an expected section
  const expectedCitations = results
    .filter((r) => r.expectedSection)
    .reduce((n, r) => n + r[arm].citationCount, 0)
  const inCorpus = results.filter((r) => r.expectedSection)
  const correctQuestions = inCorpus.filter((r) => r[arm].citations.some((c) => c.correct)).length

  return {
    citations,
    existsCount: exists,
    verbatimCount: verbatim,
    correctCount: correct,
    fabricatedCount: fabricated,
    verifiedCount: verified,
    existsRate: rate(exists, citations),
    verbatimRate: rate(verbatim, citations),
    correctRate: rate(correct, expectedCitations),
    fabricatedRate: rate(fabricated, citations),
    verifiedRate: rate(verified, citations),
    abstainRate: rate(abstained, results.length),
    questionsWithCitation: withCitation,
    questionsWithFabrication: withFabrication,
    fabricatedQuestionRate: rate(withFabrication, results.length),
    questionAccuracy: rate(correctQuestions, inCorpus.length),
    correctQuestions,
    inCorpusQuestions: inCorpus.length,
  }
}

export function summarize(results: QuestionResult[]): AuditSummary {
  return {
    sampleSize: results.length,
    inCorpus: results.filter((r) => r.kind === 'in-corpus').length,
    baseline: summarizeArm(results, 'baseline'),
    grounded: summarizeArm(results, 'grounded'),
  }
}
