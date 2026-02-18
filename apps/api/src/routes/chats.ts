import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import { zValidator } from '@hono/zod-validator'
import { createChatSchema, updateChatSchema } from '@patrasaar/shared'
import type { Env } from '../env'
import { requireAuth } from '../auth/middleware'

type AuthVariables = {
  user: { id: string; email: string; name: string }
}

const chats = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

chats.use('*', requireAuth)

// List all chats for the current user, newest first
chats.get('/', async (c) => {
  const user = c.get('user')
  const result = await c.env.DB.prepare(
    'SELECT id, user_id, title, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC',
  )
    .bind(user.id)
    .all()

  return c.json({ data: result.results })
})

// Create a new chat
chats.post('/', zValidator('json', createChatSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  const id = nanoid()
  const title = body.title || 'New Chat'

  await c.env.DB.prepare(
    'INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)',
  )
    .bind(id, user.id, title)
    .run()

  const chat = await c.env.DB.prepare('SELECT * FROM chats WHERE id = ?').bind(id).first()
  return c.json({ data: chat }, 201)
})

// Get a single chat with its messages
chats.get('/:id', async (c) => {
  const user = c.get('user')
  const chatId = c.req.param('id')

  const chat = await c.env.DB.prepare(
    'SELECT * FROM chats WHERE id = ? AND user_id = ?',
  )
    .bind(chatId, user.id)
    .first()

  if (!chat) {
    return c.json({ error: { message: 'Chat not found', code: 'NOT_FOUND' } }, 404)
  }

  const messages = await c.env.DB.prepare(
    'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
  )
    .bind(chatId)
    .all()

  return c.json({ data: { chat, messages: messages.results } })
})

// Rename a chat
chats.patch('/:id', zValidator('json', updateChatSchema), async (c) => {
  const user = c.get('user')
  const chatId = c.req.param('id')
  const body = c.req.valid('json')

  const existing = await c.env.DB.prepare(
    'SELECT id FROM chats WHERE id = ? AND user_id = ?',
  )
    .bind(chatId, user.id)
    .first()

  if (!existing) {
    return c.json({ error: { message: 'Chat not found', code: 'NOT_FOUND' } }, 404)
  }

  await c.env.DB.prepare(
    "UPDATE chats SET title = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(body.title, chatId)
    .run()

  const chat = await c.env.DB.prepare('SELECT * FROM chats WHERE id = ?').bind(chatId).first()
  return c.json({ data: chat })
})

// Delete a chat and all related data
chats.delete('/:id', async (c) => {
  const user = c.get('user')
  const chatId = c.req.param('id')

  const existing = await c.env.DB.prepare(
    'SELECT id FROM chats WHERE id = ? AND user_id = ?',
  )
    .bind(chatId, user.id)
    .first()

  if (!existing) {
    return c.json({ error: { message: 'Chat not found', code: 'NOT_FOUND' } }, 404)
  }

  // Delete R2 objects for documents in this chat
  const docs = await c.env.DB.prepare(
    'SELECT r2_key FROM documents WHERE chat_id = ?',
  )
    .bind(chatId)
    .all()

  for (const doc of docs.results) {
    if (doc.r2_key && c.env.STORAGE) {
      await c.env.STORAGE.delete(doc.r2_key as string)
    }
  }

  // TODO: delete vectors from Vectorize for this chat
  // Vectorize does not support bulk delete by metadata filter yet,
  // so we track vector IDs in document_chunks and delete them individually.
  const chunks = await c.env.DB.prepare(
    'SELECT dc.id FROM document_chunks dc JOIN documents d ON dc.document_id = d.id WHERE d.chat_id = ?',
  )
    .bind(chatId)
    .all()

  const vectorIds = chunks.results.map((r) => r.id as string)
  if (vectorIds.length > 0) {
    await c.env.VECTORIZE.deleteByIds(vectorIds)
  }

  // Cascade delete takes care of messages, documents, chunks, jobs
  await c.env.DB.prepare('DELETE FROM chats WHERE id = ?').bind(chatId).run()

  return c.json({ data: { success: true } })
})

export { chats }
