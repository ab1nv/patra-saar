import { createMiddleware } from 'hono/factory'
import type { Env } from '../types/bindings'

/**
 * Per-user rate limiting backed by Cloudflare KV.
 * Tracks request counts in sliding windows.
 *
 * Limits: 60 requests per minute per user (adjustable via config).
 */
export const rateLimitMiddleware = createMiddleware<{
  Bindings: Env
  Variables: { userId: string }
}>(async (c, next) => {
  const userId = c.get('userId')
  if (!userId) {
    await next()
    return
  }

  const windowKey = `ratelimit:${userId}:${Math.floor(Date.now() / 60_000)}`
  const current = await c.env.CACHE.get(windowKey)
  const count = current ? parseInt(current, 10) : 0

  if (count >= 60) {
    return c.json({ error: 'Rate limit exceeded. Try again in a minute.' }, 429)
  }

  // Fire-and-forget — don't block the request for KV writes
  c.executionCtx.waitUntil(c.env.CACHE.put(windowKey, String(count + 1), { expirationTtl: 120 }))

  await next()
})
