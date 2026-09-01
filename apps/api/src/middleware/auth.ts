import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import type { Env } from '../types/bindings'

/**
 * Validates the patrasaar_token JWT cookie on every protected request.
 * Sets c.var.userId for downstream handlers.
 */
export const authMiddleware = createMiddleware<{
  Bindings: Env
  Variables: { userId: string }
}>(async (c, next) => {
  const token = getCookie(c, 'patrasaar_token')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('userId', payload.sub as string)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
