import { createMiddleware } from 'hono/factory'
import type { Env } from '../types/bindings'

/**
 * Structured request logger. Logs method, path, status, and duration.
 * In production, these are visible in the Cloudflare Workers dashboard logs.
 */
export const requestLogger = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${c.req.method} ${c.req.path} → ${c.res.status} (${ms}ms)`)
})
