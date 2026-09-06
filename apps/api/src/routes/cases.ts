import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types/bindings'

type CaseRow = {
  id: string
  name: string
  description: string | null
  created_at: number
}

type InquiryRow = {
  id: string
  question: string
  answer: string | null
  created_at: number
  model_used: string | null
}

export const caseRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>()

caseRoutes.use('*', authMiddleware)

// Create a new case folder to group related documents
caseRoutes.post('/', async (c) => {
  // TODO: Insert case into D1 with name, description, user_id
  return c.json({ error: 'Not implemented' }, 501)
})

// List all case folders for the current user
caseRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  try {
    const { results } = await c.env.DB.prepare(
      `
      SELECT c.id, c.name, c.description, c.created_at
      FROM cases c
      WHERE c.user_id = ?
        AND EXISTS (
          SELECT 1
          FROM inquiries i
          WHERE i.case_id = c.id
            AND i.user_id = c.user_id
        )
      ORDER BY c.created_at DESC
      `,
    )
      .bind(userId)
      .all<CaseRow>()

    return c.json({ cases: results ?? [] })
  } catch (err) {
    console.error('Failed to fetch cases:', err)
    return c.json({ cases: [] })
  }
})

// Get all inquiries grouped under a case
caseRoutes.get('/:id/inquiries', async (c) => {
  const caseId = c.req.param('id')
  const userId = c.get('userId')

  const caseRow = await c.env.DB.prepare(
    'SELECT id, name, description, created_at FROM cases WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(caseId, userId)
    .first<CaseRow>()

  if (!caseRow) {
    return c.json({ error: 'Case not found' }, 404)
  }

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, question, answer, created_at, model_used FROM inquiries WHERE user_id = ? AND case_id = ? ORDER BY created_at ASC',
    )
      .bind(userId, caseId)
      .all<InquiryRow>()

    return c.json({ case: caseRow, inquiries: results ?? [] })
  } catch (err) {
    console.error('Failed to fetch case inquiries:', err)
    return c.json({ case: caseRow, inquiries: [] })
  }
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
  const caseId = c.req.param('id')
  const userId = c.get('userId')

  const caseRow = await c.env.DB.prepare(
    'SELECT id FROM cases WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(caseId, userId)
    .first<{ id: string }>()

  if (!caseRow) {
    return c.json({ error: 'Case not found' }, 404)
  }

  try {
    await c.env.DB.prepare('UPDATE documents SET case_id = NULL WHERE case_id = ? AND user_id = ?')
      .bind(caseId, userId)
      .run()

    await c.env.DB.prepare('DELETE FROM inquiries WHERE case_id = ? AND user_id = ?')
      .bind(caseId, userId)
      .run()

    await c.env.DB.prepare('DELETE FROM cases WHERE id = ? AND user_id = ?')
      .bind(caseId, userId)
      .run()

    return c.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete case:', err)
    return c.json({ error: 'Failed to delete case' }, 500)
  }
})

// Add an existing document to this case
caseRoutes.post('/:id/documents', async (c) => {
  // TODO: Update document's case_id in D1
  return c.json({ error: 'Not implemented' }, 501)
})
