import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { healthRoutes } from '../../src/routes/health'

// Test health routes in isolation — no CORS or other global middleware
const app = new Hono()
app.route('/health', healthRoutes)

describe('Health endpoint', () => {
  it('returns status ok', async () => {
    const res = await app.request('/health', undefined, {
      ENVIRONMENT: 'test',
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.version).toBeDefined()
  })
})
