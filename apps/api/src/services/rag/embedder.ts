import type { Env } from '../../types/bindings'

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5'

/**
 * Generates 768-dimension embeddings via Cloudflare Workers AI.
 * Used for both document ingestion (chunk text → vector) and
 * query time (question text → query vector).
 */
export async function embedTexts(texts: string[], env: Env): Promise<number[][]> {
  const result = await env.AI.run(EMBEDDING_MODEL, { text: texts })
  // Workers AI returns { data: number[][] } for embedding models
  return (result as { data: number[][] }).data
}

/** Convenience wrapper for embedding a single query string. */
export async function embedQuery(question: string, env: Env): Promise<number[]> {
  const [vector] = await embedTexts([question], env)
  return vector
}
