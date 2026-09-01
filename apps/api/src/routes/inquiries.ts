import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types/bindings'

export const inquiryRoutes = new Hono<{ Bindings: Env }>()

inquiryRoutes.use('*', authMiddleware)

// Stream a RAG-powered legal inquiry response via SSE
// Queries both user-docs and legal-corpus Vectorize namespaces
inquiryRoutes.post('/stream', async (c) => {
  // TODO: 1. Parse { documentIds, question } from request body
  //       2. Embed the question via Workers AI
  //       3. Retrieve chunks from both VECTORIZE and LEGAL_CORPUS
  //       4. Assemble context window with source tags
  //       5. Stream LLM response via OpenRouter
  //       6. Extract citations from completed response
  //       7. Persist inquiry to D1
  return c.json({ error: 'Not implemented' }, 501)
})

// List past inquiries for the current user
inquiryRoutes.get('/', async (c) => {
  // TODO: Query D1 for inquiries where user_id = current user
  return c.json({ inquiries: [] })
})

// Get a single inquiry with its full answer and citations
inquiryRoutes.get('/:id', async (c) => {
  // TODO: Fetch inquiry by ID, verify ownership, return with parsed citations
  return c.json({ error: 'Not implemented' }, 501)
})
