import { describe, it, expect } from 'vitest'
import {
  computeRrfScore,
  mergeRrfResults,
  extractCitationNumbers,
  type RankedResult,
} from './rag'

// ---------------------------------------------------------------------------
// computeRrfScore
// ---------------------------------------------------------------------------

describe('computeRrfScore', () => {
  it('returns a positive score for valid ranks', () => {
    expect(computeRrfScore(1, 1)).toBeGreaterThan(0)
    expect(computeRrfScore(10, 5)).toBeGreaterThan(0)
  })

  it('uses k=60 by default (both ranks = 1 gives 2/61)', () => {
    // rrf(1, 1) = 1/(60+1) + 1/(60+1) = 2/61 ≈ 0.032786...
    expect(computeRrfScore(1, 1)).toBeCloseTo(2 / 61, 5)
  })

  it('lower ranks (closer to 1) yield higher scores', () => {
    expect(computeRrfScore(1, 1)).toBeGreaterThan(computeRrfScore(5, 5))
    expect(computeRrfScore(2, 3)).toBeGreaterThan(computeRrfScore(10, 10))
  })

  it('handles missing fts rank (Infinity) correctly — only vector contributes', () => {
    // If only found by vector (ftsRank = Infinity), score = 1/(60+vectorRank)
    expect(computeRrfScore(1, Infinity)).toBeCloseTo(1 / 61, 5)
  })

  it('handles missing vector rank (Infinity) correctly — only fts contributes', () => {
    expect(computeRrfScore(Infinity, 1)).toBeCloseTo(1 / 61, 5)
  })

  it('returns 0 when both ranks are Infinity', () => {
    expect(computeRrfScore(Infinity, Infinity)).toBe(0)
  })

  it('handles large rank numbers without errors', () => {
    expect(computeRrfScore(1000, 1000)).toBeGreaterThan(0)
    expect(computeRrfScore(1000, 1000)).toBeLessThan(computeRrfScore(1, 1))
  })

  it('single-source scores are always less than dual-source scores for same rank', () => {
    // Having both sources at rank 5 should score higher than only one
    expect(computeRrfScore(5, 5)).toBeGreaterThan(computeRrfScore(5, Infinity))
    expect(computeRrfScore(5, 5)).toBeGreaterThan(computeRrfScore(Infinity, 5))
  })
})

// ---------------------------------------------------------------------------
// mergeRrfResults
// ---------------------------------------------------------------------------

const makeChunk = (
  chunkId: string,
  overrides: Partial<Omit<RankedResult, 'chunkId' | 'score'>> = {},
) => ({
  chunkId,
  content: `Content of chunk ${chunkId}`,
  documentId: 'doc-1',
  ...overrides,
})

describe('mergeRrfResults', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(mergeRrfResults([], [])).toEqual([])
  })

  it('returns results from vector side only when fts is empty', () => {
    const vector = [makeChunk('a'), makeChunk('b')]
    const result = mergeRrfResults(vector, [])
    expect(result.map((r) => r.chunkId)).toContain('a')
    expect(result.map((r) => r.chunkId)).toContain('b')
  })

  it('returns results from fts side only when vector is empty', () => {
    const fts = [makeChunk('a'), makeChunk('b')]
    const result = mergeRrfResults([], fts)
    expect(result.map((r) => r.chunkId)).toContain('a')
    expect(result.map((r) => r.chunkId)).toContain('b')
  })

  it('deduplicates results by chunkId', () => {
    const vector = [makeChunk('a'), makeChunk('b')]
    const fts = [makeChunk('a'), makeChunk('c')]
    const result = mergeRrfResults(vector, fts)
    const ids = result.map((r) => r.chunkId)
    expect(new Set(ids).size).toBe(ids.length)
    // 'a' appears in both but should only show once
    expect(ids.filter((id) => id === 'a').length).toBe(1)
  })

  it('assigns combined RRF score when chunk appears in both result sets', () => {
    const vector = [makeChunk('a')]
    const fts = [makeChunk('a')]
    const result = mergeRrfResults(vector, fts)
    const chunk = result.find((r) => r.chunkId === 'a')!
    // Rank 1 in both → 2/61
    expect(chunk.score).toBeCloseTo(2 / 61, 5)
  })

  it('assigns partial RRF score when chunk appears in only vector results', () => {
    const vector = [makeChunk('only-vec')]
    const fts = [makeChunk('other')]
    const result = mergeRrfResults(vector, fts)
    const chunk = result.find((r) => r.chunkId === 'only-vec')!
    // rank 1 in vector, Infinity in fts → 1/61
    expect(chunk.score).toBeCloseTo(1 / 61, 5)
  })

  it('assigns partial RRF score when chunk appears in only fts results', () => {
    const vector = [makeChunk('other')]
    const fts = [makeChunk('only-fts')]
    const result = mergeRrfResults(vector, fts)
    const chunk = result.find((r) => r.chunkId === 'only-fts')!
    // rank 1 in fts, Infinity in vector → 1/61
    expect(chunk.score).toBeCloseTo(1 / 61, 5)
  })

  it('sorts results by RRF score descending', () => {
    // chunk 'top' ranks #1 in both, 'mid' ranks lower, 'low' ranks last
    const vector = [makeChunk('top'), makeChunk('mid'), makeChunk('low')]
    const fts = [makeChunk('top'), makeChunk('low')]
    const result = mergeRrfResults(vector, fts)
    // 'top' is in both at rank 1 → highest
    expect(result[0].chunkId).toBe('top')
    // All scores should be non-increasing
    for (let i = 1; i < result.length; i++) {
      expect(result[i].score).toBeLessThanOrEqual(result[i - 1].score)
    }
  })

  it('limits to topN results (default 15)', () => {
    const vector = Array.from({ length: 20 }, (_, i) => makeChunk(`v${i}`))
    const fts = Array.from({ length: 20 }, (_, i) => makeChunk(`f${i}`))
    const result = mergeRrfResults(vector, fts)
    expect(result.length).toBeLessThanOrEqual(15)
  })

  it('respects custom topN parameter', () => {
    const vector = Array.from({ length: 10 }, (_, i) => makeChunk(`v${i}`))
    const fts = Array.from({ length: 10 }, (_, i) => makeChunk(`f${i}`))
    const result = mergeRrfResults(vector, fts, 5)
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('preserves chunk content and documentId in merged results', () => {
    const vector = [{ chunkId: 'x', content: 'hello world', documentId: 'doc-42' }]
    const result = mergeRrfResults(vector, [])
    expect(result[0].content).toBe('hello world')
    expect(result[0].documentId).toBe('doc-42')
  })

  it('preserves optional fields (sectionTitle, pageNumber, documentFilename)', () => {
    const vector = [
      {
        chunkId: 'rich',
        content: 'some content',
        documentId: 'doc-1',
        sectionTitle: 'Section 5',
        pageNumber: 3,
        documentFilename: 'contract.pdf',
      },
    ]
    const result = mergeRrfResults(vector, [])
    expect(result[0].sectionTitle).toBe('Section 5')
    expect(result[0].pageNumber).toBe(3)
    expect(result[0].documentFilename).toBe('contract.pdf')
  })

  it('chunk appearing in both sets ranks higher than chunk in only one set', () => {
    const vector = [makeChunk('both'), makeChunk('vec-only')]
    const fts = [makeChunk('both'), makeChunk('fts-only')]
    const result = mergeRrfResults(vector, fts)
    const bothScore = result.find((r) => r.chunkId === 'both')!.score
    const vecOnlyScore = result.find((r) => r.chunkId === 'vec-only')!.score
    const ftsOnlyScore = result.find((r) => r.chunkId === 'fts-only')!.score
    expect(bothScore).toBeGreaterThan(vecOnlyScore)
    expect(bothScore).toBeGreaterThan(ftsOnlyScore)
  })
})

// ---------------------------------------------------------------------------
// extractCitationNumbers
// ---------------------------------------------------------------------------

describe('extractCitationNumbers', () => {
  it('extracts single citation [1]', () => {
    expect(extractCitationNumbers('See [1] for details.')).toEqual([1])
  })

  it('extracts multiple citations [1] [2] [3]', () => {
    expect(extractCitationNumbers('As stated in [1] and [2] and [3].')).toEqual([1, 2, 3])
  })

  it('returns empty array when no citations present', () => {
    expect(extractCitationNumbers('No citations here.')).toEqual([])
    expect(extractCitationNumbers('')).toEqual([])
  })

  it('deduplicates repeated citations', () => {
    expect(extractCitationNumbers('[1] first mention and [1] second mention.')).toEqual([1])
  })

  it('ignores malformed patterns like [abc]', () => {
    expect(extractCitationNumbers('See [abc] and [xyz] and [1].')).toEqual([1])
  })

  it('handles consecutive citations like [1][2][3]', () => {
    expect(extractCitationNumbers('[1][2][3]')).toEqual([1, 2, 3])
  })

  it('returns sorted array of citation numbers', () => {
    expect(extractCitationNumbers('[3] then [1] then [2]')).toEqual([1, 2, 3])
  })

  it('handles large citation numbers', () => {
    expect(extractCitationNumbers('Reference [42] and [100].')).toEqual([42, 100])
  })

  it('ignores empty brackets []', () => {
    expect(extractCitationNumbers('Empty [] brackets.')).toEqual([])
  })

  it('ignores brackets with only whitespace', () => {
    expect(extractCitationNumbers('Whitespace [ ] brackets.')).toEqual([])
  })

  it('handles citations at the very start and end of text', () => {
    expect(extractCitationNumbers('[1] start and end [2]')).toEqual([1, 2])
  })

  it('handles text with no brackets at all', () => {
    expect(extractCitationNumbers('Plain text without any special characters.')).toEqual([])
  })
})
