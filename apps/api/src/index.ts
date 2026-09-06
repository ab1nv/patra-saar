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

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const configuredOrigins = (c.env.FRONTEND_URL ?? 'http://localhost:5173')
        .split(',')
        .map((item: string) => normalizeOrigin(item))
        .filter(Boolean)

      const incoming = normalizeOrigin(origin || '')
      return configuredOrigins.includes(incoming) ? origin : null
    },
    credentials: true,
    exposeHeaders: ['X-Inquiry-Id', 'X-Case-Id', 'X-Case-Name'],
  }),
)

app.route('/auth', authRoutes)
app.route('/documents', documentRoutes)
app.route('/inquiries', inquiryRoutes)
app.route('/cases', caseRoutes)
app.route('/health', healthRoutes)

export default app
