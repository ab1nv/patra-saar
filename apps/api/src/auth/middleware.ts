import { createMiddleware } from 'hono/factory'
import type { Env } from '../env'
import { createAuth } from './auth'

type Variables = {
  user: { id: string; email: string; name: string }
}

// Middleware that requires a valid session.
// Sets c.get('user') with the authenticated user's info.
export const requireAuth = createMiddleware<{
  Bindings: Env
  Variables: Variables
}>(async (c, next) => {
  const auth = createAuth(c.env)

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session?.user) {
    return c.json({ error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } }, 401)
  }

  c.set('user', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  })

  await next()
})

// Optional auth: allows unauthenticated requests with a test user ID.
// For testing without OAuth setup.
export const optionalAuth = createMiddleware<{
  Bindings: Env
  Variables: Variables
}>(async (c, next) => {
  const auth = createAuth(c.env)

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (session?.user) {
    // Real authenticated user
    c.set('user', {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    })
  } else {
    // Test mode: use a default user ID
    c.set('user', {
      id: 'test-user-001',
      email: 'test@patrasaar.local',
      name: 'Test User',
    })
  }

  await next()
})
