import { describe, it, expect } from 'vitest'
import { chunkLegalText, KB_CHUNK_MAX_CHARS, KB_OVERLAP_CHARS } from './chunker'

describe('chunkLegalText', () => {
  it('splits text by section boundaries', () => {
    const text = `Section 105. Lease defined.—
A lease of immoveable property is a transfer of a right to enjoy such property, made for a certain time.

Section 106. Duration of certain leases in absence of written contract or local usage.—
In the absence of a contract or local law or usage to the contrary, a lease of immoveable property for agricultural or manufacturing purposes shall be deemed to be a lease from year to year.`

    const chunks = chunkLegalText(text)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks[0].content).toContain('Section 105')
    expect(chunks[1].content).toContain('Section 106')
  })

  it('keeps each chunk under KB_CHUNK_MAX_CHARS', () => {
    const longSection = 'Section 1. ' + 'A'.repeat(KB_CHUNK_MAX_CHARS * 3)
    const chunks = chunkLegalText(longSection)
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(KB_CHUNK_MAX_CHARS + 50) // small buffer for word boundary
    }
  })

  it('extracts section_ref metadata for each chunk', () => {
    const text = 'Section 105. Lease defined.— A lease of immoveable property is a transfer of a right to enjoy such property.'
    const chunks = chunkLegalText(text)
    expect(chunks[0].sectionRef).toMatch(/105/)
  })

  it('returns empty array for empty input', () => {
    expect(chunkLegalText('')).toEqual([])
    expect(chunkLegalText('   ')).toEqual([])
  })

  it('each chunk has a unique id', () => {
    const text = `Section 1. First section text.

Section 2. Second section text.

Section 3. Third section text.`
    const chunks = chunkLegalText(text)
    const ids = chunks.map((c) => c.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('assigns sequential chunk_index', () => {
    const text = `Section 1. First.

Section 2. Second.

Section 3. Third.`
    const chunks = chunkLegalText(text)
    chunks.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i)
    })
  })

  it('uses fallback sliding window when no section markers present', () => {
    const text = 'This is plain text without any section markers. '.repeat(50)
    const chunks = chunkLegalText(text)
    expect(chunks.length).toBeGreaterThan(0)
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0)
    }
  })
})

describe('KB_CHUNK_MAX_CHARS', () => {
  it('is approximately 512 tokens (roughly 2000 chars)', () => {
    // ~4 chars per token, 512 tokens ≈ 2048 chars
    expect(KB_CHUNK_MAX_CHARS).toBeGreaterThanOrEqual(1500)
    expect(KB_CHUNK_MAX_CHARS).toBeLessThanOrEqual(2500)
  })
})
