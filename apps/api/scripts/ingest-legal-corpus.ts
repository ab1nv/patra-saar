#!/usr/bin/env tsx
/**
 * Standalone CLI tool to pre-index Indian legal statutes and case law
 * into the legal-corpus Vectorize namespace.
 *
 * Usage:
 *   pnpm --filter api run ingest-legal-corpus --data-dir ./legal-data
 *   pnpm --filter api run ingest-legal-corpus --data-dir ./legal-data --env production
 *
 * Expected data directory structure:
 *   legal-data/
 *   ├── statutes/
 *   │   ├── ipc-1860.json     { name, source, sections: [{ number, title, text, bnsSection? }] }
 *   │   └── ...
 *   └── judgements/
 *       ├── sc/               Supreme Court plain text files
 *       └── hc/               High Court plain text files
 *
 * This script runs outside the Workers runtime (via tsx), so it uses
 * the Wrangler API client to interact with Cloudflare resources.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

interface LegalSection {
  number: string
  title: string
  text: string
  bnsSection?: string
}

interface LegalAct {
  name: string
  source: string
  bnsEquivalent?: string
  sections: LegalSection[]
}

async function main() {
  const dataDir = getArg('--data-dir')
  if (!dataDir) {
    console.error('Usage: ingest-legal-corpus --data-dir <path>')
    process.exit(1)
  }

  console.log(`\nPatraSaar Legal Corpus Ingestion`)
  console.log(`Data directory: ${dataDir}`)
  console.log('─'.repeat(50))

  // Process statutes
  const statutesDir = join(dataDir, 'statutes')
  try {
    const files = await readdir(statutesDir)
    const jsonFiles = files.filter((f: string) => extname(f) === '.json')

    for (const file of jsonFiles) {
      const content = await readFile(join(statutesDir, file), 'utf-8')
      const act: LegalAct = JSON.parse(content)
      console.log(`\n[Statute] ${act.name} — ${act.sections.length} sections`)

      // TODO: Chunk each section, embed via Workers AI, insert into Vectorize
      // This requires Wrangler Unstable API or direct Cloudflare REST calls
      console.log(`  → Indexing not yet connected to Cloudflare APIs`)
    }
  } catch {
    console.log('No statutes directory found, skipping.')
  }

  // Process judgements
  const judgementsDir = join(dataDir, 'judgements')
  try {
    const courts = await readdir(judgementsDir)
    for (const court of courts) {
      const courtDir = join(judgementsDir, court)
      const files = await readdir(courtDir)
      console.log(`\n[Judgements] ${court.toUpperCase()} — ${files.length} files`)

      // TODO: Read each judgement, chunk, embed, insert
      console.log(`  → Indexing not yet connected to Cloudflare APIs`)
    }
  } catch {
    console.log('No judgements directory found, skipping.')
  }

  console.log('\n─'.repeat(50))
  console.log('Ingestion complete (dry run — Cloudflare API integration pending).\n')
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

main().catch(console.error)
