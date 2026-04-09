import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { categories } from './categories'
import type { Env } from '../env'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockD1Statement = {
  bind: (...args: unknown[]) => MockD1Statement
  all: () => Promise<{ results: unknown[] }>
  first: () => Promise<unknown>
  run: () => Promise<void>
}

function makeStmt(results: unknown[] = [], firstResult: unknown = null): MockD1Statement {
  const stmt: MockD1Statement = {
    bind: (..._args: unknown[]) => stmt,
    all: async () => ({ results }),
    first: async () => firstResult,
    run: async () => {},
  }
  return stmt
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {
      prepare: vi.fn(() => makeStmt()),
    } as unknown as Env['DB'],
    AI: {} as Env['AI'],
    VECTORIZE: {} as Env['VECTORIZE'],
    BETTER_AUTH_SECRET: 'test-secret',
    BETTER_AUTH_URL: 'http://localhost:8787',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GROQ_API_KEY: 'test-groq-key',
    OPENROUTER_API_KEY: 'test-openrouter-key',
    ...overrides,
  }
}

function buildApp(env: Env) {
  const app = new Hono<{ Bindings: Env }>()
  app.route('/api/categories', categories)
  return app
}

// ---------------------------------------------------------------------------
// GET /api/categories
// ---------------------------------------------------------------------------

describe('GET /api/categories', () => {
  it('returns active categories list', async () => {
    const mockCategories = [
      {
        id: 'cat_rental',
        slug: 'rental-tenancy',
        name: 'Rental & Tenancy Law',
        description: 'Indian rental and tenancy laws',
        is_active: 1,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]

    const env = makeEnv({
      DB: {
        prepare: vi.fn(() => makeStmt(mockCategories)),
      } as unknown as Env['DB'],
    })

    const app = buildApp(env)
    const req = new Request('http://localhost/api/categories')
    const res = await app.fetch(req, env)

    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toHaveLength(1)
    expect((body.data[0] as Record<string, unknown>).slug).toBe('rental-tenancy')
  })

  it('returns empty list when no categories exist', async () => {
    const env = makeEnv({
      DB: {
        prepare: vi.fn(() => makeStmt([])),
      } as unknown as Env['DB'],
    })

    const app = buildApp(env)
    const req = new Request('http://localhost/api/categories')
    const res = await app.fetch(req, env)

    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toEqual([])
  })

  it('returns only active categories (is_active = 1)', async () => {
    const mockCategories = [
      {
        id: 'cat_rental',
        slug: 'rental-tenancy',
        name: 'Rental & Tenancy Law',
        description: null,
        is_active: 1,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]

    const env = makeEnv({
      DB: {
        prepare: vi.fn((sql: string) => {
          // Verify query filters by is_active = 1
          expect(sql).toContain('is_active = 1')
          return makeStmt(mockCategories)
        }),
      } as unknown as Env['DB'],
    })

    const app = buildApp(env)
    const req = new Request('http://localhost/api/categories')
    await app.fetch(req, env)
  })

  it('returns 500 on database error', async () => {
    const env = makeEnv({
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockRejectedValue(new Error('DB connection failed')),
        })),
      } as unknown as Env['DB'],
    })

    const app = new Hono<{ Bindings: Env }>()
    app.route('/api/categories', categories)
    // Add error handler
    app.onError((err, c) => {
      return c.json({ error: { message: 'Internal server error' } }, 500)
    })

    const req = new Request('http://localhost/api/categories')
    const res = await app.fetch(req, env)
    expect(res.status).toBe(500)
  })
})
