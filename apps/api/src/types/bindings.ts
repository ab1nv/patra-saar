/**
 * Cloudflare Worker environment bindings.
 * Each binding maps to a resource created via wrangler CLI.
 * See wrangler.toml for the binding configuration.
 */
export interface Env {
  // Storage — KV used for documents (no credit card required, unlike R2)
  DOCUMENTS: KVNamespace
  DB: D1Database
  CACHE: KVNamespace

  // Vector search — two separate indexes for user docs vs legal corpus
  VECTORIZE: VectorizeIndex
  LEGAL_CORPUS: VectorizeIndex

  // Workers AI for generating embeddings
  AI: Ai

  // Secrets (set via `wrangler secret put`)
  JWT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  OPENROUTER_API_KEY: string
  FRONTEND_URL: string

  // Config vars (set in wrangler.toml [vars])
  ENVIRONMENT: string
}
