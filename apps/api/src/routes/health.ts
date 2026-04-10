import { Hono } from 'hono'
import type { Env } from '../types/bindings'

export const healthRoutes = new Hono<{ Bindings: Env }>()

healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    version: '0.0.1',
    environment: c.env.ENVIRONMENT,
  })
})
