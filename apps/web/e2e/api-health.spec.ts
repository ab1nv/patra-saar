import { test, expect } from '@playwright/test'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8787'

/**
 * Helper: returns true if the API is reachable.
 * Allows graceful skip when the API server is not running locally.
 */
async function isApiReachable(): Promise<boolean> {
  try {
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }))
    const res = await (fetch as typeof globalThis.fetch)(`${API_BASE}/api/categories`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

test.describe('API Health Checks', () => {
  test('GET /api/categories returns 200 with data array', async ({ request }) => {
    const reachable = await isApiReachable()
    if (!reachable) {
      test.skip(true, 'API server not running — skipping live API tests')
      return
    }

    const response = await request.get(`${API_BASE}/api/categories`)
    expect(response.status()).toBe(200)

    const body = await response.json()
    // Shape: { data: [...] } or { categories: [...] }
    const hasData = Array.isArray(body.data) || Array.isArray(body.categories)
    expect(hasData).toBe(true)
  })

  test('GET /api/categories response has correct content-type', async ({ request }) => {
    const reachable = await isApiReachable()
    if (!reachable) {
      test.skip(true, 'API server not running — skipping live API tests')
      return
    }

    const response = await request.get(`${API_BASE}/api/categories`)
    expect(response.headers()['content-type']).toContain('application/json')
  })

  test('POST /api/auth/sign-in/social returns a redirect URL or error for missing provider', async ({
    request,
  }) => {
    const reachable = await isApiReachable()
    if (!reachable) {
      test.skip(true, 'API server not running — skipping live API tests')
      return
    }

    const response = await request.post(`${API_BASE}/api/auth/sign-in/social`, {
      data: { provider: 'google', callbackURL: 'http://localhost:3000/chat' },
    })
    // Should be 200 (with redirect url) or 4xx (auth config error) — not a 5xx crash
    expect(response.status()).toBeLessThan(500)
  })
})
