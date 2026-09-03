import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { authRoutes } from '../../src/routes/auth'

// Build an isolated app with only auth routes, mirroring index.ts pattern
function makeApp(envOverrides: Record<string, unknown> = {}) {
  const app = new Hono()
  app.route('/auth', authRoutes)
  return { app, env: { ENVIRONMENT: 'test', ...envOverrides } }
}

describe('POST /auth/google', () => {
  it('returns 400 when code is missing', async () => {
    const { app, env } = makeApp()
    const res = await app.request(
      '/auth/google',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ redirect_uri: 'http://localhost:5173/auth/callback' }) },
      env
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect((body as { error: string }).error).toMatch(/missing/i)
  })

  it('returns 400 when redirect_uri is missing', async () => {
    const { app, env } = makeApp()
    const res = await app.request(
      '/auth/google',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'test-code' }) },
      env
    )
    expect(res.status).toBe(400)
  })

  it('returns 502 when Google token exchange fails', async () => {
    const { app, env } = makeApp({
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-secret',
    })

    // Mock fetch to simulate Google rejecting the code
    vi.stubGlobal('fetch', async (url: string) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ error_description: 'Invalid code' }), { status: 400 })
      }
      return new Response('', { status: 200 })
    })

    const res = await app.request(
      '/auth/google',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'bad-code', redirect_uri: 'http://localhost:5173/auth/callback' }),
      },
      env
    )

    expect(res.status).toBe(502)
    const body = await res.json()
    expect((body as { error: string }).error).toMatch(/invalid code/i)
    vi.unstubAllGlobals()
  })
})

describe('POST /auth/signout', () => {
  it('returns success and clears cookie', async () => {
    const { app, env } = makeApp()
    const res = await app.request(
      '/auth/signout',
      { method: 'POST' },
      env
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect((body as { success: boolean }).success).toBe(true)
    // Cookie header should contain maxAge=0 to clear session
    const setCookieHeader = res.headers.get('set-cookie') ?? ''
    expect(setCookieHeader).toMatch(/patrasaar_token=/)
  })
})
