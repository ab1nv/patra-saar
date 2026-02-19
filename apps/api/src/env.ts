export interface Env {
  // Cloudflare bindings
  DB: D1Database
  STORAGE?: R2Bucket
  PROCESSING_QUEUE?: Queue
  AI: Ai
  VECTORIZE: VectorizeIndex

  // Secrets (set via wrangler secret or .dev.vars)
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  TRUSTED_ORIGINS?: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GROQ_API_KEY: string
  OPENROUTER_API_KEY: string
}
