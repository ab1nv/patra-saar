import type { Env } from '../../types/bindings'

/**
 * Extracts plain text from a PDF binary.
 * Uses a lightweight approach suitable for Workers runtime.
 *
 * TODO: Integrate pdf-parse or a Workers-compatible PDF parser.
 * For now, this is a placeholder that returns empty text.
 */
export async function extractText(_pdfBytes: ArrayBuffer): Promise<string> {
  // Workers runtime doesn't support Node.js native modules,
  // so we need a WASM-based or pure-JS PDF parser here.
  throw new Error('PDF text extraction not yet implemented')
}
