import { describe, it, expect } from 'vitest'
import { BM25 } from '@/lib/corpus/bm25'

const docs = [
  { id: 'a', tokens: ['murder', 'punishment', 'death', 'life'] },
  { id: 'b', tokens: ['cheating', 'property', 'dishonestly'] },
  { id: 'c', tokens: ['contract', 'agreement', 'consideration'] },
]

describe('BM25', () => {
  it('ranks the known-correct document first', () => {
    const index = new BM25(docs)
    const hits = index.search(['punishment', 'murder'])
    expect(hits[0]?.id).toBe('a')
  })

  it('is deterministic across calls', () => {
    const index = new BM25(docs)
    const a = index.search(['cheating', 'property'])
    const b = index.search(['cheating', 'property'])
    expect(a).toEqual(b)
  })

  it('returns no hits for unknown terms', () => {
    const index = new BM25(docs)
    expect(index.search(['gst', 'textiles'])).toHaveLength(0)
  })

  it('caps results at topK and sorts by descending score', () => {
    const index = new BM25(docs)
    const hits = index.search(['murder', 'property', 'contract'], 2)
    expect(hits).toHaveLength(2)
    expect(hits[0]!.score).toBeGreaterThanOrEqual(hits[1]!.score)
  })
})
