import { describe, it, expect } from 'vitest'
import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { cleanLegalText, readSourceFile } from './reader'

// ---------------------------------------------------------------------------
// cleanLegalText — pure function
// ---------------------------------------------------------------------------

describe('cleanLegalText', () => {
  it('removes leading/trailing whitespace', () => {
    expect(cleanLegalText('  hello  ')).toBe('hello')
  })

  it('normalizes multiple blank lines to single blank line', () => {
    const input = 'Section 1\n\n\n\nSection 2'
    const result = cleanLegalText(input)
    expect(result).toContain('Section 1')
    expect(result).toContain('Section 2')
    expect(result).not.toMatch(/\n{3,}/)
  })

  it('removes page numbers like "Page 1 of 30"', () => {
    const input = 'Section 105.\nPage 1 of 30\nA lease of immoveable property'
    const result = cleanLegalText(input)
    expect(result).not.toContain('Page 1 of 30')
    expect(result).toContain('Section 105')
  })

  it('removes standalone numbers that are page artifacts', () => {
    const input = 'Section 105.\n\n12\n\nA lease of immoveable property'
    const result = cleanLegalText(input)
    const lines = result.split('\n').filter((l) => l.trim() !== '')
    expect(lines.every((l) => !/^\d+$/.test(l.trim()))).toBe(true)
  })

  it('preserves section numbers within text', () => {
    const input = 'Section 105. Lease defined.— A lease of immoveable property is a transfer'
    const result = cleanLegalText(input)
    expect(result).toContain('Section 105')
  })

  it('normalizes Windows line endings to Unix', () => {
    const input = 'line one\r\nline two\r\nline three'
    const result = cleanLegalText(input)
    expect(result).not.toContain('\r')
  })

  it('removes header/footer patterns like "THE GAZETTE OF INDIA"', () => {
    const input = 'THE GAZETTE OF INDIA\nSECTION 1\nSection 105. Lease defined'
    const result = cleanLegalText(input)
    expect(result).not.toContain('THE GAZETTE OF INDIA')
  })
})

// ---------------------------------------------------------------------------
// readSourceFile — uses actual temp files to avoid ESM mocking issues
// ---------------------------------------------------------------------------

describe('readSourceFile', () => {
  it('reads and cleans a text file', () => {
    const tmpFile = path.join(os.tmpdir(), `test-reader-${Date.now()}.txt`)
    fs.writeFileSync(tmpFile, '  Section 105. Lease defined.\n\nPage 1 of 30\n\nA lease is a transfer.  ')
    try {
      const result = readSourceFile(tmpFile)
      expect(result).toContain('Section 105')
      expect(result).not.toContain('Page 1 of 30')
    } finally {
      fs.unlinkSync(tmpFile)
    }
  })

  it('throws on missing file', () => {
    expect(() => readSourceFile('/nonexistent-patrasaar-test.txt')).toThrow()
  })

  it('decodes UTF-8 correctly', () => {
    const tmpFile = path.join(os.tmpdir(), `test-reader-utf8-${Date.now()}.txt`)
    const text = 'धारा 105. पट्टा परिभाषित।'
    fs.writeFileSync(tmpFile, text, 'utf-8')
    try {
      const result = readSourceFile(tmpFile)
      expect(result).toContain('धारा')
    } finally {
      fs.unlinkSync(tmpFile)
    }
  })
})
