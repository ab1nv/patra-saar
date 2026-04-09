#!/usr/bin/env node
/**
 * PatraSaar KB Ingestion CLI
 *
 * Usage:
 *   npm run ingest -- --category rental-tenancy --file sources/rental-tenancy/tpa.txt \
 *                     --title "Transfer of Property Act, 1882" --type central_act --year 1882
 *
 *   npm run ingest -- --category rental-tenancy --all
 *   npm run ingest -- --category rental-tenancy --all --dry-run
 *   npm run ingest -- --category rental-tenancy --file sources/rental-tenancy/tpa.txt --replace
 *
 * Required env vars:
 *   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID
 */

import * as path from 'node:path'
import { readSourceFile } from './reader'
import { chunkLegalText } from './chunker'
import { generateEmbeddings } from './embedder'
import { ensureCategory, uploadSource } from './uploader'
import { CATEGORIES } from './config'
import type { SourceConfig } from './config'

const args = process.argv.slice(2)

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : undefined
}

function hasFlag(flag: string): boolean {
  return args.includes(flag)
}

async function ingestSource(
  categoryId: string,
  categorySlug: string,
  source: SourceConfig,
  sourcesDir: string,
  dryRun: boolean,
): Promise<void> {
  const filePath = path.join(sourcesDir, source.filename)
  console.log(`\nIngesting: ${source.title}`)
  console.log(`  File: ${filePath}`)

  console.log('  Reading and cleaning...')
  const text = readSourceFile(filePath)
  console.log(`  Text length: ${text.length} chars`)

  console.log('  Chunking...')
  const chunks = chunkLegalText(text)
  console.log(`  Chunks: ${chunks.length}`)

  if (dryRun) {
    console.log(`  [dry-run] Skipping embed + upload`)
    await uploadSource(categoryId, categorySlug, source, chunks, [], { dryRun: true })
    return
  }

  console.log('  Generating embeddings...')
  const embedResults = await generateEmbeddings(chunks.map((c) => c.content))

  console.log('  Uploading to D1 + Vectorize...')
  const sourceId = await uploadSource(categoryId, categorySlug, source, chunks, embedResults)
  console.log(`  Done. Source ID: ${sourceId}`)
}

async function main(): Promise<void> {
  const categorySlug = getArg('--category')
  const filename = getArg('--file')
  const dryRun = hasFlag('--dry-run')
  const ingestAll = hasFlag('--all')

  if (!categorySlug) {
    console.error('Error: --category is required')
    process.exit(1)
  }

  const category = CATEGORIES.find((c) => c.slug === categorySlug)
  if (!category) {
    console.error(`Error: Unknown category "${categorySlug}". Available: ${CATEGORIES.map((c) => c.slug).join(', ')}`)
    process.exit(1)
  }

  const sourcesDir = path.join(process.cwd(), 'sources', categorySlug)

  console.log(`\nPatraSaar KB Ingestion`)
  console.log(`Category: ${category.name}`)
  console.log(`Dry run: ${dryRun}`)

  // Ensure category row exists in D1
  await ensureCategory(category, { dryRun })

  if (ingestAll) {
    console.log(`\nIngesting all ${category.sources.length} sources...`)
    for (const source of category.sources) {
      await ingestSource(category.id, category.slug, source, sourcesDir, dryRun)
    }
    console.log('\n✓ All sources ingested.')
    return
  }

  if (filename) {
    const basename = path.basename(filename)
    const source = category.sources.find((s) => s.filename === basename)
    if (!source) {
      // Allow one-off ingest with explicit metadata
      const title = getArg('--title')
      const type = getArg('--type') as SourceConfig['sourceType'] | undefined
      const year = getArg('--year')
      if (!title || !type || !year) {
        console.error('Error: When using --file with an unlisted source, provide --title, --type, and --year')
        process.exit(1)
      }
      const oneOff: SourceConfig = {
        filename: basename,
        title,
        sourceType: type,
        jurisdiction: getArg('--jurisdiction') ?? 'central',
        year: parseInt(year, 10),
      }
      await ingestSource(category.id, category.slug, oneOff, path.dirname(filename), dryRun)
    } else {
      await ingestSource(category.id, category.slug, source, sourcesDir, dryRun)
    }
    console.log('\n✓ Done.')
    return
  }

  console.error('Error: provide --file <path> or --all')
  process.exit(1)
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
