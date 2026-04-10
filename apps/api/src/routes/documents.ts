import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types/bindings'

export const documentRoutes = new Hono<{ Bindings: Env }>()

documentRoutes.use('*', authMiddleware)

// Upload a document — accepts multipart/form-data with a PDF file
documentRoutes.post('/', async (c) => {
  // TODO: Parse multipart upload, validate 15MB limit, store raw PDF in KV,
  //       chunk, embed, insert into Vectorize, save metadata to D1
  return c.json({ error: 'Not implemented' }, 501)
})

// List all documents belonging to the current user
documentRoutes.get('/', async (c) => {
  // TODO: Query D1 for documents where user_id = current user
  return c.json({ documents: [] })
})

// Get a single document's metadata and summary
documentRoutes.get('/:id', async (c) => {
  // TODO: Fetch document by ID, verify ownership
  return c.json({ error: 'Not implemented' }, 501)
})

// Delete a document and all associated data (KV file, D1 rows, Vectorize vectors)
documentRoutes.delete('/:id', async (c) => {
  // TODO: Delete from KV, D1 (document + chunks), and Vectorize
  return c.json({ error: 'Not implemented' }, 501)
})

// SSE endpoint for document processing status updates
documentRoutes.get('/:id/status', async (c) => {
  // TODO: Stream processing status (parsing → chunking → embedding → ready)
  return c.json({ error: 'Not implemented' }, 501)
})
