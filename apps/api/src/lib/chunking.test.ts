import { describe, it, expect } from 'vitest'
import { chunkText, extractSectionMetadata } from './chunking'

describe('chunkText', () => {
  it('returns at least one chunk for any non-empty text', () => {
    const result = chunkText('Hello world')
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0].content).toBe('Hello world')
  })

  it('splits by section boundaries', () => {
    const text = 'Section 1 Introduction to the act.\nSection 2 Definitions and scope.'
    const result = chunkText(text)
    expect(result.length).toBe(2)
    expect(result[0].metadata.section).toBe('1')
    expect(result[1].metadata.section).toBe('2')
  })

  it('splits by article boundaries', () => {
    const text = 'Article 14 Equality before law.\nArticle 21 Protection of life.'
    const result = chunkText(text)
    expect(result.length).toBe(2)
    expect(result[0].metadata.section).toBe('Article 14')
  })

  it('splits by clause boundaries', () => {
    const text = 'Clause 1 Party agrees to terms.\nClause 2 Payment schedule.'
    const result = chunkText(text)
    expect(result.length).toBe(2)
    expect(result[0].metadata.section).toBe('Clause 1')
  })

  it('chunks long sections with overlap', () => {
    const longText = 'Section 1 ' + Array(200).fill('This is a sentence about legal matters.').join(' ')
    const result = chunkText(longText)
    expect(result.length).toBeGreaterThan(1)
    expect(result[0].metadata.section).toBe('1')
  })

  it('falls back to sliding window for text without section markers', () => {
    const plainText = Array(200).fill('Legal text without section markers.').join(' ')
    const result = chunkText(plainText)
    expect(result.length).toBeGreaterThan(1)
    for (let i = 0; i < result.length; i++) {
      expect(result[i].index).toBe(i)
    }
  })

  it('assigns unique IDs to every chunk', () => {
    const text = 'Section 1 First.\nSection 2 Second.\nSection 3 Third.'
    const result = chunkText(text)
    const ids = result.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('chunks are indexed sequentially starting from 0', () => {
    const text = 'Section 1 First.\nSection 2 Second.\nSection 3 Third.'
    const result = chunkText(text)
    result.forEach((chunk, i) => {
      expect(chunk.index).toBe(i)
    })
  })

  it('no chunk exceeds the limit by too much', () => {
    const longText = Array(500).fill('Legal clause text.').join(' ')
    const result = chunkText(longText)
    for (const chunk of result) {
      // Allow some slack for sentence splitting
      expect(chunk.content.length).toBeLessThan(1700)
    }
  })
})

describe('extractSectionMetadata', () => {
  it('extracts section number', () => {
    expect(extractSectionMetadata('Section 420 of IPC')).toEqual({ section: '420' })
  })

  it('extracts article number', () => {
    expect(extractSectionMetadata('Article 14 of Constitution')).toEqual({ section: 'Article 14' })
  })

  it('extracts clause number', () => {
    expect(extractSectionMetadata('Clause 5.2 states that')).toEqual({ section: 'Clause 5.2' })
  })

  it('returns empty object for text without markers', () => {
    expect(extractSectionMetadata('Just some regular text')).toEqual({})
  })
})
