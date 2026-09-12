import { Pool } from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'

/** Connection string. Set DATABASE_URL in .env (Neon or any Postgres). */
function databaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  // channel_binding is libpq-only, and sslmode is handled explicitly below via
  // the Pool's ssl option, so drop both to avoid driver warnings.
  return url.replace(/[?&](channel_binding|sslmode)=[^&]*/g, '')
}

let pool: Pool | null = null
let db: NodePgDatabase | null = null

/**
 * Standard Postgres wire protocol via node-postgres, so the same code path works
 * against Neon in production and a plain Postgres service in CI. The pool is
 * module-scoped so warm serverless invocations reuse connections.
 */
export function getDb(): NodePgDatabase {
  if (!db) {
    const url = databaseUrl()
    const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(url)
    pool = new Pool({
      connectionString: url,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: Number(process.env.PG_POOL_MAX ?? 3),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    })
    db = drizzle(pool)
  }
  return db
}
