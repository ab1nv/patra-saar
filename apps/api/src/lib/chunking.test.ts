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

  // --- Phase 1: Page number tracking ---

  it('tracks page numbers using form-feed character', () => {
    const text = 'Section 1 Page one content.\fSection 2 Page two content.'
    const result = chunkText(text)
    expect(result.length).toBe(2)
    expect(result[0].metadata.page).toBe(1)
    expect(result[1].metadata.page).toBe(2)
  })

  it('tracks page numbers using --- Page N --- markers', () => {
    const text = 'Section 1 First page.\n--- Page 2 ---\nSection 2 Second page.'
    const result = chunkText(text)
    expect(result.length).toBe(2)
    expect(result[0].metadata.page).toBe(1)
    expect(result[1].metadata.page).toBe(2)
  })

  it('tracks page numbers using lowercase page marker', () => {
    const text = 'Section 1 First page.\npage 2\nSection 2 Second page.'
    const result = chunkText(text)
    expect(result.length).toBe(2)
    expect(result[0].metadata.page).toBe(1)
    expect(result[1].metadata.page).toBe(2)
  })

  it('tracks page numbers using standalone digit page markers', () => {
    const text = 'Section 1 First page content.\n3\nSection 2 Third page content.'
    const result = chunkText(text)
    expect(result.length).toBe(2)
    expect(result[0].metadata.page).toBe(1)
    expect(result[1].metadata.page).toBe(3)
  })

  it('sets page to 1 for document with no page markers', () => {
    const text = 'Section 1 No page markers here.\nSection 2 Also no page markers.'
    const result = chunkText(text)
    expect(result.length).toBe(2)
    result.forEach((chunk) => {
      expect(chunk.metadata.page).toBe(1)
    })
  })

  it('page number undefined when text has no sections and no page markers (fallback path)', () => {
    const plainText = 'Just some plain text without any markers or sections.'
    const result = chunkText(plainText)
    expect(result.length).toBeGreaterThanOrEqual(1)
    // Fallback sliding window chunks should still get page 1
    expect(result[0].metadata.page).toBe(1)
  })

  it('increments page number across multiple page breaks', () => {
    const text = 'Section 1 Content.\f\f\fSection 2 Content.'
    const result = chunkText(text)
    // Three form feeds means page 4 by the time Section 2 starts
    expect(result[1].metadata.page).toBe(4)
  })

  // --- Phase 1: Full section title capture ---

  it('captures full section title including description text', () => {
    const text =
      'Section 420 - Cheating and Dishonestly Inducing Delivery of Property\nWhoever cheats and thereby dishonestly induces the person deceived.'
    const result = chunkText(text)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0].metadata.sectionTitle).toContain('Section 420')
    expect(result[0].metadata.sectionTitle).toContain('Cheating')
  })

  it('captures full article title', () => {
    const text =
      'Article 21 - Protection of Life and Personal Liberty\nNo person shall be deprived of his life.'
    const result = chunkText(text)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0].metadata.sectionTitle).toContain('Article 21')
    expect(result[0].metadata.sectionTitle).toContain('Protection of Life')
  })

  it('captures full clause title', () => {
    const text =
      'Clause 5 - Payment Obligations of the Party\nThe party shall pay within thirty days.'
    const result = chunkText(text)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0].metadata.sectionTitle).toContain('Clause 5')
    expect(result[0].metadata.sectionTitle).toContain('Payment Obligations')
  })

  it('sectionTitle is undefined when text has no section markers', () => {
    const plainText = 'Just some plain text without any section markers at all.'
    const result = chunkText(plainText)
    expect(result.length).toBeGreaterThanOrEqual(1)
    result.forEach((chunk) => {
      expect(chunk.metadata.sectionTitle).toBeUndefined()
    })
  })

  it('handles document with both page breaks and sections correctly', () => {
    const text = [
      'Section 1 Introduction',
      'This is the introduction section content.',
      '\f',
      'Section 2 - Rights and Obligations',
      'This section describes rights.',
      '\n--- Page 3 ---\n',
      'Section 3 - Penalties and Enforcement',
      'This section covers penalties.',
    ].join('\n')

    const result = chunkText(text)
    expect(result.length).toBeGreaterThanOrEqual(3)

    const section1 = result.find((c) => c.content.includes('introduction'))
    const section2 = result.find((c) => c.content.includes('rights'))
    const section3 = result.find((c) => c.content.includes('penalties') || c.content.includes('Penalties'))

    expect(section1?.metadata.page).toBe(1)
    expect(section2?.metadata.page).toBe(2)
    if (section3) {
      expect(section3.metadata.page).toBe(3)
    }
  })

  it('normalizes whitespace in captured section titles', () => {
    const text = 'Section 10   -   Multiple   Spaces   In   Title\nContent here.'
    const result = chunkText(text)
    expect(result[0].metadata.sectionTitle).toBeDefined()
    // Should not contain multiple consecutive spaces
    expect(result[0].metadata.sectionTitle).not.toMatch(/\s{2,}/)
  })

  it('trims leading and trailing whitespace from section titles', () => {
    const text = '   Section 7 - Rights of the Applicant   \nContent follows.'
    const result = chunkText(text)
    expect(result[0].metadata.sectionTitle).toBeDefined()
    const title = result[0].metadata.sectionTitle as string
    expect(title).toBe(title.trim())
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

describe('extractSectionTitle', () => {
  it('is exported from chunking module', async () => {
    const module = await import('./chunking')
    expect(typeof module.extractSectionTitle).toBe('function')
  })

  it('extracts the first line as section title for section-headed text', async () => {
    const { extractSectionTitle } = await import('./chunking')
    const text = 'Section 420 - Cheating and Dishonestly Inducing Delivery of Property\nContent follows here.'
    const title = extractSectionTitle(text)
    expect(title).toBe('Section 420 - Cheating and Dishonestly Inducing Delivery of Property')
  })

  it('returns undefined for text not starting with a recognized heading', async () => {
    const { extractSectionTitle } = await import('./chunking')
    const text = 'Some regular paragraph text without a heading.'
    const title = extractSectionTitle(text)
    expect(title).toBeUndefined()
  })

  it('normalizes whitespace in the returned title', async () => {
    const { extractSectionTitle } = await import('./chunking')
    const text = 'Section 5   -   Multiple   Spaces\nContent.'
    const title = extractSectionTitle(text)
    expect(title).toBeDefined()
    expect(title).not.toMatch(/\s{2,}/)
  })
})

describe('trackPageNumber', () => {
  it('is exported from chunking module', async () => {
    const module = await import('./chunking')
    expect(typeof module.trackPageNumber).toBe('function')
  })

  it('returns current page when no page marker found', async () => {
    const { trackPageNumber } = await import('./chunking')
    expect(trackPageNumber('Regular text', 1)).toBe(1)
  })

  it('increments page on form-feed', async () => {
    const { trackPageNumber } = await import('./chunking')
    expect(trackPageNumber('\f', 1)).toBe(2)
  })

  it('increments page on --- Page N --- marker', async () => {
    const { trackPageNumber } = await import('./chunking')
    expect(trackPageNumber('\n--- Page 5 ---\n', 1)).toBe(5)
  })

  it('increments page count for multiple form feeds', async () => {
    const { trackPageNumber } = await import('./chunking')
    expect(trackPageNumber('\f\f\f', 1)).toBe(4)
  })

  it('extracts explicit page number from Page N marker', async () => {
    const { trackPageNumber } = await import('./chunking')
    expect(trackPageNumber('\nPage 10\n', 1)).toBe(10)
  })

  it('returns updated count for standalone digit marker', async () => {
    const { trackPageNumber } = await import('./chunking')
    expect(trackPageNumber('\n7\n', 1)).toBe(7)
  })
})
