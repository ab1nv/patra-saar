import { getDocumentProxy, extractText as unpdfExtractText } from 'unpdf'

/**
 * Extracts plain text from a PDF binary.
 * Uses 'unpdf' which is edge-compatible (works in Cloudflare Workers).
 */
export async function extractText(pdfBytes: ArrayBuffer): Promise<string> {
  // getDocumentProxy handles Uint8Array/ArrayBuffer
  const pdf = await getDocumentProxy(new Uint8Array(pdfBytes))

  // Extract text results in an array of strings (one per page or text block)
  const { text } = await unpdfExtractText(pdf)

  // Join with newlines to preserve some structure
  return text.join('\n')
}
