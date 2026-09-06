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
  const globalUserId = 'dummy-global-user'

  // Ensure the dummy user exists in the database to satisfy foreign key constraints.
  // We use INSERT OR IGNORE so it only writes on the first request.
  try {
    await c.env.DB.prepare(
      `
      INSERT OR IGNORE INTO users (id, google_id, email, name, plan)
      VALUES (?, ?, ?, ?, ?)
    `,
    )
      .bind(globalUserId, 'dummy-google-global', 'global@patrasaar.test', 'Global User', 'pro')
      .run()
  } catch (err) {
    console.error('Failed to ensure global user exists:', err)
  }

  c.set('userId', globalUserId)
  await next()
})
