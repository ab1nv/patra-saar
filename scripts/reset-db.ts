/**
 * Clears all stored conversations (cases + messages) from the database and
 * ensures the demo user exists. Users are preserved so login keeps working.
 *
 * Run: pnpm db:reset
 */
import { sql } from 'drizzle-orm'
import { getDb } from '../src/lib/db/client'
import { hashPassword } from '../src/lib/auth/password'
import { createUser, findUserByEmail } from '../src/lib/db/store'

try {
  process.loadEnvFile('.env')
} catch {
  // fall back to real environment variables
}

async function main() {
  const db = getDb()
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  )
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, pinned BOOLEAN NOT NULL DEFAULT FALSE, created_at BIGINT NOT NULL)`,
  )
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, citations_json TEXT, abstained BOOLEAN NOT NULL DEFAULT FALSE, created_at BIGINT NOT NULL)`,
  )

  const deletedMessages = (await db.execute(sql`DELETE FROM messages`)) as { rowCount?: number }
  const deletedCases = (await db.execute(sql`DELETE FROM cases`)) as { rowCount?: number }
  console.log(
    `Cleared cases (${deletedCases.rowCount ?? '?'} rows) and messages (${deletedMessages.rowCount ?? '?'} rows).`,
  )

  const email = (process.env.DEMO_USER_EMAIL ?? 'abhinav@test.com').toLowerCase()
  const password = process.env.DEMO_USER_PASSWORD ?? 'abhinav'
  const existing = await findUserByEmail(email)
  if (!existing) {
    await createUser(email, hashPassword(password))
    console.log(`Re-seeded demo user: ${email}`)
  } else {
    console.log(`Demo user intact: ${email}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
