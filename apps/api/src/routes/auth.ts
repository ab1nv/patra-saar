import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie } from 'hono/cookie'
import type { Env } from '../types/bindings'

export const authRoutes = new Hono<{ Bindings: Env }>()

// Exchange Google OAuth authorization code for a JWT session
authRoutes.post('/google', async (c) => {
  const body = await c.req.json<{ code: string; redirect_uri: string }>()

  if (!body.code || !body.redirect_uri) {
    return c.json({ error: 'Missing code or redirect_uri' }, 400)
  }

  // 1. Exchange code for Google access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: body.code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: body.redirect_uri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.json<{ error_description?: string }>()
    return c.json({ error: err.error_description ?? 'Google token exchange failed' }, 502)
  }

  const { access_token } = await tokenRes.json<{ access_token: string }>()

  // 2. Fetch Google user profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!profileRes.ok) {
    return c.json({ error: 'Failed to fetch Google user profile' }, 502)
  }

  const profile = await profileRes.json<{
    sub: string
    email: string
    name: string
    picture?: string
  }>()

  // 3. Upsert user in D1
  const now = Math.floor(Date.now() / 1000)
  await c.env.DB.prepare(
    `INSERT INTO users (google_id, email, name, picture_url, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT (google_id) DO UPDATE SET
       email       = excluded.email,
       name        = excluded.name,
       picture_url = excluded.picture_url,
       updated_at  = excluded.updated_at`
  )
    .bind(profile.sub, profile.email, profile.name, profile.picture ?? null, now)
    .run()

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE google_id = ?1')
    .bind(profile.sub)
    .first<{ id: string }>()

  if (!user) {
    return c.json({ error: 'Failed to create user' }, 500)
  }

  // 4. Sign JWT
  const token = await sign(
    {
      sub: user.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      iat: now,
      exp: now + 60 * 60 * 24 * 7, // 7 days
    },
    c.env.JWT_SECRET,
    'HS256'
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
