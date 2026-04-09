/**
 * Uploads KB data to Cloudflare D1 (kb_sources, kb_chunks) and Vectorize.
 *
 * Requires environment variables:
 *   CLOUDFLARE_API_TOKEN  — API token
 *   CLOUDFLARE_ACCOUNT_ID — Cloudflare account ID
 *   D1_DATABASE_ID        — D1 database UUID
 *   VECTORIZE_INDEX_NAME  — Vectorize index name (default: patrasaar-docs)
 */

import { nanoid } from 'nanoid'
import type { KbChunk } from './chunker'
import type { EmbedResult } from './embedder'
import type { SourceConfig, CategoryConfig } from './config'

const CF_BASE = 'https://api.cloudflare.com/client/v4/accounts'
const VECTORIZE_INDEX = process.env.VECTORIZE_INDEX_NAME ?? 'patrasaar-docs'
const VECTORIZE_BATCH_SIZE = 100

function getEnv(): { apiToken: string; accountId: string; d1DatabaseId: string } {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const d1DatabaseId = process.env.D1_DATABASE_ID
  if (!apiToken) throw new Error('CLOUDFLARE_API_TOKEN env var is required')
  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID env var is required')
  if (!d1DatabaseId) throw new Error('D1_DATABASE_ID env var is required')
  return { apiToken, accountId, d1DatabaseId }
}

async function d1Query(
  sql: string,
  params: (string | number | null)[],
  apiToken: string,
  accountId: string,
  d1DatabaseId: string,
): Promise<void> {
  const url = `${CF_BASE}/${accountId}/d1/database/${d1DatabaseId}/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`D1 API error ${res.status}: ${body}`)
  }
}

async function vectorizeUpsert(
  vectors: Array<{ id: string; values: number[]; metadata: Record<string, string> }>,
  apiToken: string,
  accountId: string,
): Promise<void> {
  const url = `${CF_BASE}/${accountId}/vectorize/v2/indexes/${VECTORIZE_INDEX}/upsert`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/x-ndjson',
    },
    body: vectors.map((v) => JSON.stringify(v)).join('\n'),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Vectorize API error ${res.status}: ${body}`)
  }
}

export interface UploadOptions {
  dryRun?: boolean
}

/**
 * Upserts category row in D1.
 */
export async function ensureCategory(category: CategoryConfig, opts: UploadOptions = {}): Promise<void> {
  if (opts.dryRun) {
    console.log(`[dry-run] Would upsert category: ${category.slug}`)
    return
  }
  const { apiToken, accountId, d1DatabaseId } = getEnv()
  await d1Query(
    `INSERT INTO kb_categories (id, slug, name, description, is_active)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description`,
    [category.id, category.slug, category.name, category.description],
    apiToken, accountId, d1DatabaseId,
  )
}

/**
 * Uploads a single source and its chunks + vectors to D1 and Vectorize.
 */
export async function uploadSource(
  categoryId: string,
  categorySlug: string,
  source: SourceConfig,
  chunks: KbChunk[],
  embedResults: EmbedResult[],
  opts: UploadOptions = {},
): Promise<string> {
  const sourceId = `src_${nanoid(10)}`

  if (opts.dryRun) {
    console.log(`[dry-run] Would insert source: ${source.title} (${chunks.length} chunks)`)
    return sourceId
  }

  const { apiToken, accountId, d1DatabaseId } = getEnv()

  // Insert kb_sources row
  await d1Query(
    `INSERT INTO kb_sources (id, category_id, title, source_type, jurisdiction, year, filename, chunk_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [sourceId, categoryId, source.title, source.sourceType, source.jurisdiction, source.year, source.filename, chunks.length],
    apiToken, accountId, d1DatabaseId,
  )

  // Insert kb_chunks rows
  for (const chunk of chunks) {
    await d1Query(
      `INSERT INTO kb_chunks (id, source_id, category_id, chunk_index, content, section_ref, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [chunk.id, sourceId, categoryId, chunk.chunkIndex, chunk.content, chunk.sectionRef ?? null, null],
      apiToken, accountId, d1DatabaseId,
    )
  }

  // Upsert Vectorize vectors in batches
  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embedResults[i].embedding,
    metadata: {
      type: 'kb',
      category_id: categorySlug,
      source_id: sourceId,
      section_ref: chunk.sectionRef ?? '',
      jurisdiction: source.jurisdiction,
    },
  }))

  for (let i = 0; i < vectors.length; i += VECTORIZE_BATCH_SIZE) {
    await vectorizeUpsert(vectors.slice(i, i + VECTORIZE_BATCH_SIZE), apiToken, accountId)
  }

  return sourceId
}
