/**
 * DocumentParser — TDD test suite
 *
 * Step 1.1: Interface + PDF extraction tests (RED phase)
 * Step 1.3: DOCX extraction tests
 * Step 1.5: TextExtractor orchestrator tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Types under test ────────────────────────────────────────────────────────
import type { DocumentParseResult, ParseOptions } from './document-parser'
import {
  parsePdf,
  parseDocx,
  parseTxt,
  extractText,
  DocumentParseError,
} from './document-parser'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal ArrayBuffer from a string (UTF-8). */
function textToBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer
}

/** Minimal valid PDF header bytes (not a real PDF — used to test rejection). */
function fakePdfBuffer(body = ''): ArrayBuffer {
  return textToBuffer(`%PDF-1.4\n${body}`)
}

// ─── parseTxt ────────────────────────────────────────────────────────────────

describe('parseTxt', () => {
  it('decodes UTF-8 text correctly', async () => {
    const buf = textToBuffer('Hello, legal world!')
    const result = await parseTxt(buf)
    expect(result.text).toBe('Hello, legal world!')
    expect(result.pageCount).toBeUndefined()
    expect(result.warnings).toEqual([])
  })

  it('handles BOM-prefixed UTF-8', async () => {
    // BOM = \xEF\xBB\xBF
    const bom = new Uint8Array([0xef, 0xbb, 0xbf])
    const body = new TextEncoder().encode('Legal text after BOM')
    const combined = new Uint8Array(bom.length + body.length)
    combined.set(bom, 0)
    combined.set(body, bom.length)
    const result = await parseTxt(combined.buffer as ArrayBuffer)
    expect(result.text).toBe('Legal text after BOM')
  })

  it('returns empty text for empty buffer', async () => {
    const result = await parseTxt(new ArrayBuffer(0))
    expect(result.text).toBe('')
    expect(result.warnings).toEqual([])
  })

  it('handles null bytes by stripping them', async () => {
    const buf = textToBuffer('legal\x00text\x00here')
    const result = await parseTxt(buf)
    expect(result.text).not.toContain('\x00')
    expect(result.text.replace(/\s+/g, '')).toBe('legaltexthere')
  })

  it('handles latin-1 / non-UTF-8 bytes gracefully without throwing', async () => {
    // 0x80-0x9F are invalid in strict UTF-8
    const latin1 = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x80, 0x90])
    const result = await parseTxt(latin1.buffer as ArrayBuffer)
    // Must not throw; text may contain replacement chars
    expect(typeof result.text).toBe('string')
    expect(result.warnings.length).toBeGreaterThanOrEqual(0)
  })

  it('trims leading/trailing whitespace', async () => {
    const result = await parseTxt(textToBuffer('  \n  Legal content  \n  '))
    expect(result.text).toBe('Legal content')
  })

  it('preserves internal newlines', async () => {
    const result = await parseTxt(textToBuffer('Line one\nLine two\nLine three'))
    expect(result.text).toContain('\n')
    expect(result.text.split('\n')).toHaveLength(3)
  })
})

// ─── parsePdf ────────────────────────────────────────────────────────────────

// We mock 'unpdf' so tests don't need the actual wasm bundle.
vi.mock('unpdf', () => ({
  extractText: vi.fn(),
  getResolvedPDFJS: vi.fn(),
}))

import * as unpdf from 'unpdf'

describe('parsePdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns extracted text and page count on success', async () => {
    vi.mocked(unpdf.extractText).mockResolvedValue({
      text: 'Section 1 This is a test PDF.',
      totalPages: 3,
    } as any)

    const result = await parsePdf(fakePdfBuffer())
    expect(result.text).toBe('Section 1 This is a test PDF.')
    expect(result.pageCount).toBe(3)
    expect(result.warnings).toEqual([])
  })

  it('passes the buffer to unpdf.extractText', async () => {
    vi.mocked(unpdf.extractText).mockResolvedValue({ text: 'ok', totalPages: 1 } as any)
    const buf = fakePdfBuffer('some content')
    await parsePdf(buf)
    expect(unpdf.extractText).toHaveBeenCalledWith(expect.any(Uint8Array), expect.anything())
  })

  it('trims whitespace from extracted text', async () => {
    vi.mocked(unpdf.extractText).mockResolvedValue({
      text: '   Article 5 Rights.\n\n   ',
      totalPages: 1,
    } as any)
    const result = await parsePdf(fakePdfBuffer())
    expect(result.text).toBe('Article 5 Rights.')
  })

  it('throws DocumentParseError on empty buffer', async () => {
    await expect(parsePdf(new ArrayBuffer(0))).rejects.toThrow(DocumentParseError)
  })

  it('throws DocumentParseError when unpdf returns empty text', async () => {
    vi.mocked(unpdf.extractText).mockResolvedValue({ text: '   ', totalPages: 1 } as any)
    await expect(parsePdf(fakePdfBuffer())).rejects.toThrow(DocumentParseError)
    await expect(parsePdf(fakePdfBuffer())).rejects.toThrow(/no text/i)
  })

  it('throws DocumentParseError when unpdf throws', async () => {
    vi.mocked(unpdf.extractText).mockRejectedValue(new Error('PDF is encrypted'))
    await expect(parsePdf(fakePdfBuffer())).rejects.toThrow(DocumentParseError)
    await expect(parsePdf(fakePdfBuffer())).rejects.toThrow(/failed to parse pdf/i)
  })

  it('wraps unknown errors from unpdf', async () => {
    vi.mocked(unpdf.extractText).mockRejectedValue('raw string error')
    await expect(parsePdf(fakePdfBuffer())).rejects.toThrow(DocumentParseError)
  })

  it('adds a warning when page count is 0', async () => {
    vi.mocked(unpdf.extractText).mockResolvedValue({
      text: 'Some extracted text',
      totalPages: 0,
    } as any)
    const result = await parsePdf(fakePdfBuffer())
    expect(result.warnings.some((w) => /page/i.test(w))).toBe(true)
  })
})

// ─── parseDocx ───────────────────────────────────────────────────────────────

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}))

import mammoth from 'mammoth'

describe('parseDocx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns extracted text on success', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'Clause 3 Payment terms apply.',
      messages: [],
    } as any)

    const result = await parseDocx(textToBuffer('fake docx bytes'))
    expect(result.text).toBe('Clause 3 Payment terms apply.')
    expect(result.warnings).toEqual([])
  })

  it('passes ArrayBuffer to mammoth', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: 'text', messages: [] } as any)
    const buf = textToBuffer('docx content')
    await parseDocx(buf)
    expect(mammoth.extractRawText).toHaveBeenCalledWith({ arrayBuffer: buf })
  })

  it('trims whitespace from extracted text', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: '\n\n  Legal clause text.  \n\n',
      messages: [],
    } as any)
    const result = await parseDocx(textToBuffer('x'))
    expect(result.text).toBe('Legal clause text.')
  })

  it('collects mammoth messages as warnings', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'Some text',
      messages: [
        { type: 'warning', message: 'Unrecognised element' },
        { type: 'warning', message: 'Unknown relationship type' },
      ],
    } as any)
    const result = await parseDocx(textToBuffer('x'))
    expect(result.warnings).toHaveLength(2)
    expect(result.warnings[0]).toContain('Unrecognised element')
  })

  it('throws DocumentParseError on empty buffer', async () => {
    await expect(parseDocx(new ArrayBuffer(0))).rejects.toThrow(DocumentParseError)
  })

  it('throws DocumentParseError when mammoth returns empty text', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: '   ', messages: [] } as any)
    await expect(parseDocx(textToBuffer('x'))).rejects.toThrow(DocumentParseError)
    await expect(parseDocx(textToBuffer('x'))).rejects.toThrow(/no text/i)
  })

  it('throws DocumentParseError when mammoth throws', async () => {
    vi.mocked(mammoth.extractRawText).mockRejectedValue(new Error('Not a valid docx'))
    await expect(parseDocx(textToBuffer('x'))).rejects.toThrow(DocumentParseError)
    await expect(parseDocx(textToBuffer('x'))).rejects.toThrow(/failed to parse docx/i)
  })
})

// ─── extractText (orchestrator) ───────────────────────────────────────────────

describe('extractText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes "txt" to parseTxt', async () => {
    const result = await extractText(textToBuffer('plain text content'), 'txt')
    expect(result.text).toBe('plain text content')
    expect(result.format).toBe('txt')
  })

  it('routes "pdf" to parsePdf', async () => {
    vi.mocked(unpdf.extractText).mockResolvedValue({
      text: 'PDF content',
      totalPages: 2,
    } as any)
    const result = await extractText(fakePdfBuffer(), 'pdf')
    expect(result.text).toBe('PDF content')
    expect(result.format).toBe('pdf')
    expect(result.pageCount).toBe(2)
  })

  it('routes "docx" to parseDocx', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'DOCX content',
      messages: [],
    } as any)
    const result = await extractText(textToBuffer('x'), 'docx')
    expect(result.text).toBe('DOCX content')
    expect(result.format).toBe('docx')
  })

  it('routes "doc" as alias for "docx"', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'DOC content',
      messages: [],
    } as any)
    const result = await extractText(textToBuffer('x'), 'doc')
    expect(result.format).toBe('doc')
    expect(result.text).toBe('DOC content')
  })

  it('throws DocumentParseError for unsupported format', async () => {
    await expect(extractText(textToBuffer('x'), 'xls' as any)).rejects.toThrow(DocumentParseError)
    await expect(extractText(textToBuffer('x'), 'xls' as any)).rejects.toThrow(/unsupported/i)
  })

  it('propagates DocumentParseError from sub-parsers', async () => {
    vi.mocked(unpdf.extractText).mockRejectedValue(new Error('corrupt'))
    await expect(extractText(fakePdfBuffer(), 'pdf')).rejects.toThrow(DocumentParseError)
  })

  it('includes format in the result', async () => {
    const result = await extractText(textToBuffer('hello'), 'txt')
    expect(result).toHaveProperty('format', 'txt')
  })

  it('normalises format to lowercase before routing', async () => {
    vi.mocked(unpdf.extractText).mockResolvedValue({ text: 'ok', totalPages: 1 } as any)
    // Upper-case input should still work
    const result = await extractText(fakePdfBuffer(), 'PDF' as any)
    expect(result.format).toBe('PDF')
    expect(result.text).toBe('ok')
  })

  it('returns warnings array always', async () => {
    const result = await extractText(textToBuffer('text'), 'txt')
    expect(Array.isArray(result.warnings)).toBe(true)
  })
})

// ─── DocumentParseError ───────────────────────────────────────────────────────

describe('DocumentParseError', () => {
  it('is an instance of Error', () => {
    const err = new DocumentParseError('something went wrong')
    expect(err).toBeInstanceOf(Error)
  })

  it('has correct name', () => {
    const err = new DocumentParseError('x')
    expect(err.name).toBe('DocumentParseError')
  })

  it('preserves the original cause', () => {
    const cause = new Error('original')
    const err = new DocumentParseError('wrapped', cause)
    expect(err.cause).toBe(cause)
  })

  it('works without a cause', () => {
    const err = new DocumentParseError('solo error')
    expect(err.cause).toBeUndefined()
  })
})
