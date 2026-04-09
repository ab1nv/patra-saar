import * as fs from 'node:fs'

const HEADER_FOOTER_PATTERNS = [
  /^THE GAZETTE OF INDIA.*$/gim,
  /^MINISTRY OF .+$/gim,
  /^GOVERNMENT OF .+$/gim,
  /^\[PART II—SEC\. \d\].*$/gim,
  /^Registered No\. .+$/gim,
]

/**
 * Cleans raw legal text scraped from government sources.
 * Removes page numbers, headers/footers, and normalizes whitespace.
 */
export function cleanLegalText(raw: string): string {
  let text = raw

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Remove known header/footer patterns
  for (const pattern of HEADER_FOOTER_PATTERNS) {
    text = text.replace(pattern, '')
  }

  // Remove "Page N of M" patterns
  text = text.replace(/^Page\s+\d+\s+of\s+\d+\s*$/gim, '')

  // Remove standalone page number lines (single number on a line, possibly surrounded by whitespace)
  text = text.replace(/^\s*\d{1,4}\s*$/gm, '')

  // Normalize multiple consecutive blank lines to a single blank line
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

/**
 * Reads a UTF-8 legal text source file and returns the cleaned text.
 */
export function readSourceFile(filePath: string): string {
  const raw = fs.readFileSync(filePath)
  const text = raw.toString('utf-8')
  return cleanLegalText(text)
}
