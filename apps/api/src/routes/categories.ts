import { Hono } from 'hono'
import type { Env } from '../env'

const categories = new Hono<{ Bindings: Env }>()

// List all active legal categories
categories.get('/', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT id, slug, name, description, is_active, created_at FROM kb_categories WHERE is_active = 1 ORDER BY name ASC',
  ).all()

  return c.json({ data: result.results })
})

export { categories }
