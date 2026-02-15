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
