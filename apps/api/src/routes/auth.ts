import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie } from 'hono/cookie'
import type { Env } from '../types/bindings'

export const authRoutes = new Hono<{ Bindings: Env }>()

// Exchange Google OAuth authorization code for a JWT session
authRoutes.post('/google', async (c) => {
  // Dummy login for now, bypassing Google OAuth and DB
  const now = Math.floor(Date.now() / 1000)

  const dummyUserId = 'dummy-user-' + Math.random().toString(36).substring(7)

  // Sign JWT
  const token = await sign(
    {
      sub: dummyUserId,
      email: 'test@example.com',
      name: 'Test User',
      picture: '',
      iat: now,
      exp: now + 60 * 60 * 24 * 7, // 7 days
    },
    c.env.JWT_SECRET,
    'HS256',
  )

  return c.json({ token })
})

// Return the current user's profile from the JWT
authRoutes.get('/me', async (c) => {
  // TODO: Extract userId from JWT, fetch user from D1
  return c.json({ error: 'Not implemented' }, 501)
})

// Clear the session cookie
authRoutes.post('/signout', async (c) => {
  setCookie(c, 'patrasaar_token', '', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 0,
  })
  return c.json({ success: true })
})
