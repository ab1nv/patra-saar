import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import type { Env } from './env'
import { createAuth } from './auth/auth'
import { categories } from './routes/categories'
import { chats } from './routes/chats'
import { messages } from './routes/messages'
import { processDocument } from './lib/process-document'

const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use('*', secureHeaders())
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow localhost in dev, production domain otherwise
      if (!origin) return '*'
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin
      if (origin.includes('patrasaar')) return origin
      return ''
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// BetterAuth handler -- handles all /api/auth/* routes
app.all('/api/auth/*', async (c) => {
  const auth = createAuth(c.env, c.req.header('origin'))
  return auth.handler(c.req.raw)
})

// App routes
app.route('/api/categories', categories)
app.route('/api/chats', chats)
app.route('/api/chats', messages) // messages are nested under /api/chats/:chatId/messages

// 404 fallback
app.notFound((c) => {
  return c.json({ error: { message: 'Not found', code: 'NOT_FOUND' } }, 404)
})

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err.message)
  return c.json(
    { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
    500,
  )
})

// Queue consumer for document processing
export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      // processDocument never throws — errors are recorded in D1
      await processDocument(msg.body as any, env)
      msg.ack()
    }
  },
}

