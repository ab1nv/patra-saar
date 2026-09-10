import { pgTable, text, bigint, boolean, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})

export const cases = pgTable(
  'cases',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    pinned: boolean('pinned').notNull().default(false),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [index('idx_cases_user').on(t.userId)],
)

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    citationsJson: text('citations_json'),
    abstained: boolean('abstained').notNull().default(false),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [index('idx_messages_case').on(t.caseId)],
)
