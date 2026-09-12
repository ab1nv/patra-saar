import { eq, asc, desc, and, sql } from 'drizzle-orm'
import { getDb } from './client'
import { users, cases, messages } from './schema'

export type UserRow = {
  id: string
  email: string
  passwordHash: string
  createdAt: number
}
export type CaseRow = {
  id: string
  userId: string
  title: string
  pinned: boolean
  createdAt: number
}
export type MessageRow = {
  id: string
  caseId: string
  role: string
  content: string
  citationsJson: string | null
  abstained: boolean
  createdAt: number
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, pinned BOOLEAN NOT NULL DEFAULT FALSE, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, citations_json TEXT, abstained BOOLEAN NOT NULL DEFAULT FALSE, created_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_cases_user ON cases(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_case ON messages(case_id)`,
]

/* ------------------------------------------------------------------ */
/* In-memory fallback so the app stays demoable if the database is     */
/* unreachable.                                                        */
/* ------------------------------------------------------------------ */
type Memory = {
  usersByEmail: Map<string, UserRow>
  usersById: Map<string, UserRow>
  cases: Map<string, CaseRow>
  messages: Map<string, MessageRow[]>
}
const globalForMemory = globalThis as unknown as { __psMemory?: Memory }
function mem(): Memory {
  if (!globalForMemory.__psMemory) {
    globalForMemory.__psMemory = {
      usersByEmail: new Map(),
      usersById: new Map(),
      cases: new Map(),
      messages: new Map(),
    }
  }
  return globalForMemory.__psMemory
}

let dbState: 'unknown' | 'ready' | 'broken' = 'unknown'

async function ensureSchema(): Promise<void> {
  const db = getDb()
  for (const stmt of SCHEMA_STATEMENTS) await db.execute(sql.raw(stmt))
}

async function withStore<T>(real: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  if (dbState === 'broken') return fallback()

  let lastError: unknown
  // Neon can fail the first request while a suspended compute wakes up, so a
  // single quick retry keeps a cold start from surfacing as a failed login.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (dbState !== 'ready') {
        await ensureSchema()
        dbState = 'ready'
      }
      return await real()
    } catch (err) {
      lastError = err
      if (dbState !== 'ready') break
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  if (dbState !== 'ready') {
    console.warn('[db] unavailable, using in-memory store:', (lastError as Error).message)
    dbState = 'broken'
    return fallback()
  }
  throw lastError
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return withStore(
    async () => {
      const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1)
      const r = rows[0]
      return r
        ? { id: r.id, email: r.email, passwordHash: r.passwordHash, createdAt: r.createdAt }
        : undefined
    },
    () => mem().usersByEmail.get(email.toLowerCase()),
  )
}

export async function createUser(email: string, passwordHash: string): Promise<UserRow> {
  const row: UserRow = {
    id: newId(),
    email: email.toLowerCase(),
    passwordHash,
    createdAt: Date.now(),
  }
  return withStore(
    async () => {
      await getDb().insert(users).values(row)
      return row
    },
    () => {
      mem().usersByEmail.set(row.email, row)
      mem().usersById.set(row.id, row)
      return row
    },
  )
}

export async function createCase(userId: string, title: string): Promise<CaseRow> {
  const row: CaseRow = { id: newId(), userId, title, pinned: false, createdAt: Date.now() }
  return withStore(
    async () => {
      await getDb().insert(cases).values(row)
      return row
    },
    () => {
      mem().cases.set(row.id, row)
      return row
    },
  )
}

export async function listCases(userId: string): Promise<CaseRow[]> {
  return withStore(
    async () =>
      getDb()
        .select()
        .from(cases)
        .where(eq(cases.userId, userId))
        .orderBy(desc(cases.pinned), desc(cases.createdAt)),
    () =>
      [...mem().cases.values()]
        .filter((c) => c.userId === userId)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt),
  )
}

export async function getCase(userId: string, caseId: string): Promise<CaseRow | undefined> {
  return withStore(
    async () => {
      const rows = await getDb()
        .select()
        .from(cases)
        .where(and(eq(cases.id, caseId), eq(cases.userId, userId)))
        .limit(1)
      return rows[0]
    },
    () => {
      const c = mem().cases.get(caseId)
      return c && c.userId === userId ? c : undefined
    },
  )
}

export async function updateCase(
  userId: string,
  caseId: string,
  patch: { title?: string; pinned?: boolean },
): Promise<CaseRow | undefined> {
  const existing = await getCase(userId, caseId)
  if (!existing) return undefined
  const updated: CaseRow = {
    ...existing,
    title: patch.title ?? existing.title,
    pinned: patch.pinned ?? existing.pinned,
  }
  return withStore(
    async () => {
      await getDb()
        .update(cases)
        .set({ title: updated.title, pinned: updated.pinned })
        .where(eq(cases.id, caseId))
      return updated
    },
    () => {
      mem().cases.set(caseId, updated)
      return updated
    },
  )
}

export async function getCaseMessages(caseId: string): Promise<MessageRow[]> {
  return withStore(
    async () =>
      getDb()
        .select()
        .from(messages)
        .where(eq(messages.caseId, caseId))
        .orderBy(asc(messages.createdAt)),
    () => [...(mem().messages.get(caseId) ?? [])].sort((a, b) => a.createdAt - b.createdAt),
  )
}

export async function addMessage(row: MessageRow): Promise<void> {
  return withStore(
    async () => {
      await getDb().insert(messages).values(row)
    },
    () => {
      const list = mem().messages.get(row.caseId) ?? []
      list.push(row)
      mem().messages.set(row.caseId, list)
    },
  )
}

export async function deleteCase(userId: string, caseId: string): Promise<boolean> {
  const existing = await getCase(userId, caseId)
  if (!existing) return false
  return withStore(
    async () => {
      const db = getDb()
      await db.delete(messages).where(eq(messages.caseId, caseId))
      await db.delete(cases).where(eq(cases.id, caseId))
      return true
    },
    () => {
      mem().cases.delete(caseId)
      mem().messages.delete(caseId)
      return true
    },
  )
}
