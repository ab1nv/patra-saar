/**
 * DocumentParser
 *
 * Extracts raw text from PDF, DOCX, DOC, and TXT files in a
 * Cloudflare Workers-compatible way.
 *
 * Libraries used:
 *   - unpdf  : PDF extraction (pdfjs-dist, browser/Workers compatible)
 *   - mammoth: DOCX extraction (browser compatible)
 *
 * All public functions return {@link DocumentParseResult} or throw
 * {@link DocumentParseError} — never raw/untyped exceptions.
 */

import { extractText as unpdfExtractText } from 'unpdf'
import mammoth from 'mammoth'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Supported document formats. */
export type SupportedFormat = 'pdf' | 'docx' | 'doc' | 'txt'

/** Result returned by every parser. */
export interface DocumentParseResult {
  /** The extracted plain text, trimmed. */
  text: string
  /** Format that was parsed (echoes the input format string). */
  format: string
  /** Number of pages — only populated for PDFs. */
  pageCount?: number
  /** Non-fatal issues encountered during extraction. */
  warnings: string[]
}

/** Options forwarded to individual parsers. */
export interface ParseOptions {
  /** Maximum number of pages to read (PDF only). Defaults to unlimited. */
  maxPages?: number
}

// ─── Error class ──────────────────────────────────────────────────────────────

/**
 * Thrown whenever document parsing fails unrecoverably.
 * Wraps the original error in `cause` for full traceability.
 */
export class DocumentParseError extends Error {
  override readonly name = 'DocumentParseError'

  constructor(message: string, cause?: unknown) {
    super(message)
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip BOM characters and trim whitespace. */
function cleanText(raw: string): string {
  return (
    raw
      // Strip UTF-8 BOM (\uFEFF) and null bytes
      .replace(/^\uFEFF/, '')
      .replace(/\x00/g, ' ')
      .trim()
  )
}

/** Ensure buffer is non-empty before parsing. */
function assertNonEmpty(buffer: ArrayBuffer, format: string): void {
  if (buffer.byteLength === 0) {
    throw new DocumentParseError(`Cannot parse empty buffer as ${format}`)
  }
}

// ─── parseTxt ────────────────────────────────────────────────────────────────

/**
 * Decode a raw ArrayBuffer as UTF-8 text.
 *
 * Uses the `fatal: false` option so invalid byte sequences are replaced
 * with U+FFFD rather than throwing. A warning is emitted when replacement
 * characters are detected.
 */
export async function parseTxt(buffer: ArrayBuffer): Promise<DocumentParseResult> {
  const warnings: string[] = []

  if (buffer.byteLength === 0) {
    return { text: '', format: 'txt', warnings }
  }

  // Lenient decoder — never throws on bad bytes
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer)

  if (decoded.includes('\uFFFD')) {
    warnings.push('Input contained invalid UTF-8 sequences; replacement characters used.')
  }

  const text = cleanText(decoded)

  return { text, format: 'txt', warnings }
}

// ─── parsePdf ────────────────────────────────────────────────────────────────

/**
 * Extract plain text from a PDF ArrayBuffer using `unpdf`.
 *
 * `unpdf` bundles a stripped-down `pdfjs-dist` build that runs in any
 * JS environment including Cloudflare Workers (no Node.js fs APIs).
 *
 * @throws {DocumentParseError} when parsing fails or the PDF yields no text.
 */
export async function parsePdf(
  buffer: ArrayBuffer,
  options: ParseOptions = {},
): Promise<DocumentParseResult> {
  assertNonEmpty(buffer, 'PDF')

  const warnings: string[] = []

  let text: string
  let totalPages: number

  try {
    const uint8 = new Uint8Array(buffer)
    const result = await unpdfExtractText(uint8, {
      mergePages: true,
    })
    text = result.text
    totalPages = result.totalPages
  } catch (err) {
    throw new DocumentParseError(
      `Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`,
      err,
    )
  }

  const cleaned = cleanText(text)

  if (!cleaned) {
    throw new DocumentParseError(
      'Failed to parse PDF: no text could be extracted (document may be scanned or encrypted)',
    )
  }

  if (totalPages === 0) {
    warnings.push('PDF reported 0 pages — extraction may be incomplete.')
  }

  return {
    text: cleaned,
    format: 'pdf',
    pageCount: totalPages,
    warnings,
  }
}

// ─── parseDocx ───────────────────────────────────────────────────────────────

/**
 * Extract plain text from a DOCX (or DOC) ArrayBuffer using `mammoth`.
 *
 * Mammoth is browser-compatible and works in Cloudflare Workers.
 * We use `extractRawText` which strips all formatting — ideal for RAG.
 *
 * @throws {DocumentParseError} when parsing fails or the file yields no text.
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<DocumentParseResult> {
  assertNonEmpty(buffer, 'DOCX')

  let value: string
  let messages: Array<{ type: string; message: string }>

  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    value = result.value
    messages = result.messages as Array<{ type: string; message: string }>
  } catch (err) {
    throw new DocumentParseError(
      `Failed to parse DOCX: ${err instanceof Error ? err.message : String(err)}`,
      err,
    )
  }

  const cleaned = cleanText(value)

  if (!cleaned) {
    throw new DocumentParseError(
      'Failed to parse DOCX: no text could be extracted (file may be corrupted or empty)',
    )
  }

  const warnings = messages
    .filter((m) => m.type === 'warning' || m.type === 'error')
    .map((m) => m.message)

  return { text: cleaned, format: 'docx', warnings }
}

// ─── extractText (orchestrator) ───────────────────────────────────────────────

/**
 * Route a document buffer to the correct parser based on its format string.
 *
 * Supported formats (case-insensitive): pdf, docx, doc, txt
 *
 * @throws {DocumentParseError} for unsupported formats or parser failures.
 */
export async function extractText(
  buffer: ArrayBuffer,
  format: string,
  options: ParseOptions = {},
): Promise<DocumentParseResult> {
  const fmt = format.toLowerCase()

  let result: DocumentParseResult

  switch (fmt) {
    case 'txt':
      result = await parseTxt(buffer)
      break

    case 'pdf':
      result = await parsePdf(buffer, options)
      break

    case 'docx':
    case 'doc':
      result = await parseDocx(buffer)
      break

    default:
      throw new DocumentParseError(
        `Unsupported document format: "${format}". Supported formats are: pdf, docx, doc, txt`,
      )
  }

  // Preserve the original format string (not the lowercased one) so callers
  // can match it back to their input.
  return { ...result, format }
}
