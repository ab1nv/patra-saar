import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

/** Neon requires a connection string. Locally this is set in .env. */
function databaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  // channel_binding is a libpq-only param; the Neon HTTP driver ignores it and
  // it can confuse some URL parsers, so strip it.
  return url.replace(/[?&]channel_binding=[^&]*/g, '')
}

let db: NeonHttpDatabase | null = null

export function getDb(): NeonHttpDatabase {
  if (!db) {
    db = drizzle(neon(databaseUrl()))
  }
  return db
}
