import { describe, it, expect } from 'vitest'
import { chunkDocument } from '../../src/services/rag/chunker'

describe('chunkDocument', () => {
  it('splits long text into chunks under 512 tokens', () => {
    const text = 'This is a test paragraph with some legal content.\n\n'.repeat(100)
    const chunks = chunkDocument(text, 'doc-1')

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.tokenCount <= 520)).toBe(true)
  })

  it('preserves documentId and increments chunkIndex sequentially', () => {
    const text = 'Word '.repeat(1000)
    const chunks = chunkDocument(text, 'doc-abc')

    chunks.forEach((c, i) => {
      expect(c.documentId).toBe('doc-abc')
      expect(c.chunkIndex).toBe(i)
    })
  })

  it('tracks page numbers from [PAGE_BREAK] markers', () => {
    const text =
      'Page 1 content.\n\n[PAGE_BREAK]\n\nPage 2 content.\n\n[PAGE_BREAK]\n\nPage 3 content.'
    const chunks = chunkDocument(text, 'doc-pages')

    // Last chunk should be on page 3
    const lastChunk = chunks[chunks.length - 1]
    expect(lastChunk.pageNumber).toBe(3)
  })

  it('handles empty text', () => {
    const chunks = chunkDocument('', 'doc-empty')
    expect(chunks).toHaveLength(0)
  })

  it('sets source to user-doc', () => {
    const chunks = chunkDocument('Some text content.', 'doc-src')
    expect(chunks.every((c) => c.source === 'user-doc')).toBe(true)
  })
})
