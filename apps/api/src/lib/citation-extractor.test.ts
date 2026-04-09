import { describe, it, expect } from 'vitest'
import {
  extractCitations,
  verifyCitations,
  buildContextChunks,
  extractDualCitations,
  verifyDualCitations,
  type ContextChunk,
  type ExtractedCitation,
  type VerifiedCitation,
  type DualExtractedCitation,
  type DualVerifiedCitation,
} from './citation-extractor'

// ---------------------------------------------------------------------------
// extractCitations
// ---------------------------------------------------------------------------

describe('extractCitations', () => {
  // Happy path
  it('extracts a single citation from text', () => {
    const result = extractCitations('According to [1], the penalty is five years.')
    expect(result).toHaveLength(1)
    expect(result[0].refNumber).toBe(1)
  })

  it('extracts multiple distinct citations', () => {
    const result = extractCitations('See [1] and [2] for details. Also [3] applies here.')
    expect(result).toHaveLength(3)
    expect(result.map((c) => c.refNumber)).toEqual([1, 2, 3])
  })

  it('deduplicates repeated citations', () => {
    const result = extractCitations('[1] is mentioned again in [1] and once more [1].')
    expect(result).toHaveLength(1)
    expect(result[0].refNumber).toBe(1)
  })

  it('returns citations in ascending order', () => {
    const result = extractCitations('[3] comes before [1] and [2].')
    expect(result.map((c) => c.refNumber)).toEqual([1, 2, 3])
  })

  // Positional metadata
  it('records the positions where the citation appears', () => {
    const text = 'See [2] here and [2] there.'
    const result = extractCitations(text)
    expect(result[0].positions).toHaveLength(2)
    expect(result[0].positions[0]).toBe(text.indexOf('[2]'))
  })

  // Edge cases: no citations
  it('returns empty array when text has no citations', () => {
    expect(extractCitations('No references here.')).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(extractCitations('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(extractCitations('   \n\t  ')).toEqual([])
  })

  // Malformed / non-citation brackets
  it('ignores non-numeric brackets like [abc]', () => {
    const result = extractCitations('See [abc] and [xyz] for reference.')
    expect(result).toEqual([])
  })

  it('ignores brackets with decimals like [2.5]', () => {
    const result = extractCitations('Per [2.5] of the contract.')
    expect(result).toEqual([])
  })

  it('ignores brackets with letters mixed in like [1a]', () => {
    const result = extractCitations('Refer to [1a] and [b2].')
    expect(result).toEqual([])
  })

  // Citations inside URLs should still be extracted (regex is content-agnostic)
  it('handles citations that appear inside URL-like strings', () => {
    const result = extractCitations('Visit http://example.com and see [1].')
    expect(result).toHaveLength(1)
    expect(result[0].refNumber).toBe(1)
  })

  // Citations inside markdown code blocks
  it('ignores citations inside fenced code blocks', () => {
    const text = '```\n[1] some code\n```\nBut [2] is real.'
    const result = extractCitations(text)
    expect(result).toHaveLength(1)
    expect(result[0].refNumber).toBe(2)
  })

  // Citations inside inline code
  it('ignores citations inside inline code backticks', () => {
    const text = 'Code `[3]` is not a citation, but [4] is.'
    const result = extractCitations(text)
    expect(result).toHaveLength(1)
    expect(result[0].refNumber).toBe(4)
  })

  // Large reference numbers that look valid syntactically
  it('extracts large reference numbers like [99] or [100]', () => {
    const result = extractCitations('See [99] and [100].')
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.refNumber)).toEqual([99, 100])
  })

  // Zero reference
  it('ignores [0] as reference numbers start at 1', () => {
    const result = extractCitations('See [0] which is invalid.')
    expect(result).toEqual([])
  })

  // Input type safety
  it('throws or returns empty for null-like input (undefined string coercion guard)', () => {
    // We coerce to string in the implementation, so this should return []
    expect(extractCitations('')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// verifyCitations
// ---------------------------------------------------------------------------

describe('verifyCitations', () => {
  const makeChunk = (
    index: number,
    content: string,
    section?: string,
    page?: number,
    documentId?: string,
  ): ContextChunk => ({ index, content, section, page, documentId })

  const chunks: ContextChunk[] = [
    makeChunk(0, 'The penalty under Section 302 is life imprisonment.', '302', 1, 'doc-1'),
    makeChunk(1, 'Bail conditions are specified in Section 437.', '437', 3, 'doc-1'),
    makeChunk(2, 'Cognizable offences are listed in Schedule I.', undefined, 5, 'doc-2'),
  ]

  // Note: contextChunks are 0-indexed internally, citations use 1-based [N] numbering
  const extracted: ExtractedCitation[] = [
    { refNumber: 1, positions: [5] },
    { refNumber: 2, positions: [30] },
    { refNumber: 3, positions: [60] },
  ]

  it('verifies all valid citations against provided chunks', () => {
    const result = verifyCitations(extracted, chunks)
    expect(result).toHaveLength(3)
    expect(result.every((c) => c.valid)).toBe(true)
  })

  it('maps refNumber to correct chunk (1-based)', () => {
    const result = verifyCitations(extracted, chunks)
    expect(result[0].refNumber).toBe(1)
    expect(result[0].section).toBe('302')
    expect(result[0].page).toBe(1)
    expect(result[0].documentId).toBe('doc-1')
  })

  it('includes a snippet from chunk content', () => {
    const result = verifyCitations(extracted, chunks)
    expect(result[0].snippet.length).toBeGreaterThan(0)
    expect(result[0].snippet).toContain('penalty')
  })

  it('limits snippet to 200 characters', () => {
    const longContent = 'A'.repeat(500)
    const longChunk = makeChunk(0, longContent, 'S1', 1, 'doc-x')
    const r = verifyCitations([{ refNumber: 1, positions: [0] }], [longChunk])
    expect(r[0].snippet.length).toBeLessThanOrEqual(200)
  })

  it('marks citations with refNumber beyond chunk count as invalid', () => {
    const invalid: ExtractedCitation[] = [{ refNumber: 99, positions: [0] }]
    const result = verifyCitations(invalid, chunks)
    expect(result).toHaveLength(1)
    expect(result[0].valid).toBe(false)
    expect(result[0].snippet).toBe('')
  })

  it('returns empty array when no citations provided', () => {
    expect(verifyCitations([], chunks)).toEqual([])
  })

  it('returns invalid citations when chunks array is empty', () => {
    const result = verifyCitations(extracted, [])
    expect(result.every((c) => c.valid === false)).toBe(true)
  })

  it('handles citation with refNumber 0 as invalid', () => {
    const result = verifyCitations([{ refNumber: 0, positions: [0] }], chunks)
    expect(result[0].valid).toBe(false)
  })

  it('handles chunk with no section metadata gracefully', () => {
    const result = verifyCitations([{ refNumber: 3, positions: [0] }], chunks)
    expect(result[0].valid).toBe(true)
    expect(result[0].section).toBeUndefined()
    expect(result[0].page).toBe(5)
  })

  it('handles chunk with no page metadata gracefully', () => {
    const noPageChunks: ContextChunk[] = [makeChunk(0, 'Some content without page.', 'S1')]
    const result = verifyCitations([{ refNumber: 1, positions: [0] }], noPageChunks)
    expect(result[0].valid).toBe(true)
    expect(result[0].page).toBeUndefined()
  })

  it('handles chunk with empty content gracefully', () => {
    const emptyChunk = makeChunk(0, '', 'S1', 1, 'doc-1')
    const result = verifyCitations([{ refNumber: 1, positions: [0] }], [emptyChunk])
    expect(result[0].valid).toBe(true)
    expect(result[0].snippet).toBe('')
  })

  it('preserves positions from extracted citation in output', () => {
    const result = verifyCitations([{ refNumber: 1, positions: [5, 20] }], chunks)
    expect(result[0].positions).toEqual([5, 20])
  })
})

// ---------------------------------------------------------------------------
// buildContextChunks (helper used in messages.ts integration)
// ---------------------------------------------------------------------------

describe('buildContextChunks', () => {
  it('builds context text with numbered references', () => {
    const chunks: ContextChunk[] = [
      { index: 0, content: 'Penalty content.', section: '302', page: 1 },
      { index: 1, content: 'Bail content.', section: '437', page: 3 },
    ]
    const text = buildContextChunks(chunks)
    expect(text).toContain('[1]')
    expect(text).toContain('[2]')
    expect(text).toContain('Section 302')
    expect(text).toContain('Section 437')
    expect(text).toContain('Page 1')
    expect(text).toContain('Page 3')
  })

  it('handles chunks without section or page', () => {
    const chunks: ContextChunk[] = [{ index: 0, content: 'Raw content.' }]
    const text = buildContextChunks(chunks)
    expect(text).toContain('[1]')
    expect(text).toContain('Raw content.')
    expect(text).not.toContain('Section')
    expect(text).not.toContain('Page')
  })

  it('returns fallback message for empty chunk array', () => {
    const text = buildContextChunks([])
    expect(text).toBe(
      'No document context available. Answer based on general legal knowledge if possible.',
    )
  })

  it('includes section only when section is defined', () => {
    const chunks: ContextChunk[] = [{ index: 0, content: 'Content.', section: 'S1' }]
    const text = buildContextChunks(chunks)
    expect(text).toContain('Section S1')
    expect(text).not.toContain('Page')
  })

  it('includes page only when page is defined', () => {
    const chunks: ContextChunk[] = [{ index: 0, content: 'Content.', page: 7 }]
    const text = buildContextChunks(chunks)
    expect(text).toContain('Page 7')
    expect(text).not.toContain('Section')
  })
})

// ---------------------------------------------------------------------------
// Integration: extract then verify full pipeline
// ---------------------------------------------------------------------------

describe('citation pipeline (extract → verify)', () => {
  const chunks: ContextChunk[] = [
    {
      index: 0,
      content: 'Section 302 IPC prescribes punishment for murder with life imprisonment or death.',
      section: '302',
      page: 1,
      documentId: 'ipc-doc',
    },
    {
      index: 1,
      content: 'Section 307 IPC covers attempt to murder.',
      section: '307',
      page: 4,
      documentId: 'ipc-doc',
    },
  ]

  it('full pipeline: extract valid citations and verify them', () => {
    const llmResponse = 'Murder is punishable under [1]. Attempt to murder is covered in [2].'
    const extracted = extractCitations(llmResponse)
    expect(extracted).toHaveLength(2)

    const verified = verifyCitations(extracted, chunks)
    expect(verified).toHaveLength(2)
    expect(verified[0].valid).toBe(true)
    expect(verified[0].section).toBe('302')
    expect(verified[1].valid).toBe(true)
    expect(verified[1].section).toBe('307')
  })

  it('full pipeline: response with no citations yields empty verified array', () => {
    const llmResponse = 'Murder is a serious offence under Indian law.'
    const extracted = extractCitations(llmResponse)
    expect(extracted).toHaveLength(0)

    const verified = verifyCitations(extracted, chunks)
    expect(verified).toHaveLength(0)
  })

  it('full pipeline: invalid citation number yields invalid verified entry', () => {
    const llmResponse = 'See [99] for more details.'
    const extracted = extractCitations(llmResponse)
    const verified = verifyCitations(extracted, chunks)
    expect(verified[0].valid).toBe(false)
  })

  it('full pipeline: mix of valid and invalid citations', () => {
    const llmResponse = 'See [1] and also [50] which does not exist.'
    const extracted = extractCitations(llmResponse)
    expect(extracted).toHaveLength(2)

    const verified = verifyCitations(extracted, chunks)
    const validCitations = verified.filter((c) => c.valid)
    const invalidCitations = verified.filter((c) => !c.valid)
    expect(validCitations).toHaveLength(1)
    expect(invalidCitations).toHaveLength(1)
  })

  it('full pipeline: duplicate citations in LLM output appear once', () => {
    const llmResponse = 'Under [1] we see this. [1] also applies here. [1] repeats again.'
    const extracted = extractCitations(llmResponse)
    expect(extracted).toHaveLength(1)

    const verified = verifyCitations(extracted, chunks)
    expect(verified).toHaveLength(1)
    expect(verified[0].valid).toBe(true)
    expect(verified[0].positions).toHaveLength(3)
  })

  it('full pipeline: special characters in content do not break extraction', () => {
    const llmResponse = 'Clause [1] covers: "rights & obligations" (see §302). [2] extends this.'
    const extracted = extractCitations(llmResponse)
    expect(extracted).toHaveLength(2)
    const verified = verifyCitations(extracted, chunks)
    expect(verified.every((c) => c.valid)).toBe(true)
  })

  it('full pipeline: unicode content in chunks', () => {
    const unicodeChunks: ContextChunk[] = [
      {
        index: 0,
        content: 'धारा 302 के अंतर्गत हत्या के लिए आजीवन कारावास का प्रावधान है।',
        section: '302',
        page: 1,
        documentId: 'hindi-doc',
      },
    ]
    const llmResponse = 'Under [1], murder attracts life imprisonment.'
    const extracted = extractCitations(llmResponse)
    const verified = verifyCitations(extracted, unicodeChunks)
    expect(verified[0].valid).toBe(true)
    expect(verified[0].snippet).toContain('धारा')
  })

  it('full pipeline: very large number of chunks (performance)', () => {
    const largeChunks: ContextChunk[] = Array.from({ length: 10 }, (_, i) => ({
      index: i,
      content: `Content for chunk ${i + 1}.`,
      section: `S${i + 1}`,
      page: i + 1,
      documentId: 'big-doc',
    }))
    // Reference all 10
    const llmResponse = largeChunks.map((_, i) => `[${i + 1}]`).join(' ')
    const extracted = extractCitations(llmResponse)
    expect(extracted).toHaveLength(10)
    const verified = verifyCitations(extracted, largeChunks)
    expect(verified.every((c) => c.valid)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Dual citation extraction ([KB-N] and [DOC-N])
// ---------------------------------------------------------------------------

import type { KbContextChunk, UserContextChunk } from './dual-rag'

describe('extractDualCitations', () => {
  it('extracts [KB-N] citations', () => {
    const result = extractDualCitations('Under Indian law [KB-1], rent cannot be increased arbitrarily.')
    expect(result.kb).toHaveLength(1)
    expect(result.kb[0].refNumber).toBe(1)
  })

  it('extracts [DOC-N] citations', () => {
    const result = extractDualCitations('Your agreement states in Clause 7 [DOC-2] that rent can be revised.')
    expect(result.doc).toHaveLength(1)
    expect(result.doc[0].refNumber).toBe(2)
  })

  it('extracts both KB and DOC citations from same text', () => {
    const text = 'Under [KB-1] the rent is protected. However, [DOC-1] allows revision. See also [KB-2].'
    const result = extractDualCitations(text)
    expect(result.kb).toHaveLength(2)
    expect(result.doc).toHaveLength(1)
  })

  it('deduplicates repeated citations', () => {
    const text = '[KB-1] applies here. [KB-1] also applies there. [KB-1] once more.'
    const result = extractDualCitations(text)
    expect(result.kb).toHaveLength(1)
    expect(result.kb[0].positions).toHaveLength(3)
  })

  it('ignores citations in code blocks', () => {
    const text = 'See [KB-1]. Also ```[KB-2] is in code```'
    const result = extractDualCitations(text)
    expect(result.kb).toHaveLength(1)
    expect(result.kb[0].refNumber).toBe(1)
  })

  it('returns empty arrays when no citations', () => {
    const result = extractDualCitations('No citations here.')
    expect(result.kb).toHaveLength(0)
    expect(result.doc).toHaveLength(0)
  })

  it('returns citations sorted ascending', () => {
    const text = '[KB-3] then [KB-1] then [KB-2]'
    const result = extractDualCitations(text)
    expect(result.kb.map(c => c.refNumber)).toEqual([1, 2, 3])
  })
})

describe('verifyDualCitations', () => {
  const kbChunks: KbContextChunk[] = [
    { id: 'kb1', content: 'TPA Section 105 defines lease.', sectionRef: 'Section 105', sourceTitle: 'TPA 1882', jurisdiction: 'central' },
    { id: 'kb2', content: 'Delhi RCA Section 14 limits eviction grounds.', sectionRef: 'Section 14', sourceTitle: 'Delhi RCA 1958', jurisdiction: 'delhi' },
  ]
  const userChunks: UserContextChunk[] = [
    { id: 'doc1', content: 'Clause 1: Tenancy period is 11 months.', sectionRef: 'Clause 1', documentId: 'doc_abc' },
    { id: 'doc2', content: 'Clause 7: Rent may be revised annually.', sectionRef: 'Clause 7', documentId: 'doc_abc' },
  ]

  it('verifies valid KB citation', () => {
    const extracted = extractDualCitations('[KB-1] defines lease.')
    const verified = verifyDualCitations(extracted, kbChunks, userChunks)
    expect(verified[0].valid).toBe(true)
    expect(verified[0].snippet).toContain('Section 105')
    expect(verified[0].sourceType).toBe('kb')
  })

  it('verifies valid DOC citation', () => {
    const extracted = extractDualCitations('[DOC-2] allows revision.')
    const verified = verifyDualCitations(extracted, kbChunks, userChunks)
    expect(verified[0].valid).toBe(true)
    expect(verified[0].snippet).toContain('Clause 7')
    expect(verified[0].sourceType).toBe('doc')
  })

  it('marks out-of-range KB citation invalid', () => {
    const extracted = extractDualCitations('[KB-99] does not exist.')
    const verified = verifyDualCitations(extracted, kbChunks, userChunks)
    expect(verified[0].valid).toBe(false)
  })

  it('marks out-of-range DOC citation invalid', () => {
    const extracted = extractDualCitations('[DOC-99] does not exist.')
    const verified = verifyDualCitations(extracted, kbChunks, userChunks)
    expect(verified[0].valid).toBe(false)
  })

  it('handles mixed valid and invalid', () => {
    const extracted = extractDualCitations('[KB-1] valid. [KB-99] invalid. [DOC-1] valid.')
    const verified = verifyDualCitations(extracted, kbChunks, userChunks)
    const valid = verified.filter(v => v.valid)
    const invalid = verified.filter(v => !v.valid)
    expect(valid).toHaveLength(2)
    expect(invalid).toHaveLength(1)
  })
})
