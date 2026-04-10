import { Hono } from 'hono'
import type { Env } from '../types/bindings'

export const authRoutes = new Hono<{ Bindings: Env }>()

// Exchange Google OAuth authorization code for a JWT session
authRoutes.post('/google', async (c) => {
  // TODO: Validate Google auth code, upsert user in D1, return signed JWT
  return c.json({ error: 'Not implemented' }, 501)
})

// Return the current user's profile from the JWT
authRoutes.get('/me', async (c) => {
  // TODO: Extract userId from JWT, fetch user from D1
  return c.json({ error: 'Not implemented' }, 501)
})

// Clear the session cookie
authRoutes.post('/signout', async (c) => {
  // TODO: Clear the patrasaar_token cookie
  return c.json({ success: true })
})
