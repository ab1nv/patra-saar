import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authRoutes } from './routes/auth'
import { documentRoutes } from './routes/documents'
import { inquiryRoutes } from './routes/inquiries'
import { caseRoutes } from './routes/cases'
import { healthRoutes } from './routes/health'
import type { Env } from './types/bindings'

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.FRONTEND_URL ?? 'http://localhost:5173'
      return origin === allowed ? origin : null
    },
    credentials: true,
  }),
)

app.route('/auth', authRoutes)
app.route('/documents', documentRoutes)
app.route('/inquiries', inquiryRoutes)
app.route('/cases', caseRoutes)
app.route('/health', healthRoutes)

export default app
