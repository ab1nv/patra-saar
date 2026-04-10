#!/usr/bin/env tsx
/**
 * Standalone CLI tool to pre-index Indian legal statutes (PDFs)
 * into the 'legal-corpus' Vectorize namespace.
 *
 * Usage:
 *   export CLOUDFLARE_ACCOUNT_ID=...
 *   export CLOUDFLARE_API_TOKEN=...
 *   pnpm ingest-legal-corpus --data-dir ./legal-data
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { getDocumentProxy, extractText } from 'unpdf'

// Configuration from environment
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const INDEX_NAME = 'patrasaar-legal-corpus' // From wrangler.toml
const MODEL_ID = '@cf/baai/bge-base-en-v1.5'

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set.')
  process.exit(1)
}

async function main() {
  const dataDir = getArg('--data-dir') || './legal-data'

  console.log(`\nPatraSaar Legal Corpus Ingestion Engine`)
  console.log(`Target Index: ${INDEX_NAME}`)
  console.log('─'.repeat(50))

  try {
    const files = await readdir(dataDir)
    const pdfFiles = files.filter((f) => f.toLowerCase().endsWith('.pdf'))

    if (pdfFiles.length === 0) {
      console.log('No PDF files found in data directory.')
      return
    }

    for (const file of pdfFiles) {
      const filePath = join(dataDir, file)
      console.log(`\n[Processing] ${file}...`)

      const buffer = await readFile(filePath)
      const pdf = await getDocumentProxy(new Uint8Array(buffer))
      const { text } = await extractText(pdf)
      const fullText = text.join('\n')

      console.log(`  → Extracted ${fullText.length} characters.`)

      // Chunking logic (Recursive Character Splitting)
      const chunks = chunkText(fullText, 1000, 200)
      console.log(`  → Created ${chunks.length} chunks.`)

      // Process in batches of 50 for embedding and indexing
      const batchSize = 25 // Cloudflare AI limits are strict
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        process.stdout.write(
          `  → Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}... `,
        )

        try {
          // 1. Get Embeddings
          const embeddings = await getEmbeddings(batch)

          // 2. Insert into Vectorize
          await insertVectors(file, i, batch, embeddings)

          console.log('Done.')
        } catch (err: any) {
          console.log(`\n    FAILED: ${err.message}`)
          // Continue to next batch
        }
      }
    }
  } catch (err: any) {
    console.error(`Fatal Error: ${err.message}`)
    process.exit(1)
  }

  console.log('\n─'.repeat(50))
  console.log('Ingestion complete.\n')
}

/** Simple recursive-like chunking helper */
function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + size
    if (end > text.length) end = text.length

    chunks.push(text.substring(start, end).trim())
    start = end - overlap
  }

  return chunks.filter((c) => c.length > 50) // Filter out tiny fragments
}

/** Call Cloudflare Workers AI for embeddings */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts }),
    },
  )

  const data: any = await response.json()
  if (!data.success) {
    throw new Error(`AI API failed: ${JSON.stringify(data.errors)}`)
  }

  return data.result.data
}

/** Insert vectors into Vectorize using NDJSON format */
async function insertVectors(
  fileName: string,
  offset: number,
  texts: string[],
  vectors: number[][],
) {
  const fileId = fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()

  // Format as NDJSON
  const ndjson = texts
    .map((text, i) =>
      JSON.stringify({
        id: `${fileId}:${offset + i}`,
        values: vectors[i],
        metadata: {
          source: 'legal-corpus',
          fileName,
          text: text.substring(0, 500), // Store a snippet for preview
        },
      }),
    )
    .join('\n')

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v2/indexes/${INDEX_NAME}/insert`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjson,
    },
  )

  const data: any = await response.json()
  if (!data.success) {
    throw new Error(`Vectorize API failed: ${JSON.stringify(data.errors)}`)
  }
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

main().catch(console.error)
