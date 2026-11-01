/**
 * Precomputes 384-dimensional dense vector embeddings for all statutory
 * sections in data/corpus.json using @xenova/transformers (all-MiniLM-L6-v2).
 *
 * Output:
 *   - data/corpus-embeddings.bin: contiguous Float32Array (N * 384 * 4 bytes)
 *   - data/corpus-embeddings-index.json: array of section IDs in binary offset order
 *
 * Run: pnpm embeddings:build
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pipeline } from '@xenova/transformers'
import type { Corpus, Section } from '../src/lib/corpus/types'

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'
const BATCH_SIZE = 32

function sectionToEmbeddingText(s: Section): string {
  // Representation: Act + Section number + Title + substantive excerpt
  const excerpt = s.text.slice(0, 500).replace(/\s+/g, ' ').trim()
  return `${s.actFull} Section ${s.number}: ${s.title}. ${excerpt}`
}

async function main() {
  console.log(`[embeddings] Loading corpus from data/corpus.json...`)
  const corpus = JSON.parse(readFileSync(path.join('data', 'corpus.json'), 'utf8')) as Corpus
  const sections = corpus.sections
  const total = sections.length
  console.log(`[embeddings] Loaded ${total} sections across ${corpus.acts.length} acts.`)

  console.log(`[embeddings] Initializing ${MODEL_NAME}...`)
  const extractor = await pipeline('feature-extraction', MODEL_NAME)

  // 384 dimensions for all-MiniLM-L6-v2
  const DIM = 384
  const allVectors = new Float32Array(total * DIM)
  const ids: string[] = []

  console.log(`[embeddings] Computing embeddings in batches of ${BATCH_SIZE}...`)
  const start = Date.now()

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = sections.slice(i, i + BATCH_SIZE)
    const texts = batch.map(sectionToEmbeddingText)

    for (let j = 0; j < batch.length; j++) {
      const idx = i + j
      const s = batch[j]!
      ids.push(s.id)

      const output = await extractor(texts[j]!, { pooling: 'mean', normalize: true })
      const vec = output.data as Float32Array
      allVectors.set(vec, idx * DIM)
    }

    const processed = Math.min(i + BATCH_SIZE, total)
    if (processed % 200 === 0 || processed === total) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      const pct = Math.round((processed / total) * 100)
      console.log(`  [${processed}/${total}] ${pct}% embedded (${elapsed}s elapsed)`)
    }
  }

  const binPath = path.join('data', 'corpus-embeddings.bin')
  const indexPath = path.join('data', 'corpus-embeddings-index.json')

  // Write binary vector buffer
  writeFileSync(
    binPath,
    Buffer.from(allVectors.buffer, allVectors.byteOffset, allVectors.byteLength),
  )
  // Write index map
  writeFileSync(indexPath, JSON.stringify(ids))

  const mb = (allVectors.byteLength / (1024 * 1024)).toFixed(2)
  console.log(`\n[embeddings] Complete!`)
  console.log(`  Binary file: ${binPath} (${mb} MB, ${total} vectors of dim ${DIM})`)
  console.log(`  Index file:  ${indexPath} (${ids.length} entries)`)
}

main().catch((err) => {
  console.error('[embeddings] Generation failed:', err)
  process.exit(1)
})
