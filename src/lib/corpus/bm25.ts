/**
 * Minimal BM25 (Okapi) implementation. ~70 lines, no dependencies.
 * Used to rank statutory sections against a query. Deterministic and unit-testable.
 */
export type BM25Doc = {
  id: string
  tokens: string[]
}

export type BM25Hit = {
  id: string
  score: number
}

export class BM25 {
  private readonly docs: BM25Doc[]
  private readonly tf: Map<string, number>[]
  private readonly df: Map<string, number>
  private readonly avgdl: number
  private readonly k1: number
  private readonly b: number

  constructor(docs: BM25Doc[], opts: { k1?: number; b?: number } = {}) {
    this.docs = docs
    this.k1 = opts.k1 ?? 1.5
    this.b = opts.b ?? 0.75
    this.df = new Map()
    this.tf = []
    let totalLen = 0

    for (const doc of docs) {
      const freqs = new Map<string, number>()
      for (const t of doc.tokens) freqs.set(t, (freqs.get(t) ?? 0) + 1)
      this.tf.push(freqs)
      totalLen += doc.tokens.length
      for (const term of freqs.keys()) this.df.set(term, (this.df.get(term) ?? 0) + 1)
    }
    this.avgdl = docs.length > 0 ? totalLen / docs.length : 0
  }

  private idf(term: string): number {
    const n = this.docs.length
    const df = this.df.get(term) ?? 0
    return Math.log(1 + (n - df + 0.5) / (df + 0.5))
  }

  search(queryTokens: string[], topK = 8): BM25Hit[] {
    const terms = [...new Set(queryTokens)]
    const hits: BM25Hit[] = []

    for (let i = 0; i < this.docs.length; i++) {
      const freqs = this.tf[i]!
      const dl = this.docs[i]!.tokens.length
      let score = 0
      for (const term of terms) {
        const f = freqs.get(term)
        if (!f) continue
        const denom = f + this.k1 * (1 - this.b + (this.b * dl) / (this.avgdl || 1))
        score += this.idf(term) * ((f * (this.k1 + 1)) / denom)
      }
      if (score > 0) hits.push({ id: this.docs[i]!.id, score })
    }

    hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    return hits.slice(0, topK)
  }

  /** Distinct query terms that appear in any document. Used for coverage-based abstention. */
  matchedTerms(queryTokens: string[]): number {
    let matched = 0
    for (const t of new Set(queryTokens)) if (this.df.has(t)) matched++
    return matched
  }
}
