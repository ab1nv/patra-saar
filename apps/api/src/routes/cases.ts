import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types/bindings'

export const caseRoutes = new Hono<{ Bindings: Env }>()

caseRoutes.use('*', authMiddleware)

// Create a new case folder to group related documents
caseRoutes.post('/', async (c) => {
  // TODO: Insert case into D1 with name, description, user_id
  return c.json({ error: 'Not implemented' }, 501)
})

// List all case folders for the current user
caseRoutes.get('/', async (c) => {
  // TODO: Query D1 for cases where user_id = current user
  return c.json({ cases: [] })
})

// Get a single case with its associated documents
caseRoutes.get('/:id', async (c) => {
  // TODO: Fetch case by ID, join with documents table
  return c.json({ error: 'Not implemented' }, 501)
})

// Update case name or description
caseRoutes.put('/:id', async (c) => {
  // TODO: Update case in D1, verify ownership
  return c.json({ error: 'Not implemented' }, 501)
})

// Delete a case folder (documents inside are unlinked, not deleted)
caseRoutes.delete('/:id', async (c) => {
  // TODO: Delete case from D1, set case_id to null on linked documents
  return c.json({ error: 'Not implemented' }, 501)
})

// Add an existing document to this case
caseRoutes.post('/:id/documents', async (c) => {
  // TODO: Update document's case_id in D1
  return c.json({ error: 'Not implemented' }, 501)
})
