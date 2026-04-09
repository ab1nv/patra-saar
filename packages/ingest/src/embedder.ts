/**
 * Generates embeddings for text chunks via Cloudflare Workers AI REST API.
 * Uses bge-base-en-v1.5 (768 dimensions) — same model as the runtime API.
 *
 * Requires environment variables:
 *   CLOUDFLARE_API_TOKEN  — API token with Workers AI permission
 *   CLOUDFLARE_ACCOUNT_ID — Cloudflare account ID
 */

const CF_AI_BASE = 'https://api.cloudflare.com/client/v4/accounts'
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5'
const BATCH_SIZE = 50

export interface EmbedResult {
  text: string
  embedding: number[]
}

function getEnv(): { apiToken: string; accountId: string } {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!apiToken) throw new Error('CLOUDFLARE_API_TOKEN env var is required')
  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID env var is required')
  return { apiToken, accountId }
}

async function embedBatch(
  texts: string[],
  apiToken: string,
  accountId: string,
): Promise<number[][]> {
  const url = `${CF_AI_BASE}/${accountId}/ai/run/${EMBEDDING_MODEL}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texts }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Cloudflare AI API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as { result: { data: number[][] } }
  return data.result.data
}

/**
 * Generates embeddings for all provided texts in batches.
 * Returns an array of (text, embedding) pairs in the same order.
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbedResult[]> {
  const { apiToken, accountId } = getEnv()
  const results: EmbedResult[] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const embeddings = await embedBatch(batch, apiToken, accountId)
    for (let j = 0; j < batch.length; j++) {
      results.push({ text: batch[j], embedding: embeddings[j] })
    }
    process.stdout.write(`  Embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks\r`)
  }
  process.stdout.write('\n')
  return results
}
