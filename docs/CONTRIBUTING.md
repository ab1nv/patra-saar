# Contributing to PatraSaar

<!-- AUTO-GENERATED: 2026-03-11 -->

This guide covers setting up your development environment, running the project locally, and following our development workflow.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20.0.0 or higher (check with `node -v`)
- **npm** 10.9.2 or higher (included with Node.js)
- **Cloudflare Account** (free tier works for development)
- **Git** for version control

### API Keys Required

To run the full system, you'll need:

- **Groq API Key** - Free tier available at https://console.groq.com
- **Google OAuth Credentials** - For authentication
- **OpenRouter API Key** (optional) - Fallback LLM

All keys should be added to a `.env` file in `apps/api/` (see Environment Variables section).

## Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd patra-saar
make install
```

This installs npm packages across all workspaces (apps/api, apps/web, packages/shared).

## Development Setup

### Environment Variables

Create `.env` file in `apps/api/`:

```bash
# Authentication
BETTER_AUTH_SECRET=your-secret-key-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# OAuth (Google)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LLM Services
GROQ_API_KEY=gsk_your_groq_api_key_here
OPENROUTER_API_KEY=sk-or-your-openrouter-key

# Cloudflare D1 (generated automatically in wrangler.toml)
# No manual setup needed for local development
```

Create `.env.local` file in `apps/web/`:

```bash
# API endpoint (local development)
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### Start Development Servers

Run both API and web servers simultaneously:

```bash
make dev
```

This command starts:
- **API**: Hono on Cloudflare Workers at `http://localhost:8787`
- **Web**: Next.js development server at `http://localhost:3000`

The development servers automatically reload on file changes.

### Database Setup

Initialize the local D1 database:

```bash
make db-migrate
```

This creates all tables defined in `apps/api/src/db/schema.sql`.

**Note**: D1 local database is stored in `.wrangler/state/` and persists between restarts.

## Available Commands

<!-- AUTO-GENERATED: Development Commands Table -->

| Command | Workspace | Purpose |
|---------|-----------|---------|
| `make install` | Root | Install dependencies for all workspaces |
| `make dev` | Root | Start API (8787) + Web (3000) dev servers |
| `make test` | Root | Run all tests (Vitest) across workspaces |
| `make test-coverage` | Root | Run tests with coverage report |
| `make build` | Root | Build all packages for production |
| `make lint` | Root | Lint all code (ESLint) |
| `make typecheck` | Root | Run TypeScript type checking |
| `make format` | Root | Format all code with Prettier |
| `make db-migrate` | apps/api | Execute D1 schema.sql locally |
| `make docker-up` | Root | Start Docker dev environment |
| `make docker-down` | Root | Stop Docker dev environment |
| `make clean` | Root | Remove node_modules and build artifacts |

### Testing

Run tests for all packages:

```bash
make test
```

Run tests with coverage:

```bash
make test-coverage
```

Run tests for a specific workspace:

```bash
npm test --workspace=apps/api
npm test --workspace=apps/web
npm test --workspace=packages/shared
```

### Code Quality

Format all code with Prettier:

```bash
make format
```

Check formatting without modifying:

```bash
npm run format:check
```

Lint all code:

```bash
make lint
```

Run TypeScript type checking:

```bash
make typecheck
```

### Building for Production

Build all workspaces:

```bash
make build
```

Build a specific workspace:

```bash
npm run build --workspace=apps/api
npm run build --workspace=apps/web
```

## Project Structure

### Backend (apps/api)

```
apps/api/
├── src/
│   ├── index.ts              # Entry point, routes, queue consumer
│   ├── routes/               # API endpoints
│   │   ├── auth.ts           # /api/auth/* endpoints
│   │   ├── chats.ts          # /api/chats endpoints
│   │   ├── messages.ts       # /api/messages, RAG pipeline
│   │   └── documents.ts      # /api/documents endpoints
│   ├── lib/                  # Utility functions
│   │   ├── chunking.ts       # Text chunking for RAG
│   │   ├── embeddings.ts     # Vector operations
│   │   ├── llm.ts            # LLM clients (Groq)
│   │   └── auth.ts           # BetterAuth setup
│   ├── db/
│   │   ├── schema.sql        # D1 database schema
│   │   └── client.ts         # Kysely database client
│   └── types/
│       └── index.ts          # Type definitions
├── wrangler.toml             # Cloudflare configuration
└── package.json
```

Key files to know:
- `src/index.ts` - App entry point, all middleware and routes
- `src/routes/messages.ts` - RAG pipeline logic
- `src/lib/chunking.ts` - Legal text chunking algorithm
- `src/db/schema.sql` - Database schema

### Frontend (apps/web)

```
apps/web/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # Landing page
│   │   ├── login/            # Login page
│   │   └── chat/             # Chat interface
│   ├── components/           # React components
│   │   ├── ChatInterface.tsx # Main chat UI
│   │   ├── Message.tsx       # Message display
│   │   ├── Sidebar.tsx       # Chat history
│   │   └── ...other components
│   ├── lib/
│   │   ├── api.ts            # Centralized API client
│   │   └── constants.ts      # Constants
│   └── styles/
│       └── globals.css       # Global styles
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

Key files to know:
- `src/app/chat/page.tsx` - Chat interface
- `src/lib/api.ts` - API client with auth
- `src/components/ChatInterface.tsx` - Message handling and SSE

### Shared (packages/shared)

```
packages/shared/
├── src/
│   ├── schemas/              # Zod validation schemas
│   │   └── index.ts          # All schemas
│   ├── types/                # Type definitions
│   │   └── index.ts          # All types
│   └── utils/                # Utility functions
│       └── index.ts          # Shared utilities
└── package.json
```

## Development Workflow

### Making a Change

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write your code** following the code style guidelines (see below)

3. **Run tests locally**:
   ```bash
   make test
   make typecheck
   make lint
   ```

4. **Fix any issues** the tools report

5. **Commit your changes** with a clear message:
   ```bash
   git add <files>
   git commit -m "feat: add feature description"
   ```

6. **Push and create a Pull Request** to `main`

### Code Style Guidelines

#### Immutability (CRITICAL)

Always create new objects instead of mutating existing ones:

```typescript
// WRONG
const updateUser = (user: User, name: string) => {
  user.name = name; // Mutation!
  return user;
};

// CORRECT
const updateUser = (user: User, name: string) => {
  return { ...user, name }; // New object
};
```

#### File Organization

- **One responsibility per file**: Max ~300 lines, 800 absolute max
- **High cohesion**: Related code goes together
- **Low coupling**: Minimal dependencies between files
- **Feature-based structure**: Organize by domain, not by type

```
BAD:     components/Button.tsx, components/Input.tsx, components/Select.tsx
GOOD:    components/Form/Button.tsx, Form/Input.tsx, Form/Select.tsx
         (all form-related components together)
```

#### Naming Conventions

- **Functions**: camelCase, start with verb (`getUserChats`, `formatDate`)
- **Constants**: UPPER_SNAKE_CASE (`API_URL`, `MAX_FILE_SIZE`)
- **Types**: PascalCase (`User`, `ChatMessage`, `DocumentChunk`)
- **Files**: kebab-case for components (`chat-interface.tsx`, not `ChatInterface.tsx`)
- **Interfaces**: Prefix with `I` only if necessary (`User`, not `IUser`)

#### Error Handling

Always handle errors explicitly:

```typescript
try {
  const response = await fetch('/api/chats');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.json();
} catch (error) {
  console.error('Failed to fetch chats:', error);
  throw error; // Don't silently swallow
}
```

#### Input Validation

Validate all user input at system boundaries:

```typescript
// Good: Validate before use
const message = sendMessageSchema.parse(input);
const { content } = message;

// Backend: Always validate
app.post('/api/messages', async (c) => {
  const body = await c.req.json();
  const message = sendMessageSchema.parse(body); // Throws if invalid
  // ... process message
});
```

### Testing Requirements

We aim for **80%+ code coverage**. When writing features:

1. **Write tests first** (Test-Driven Development):
   ```bash
   npm test --watch --workspace=apps/api
   ```

2. **Write your tests** (RED phase - tests fail):
   ```typescript
   describe('chunking', () => {
     it('should split text into sections', () => {
       const chunks = chunkText('# Title\n\nContent');
       expect(chunks).toHaveLength(1);
     });
   });
   ```

3. **Implement** to make tests pass (GREEN phase)

4. **Refactor** if needed (IMPROVE phase)

5. **Verify coverage**:
   ```bash
   make test-coverage
   ```

### TypeScript Best Practices

- **Strict mode**: Use `strict: true` in `tsconfig.json`
- **No `any`**: Use `unknown` and type narrowing instead
- **Type safety**: Explicitly type function parameters and returns
- **Shared types**: Import from `packages/shared` for API contracts

```typescript
// WRONG
const fetchChat = async (id: any): any => { };

// CORRECT
const fetchChat = async (id: string): Promise<Chat> => { };
```

## Debugging

### Backend Debugging

Add console logs (will appear in wrangler dev output):

```typescript
console.log('Message received:', { chatId, content });
console.error('Vector search failed:', error);
```

View logs while server runs:

```bash
make dev
# Logs appear in the terminal
```

### Frontend Debugging

Use browser DevTools:
- Network tab: Check API requests and SSE streams
- Console: Check for client-side errors
- React DevTools extension: Inspect component state

### Database Debugging

Inspect local D1 database directly:

```bash
# After running make dev, in another terminal:
cd apps/api
npx wrangler d1 execute patrasaar-db --local --command="SELECT * FROM chats LIMIT 5;"
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create route handler in `apps/api/src/routes/`:
   ```typescript
   // routes/example.ts
   import { Hono } from 'hono';

   const app = new Hono();

   app.post('/example', async (c) => {
     const body = await c.req.json();
     const validated = exampleSchema.parse(body);
     return c.json({ success: true });
   });

   export default app;
   ```

2. Register in `src/index.ts`:
   ```typescript
   import exampleRoutes from './routes/example';
   app.route('/api', exampleRoutes);
   ```

3. Add Zod schema in `packages/shared/src/schemas/`:
   ```typescript
   export const exampleSchema = z.object({
     name: z.string(),
     value: z.number(),
   });
   ```

4. Write tests in `apps/api/src/routes/__tests__/example.test.ts`

5. Test locally: `make test` and `make dev`

### Adding a New Frontend Component

1. Create component in `apps/web/src/components/`:
   ```typescript
   // components/example-card.tsx
   interface ExampleCardProps {
     title: string;
     children: React.ReactNode;
   }

   export default function ExampleCard({ title, children }: ExampleCardProps) {
     return (
       <div className="rounded-lg border p-4">
         <h3 className="font-bold">{title}</h3>
         {children}
       </div>
     );
   }
   ```

2. Use in pages or other components:
   ```typescript
   import ExampleCard from '@/components/example-card';
   ```

3. Add tests in `apps/web/src/components/__tests__/example-card.test.tsx`

4. Run locally: `make dev` at `http://localhost:3000`

### Adding a Database Table

1. Add CREATE TABLE statement to `apps/api/src/db/schema.sql`

2. Run migration locally:
   ```bash
   make db-migrate
   ```

3. Update Kysely types in `apps/api/src/db/client.ts` if needed

4. Use in database queries:
   ```typescript
   const result = await db
     .selectFrom('new_table')
     .select('*')
     .execute();
   ```

5. Test the query locally

## Troubleshooting

### Dev Server Won't Start

```bash
# Check if ports are in use
lsof -i :8787      # API port
lsof -i :3000      # Web port

# Kill processes if needed (macOS/Linux)
kill -9 <PID>

# Or use different ports
PORT=3001 make dev
```

### Database Errors

```bash
# Reset local D1 database
rm -rf .wrangler/state/
make db-migrate

# Verify schema loaded
npx wrangler d1 execute patrasaar-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### Type Checking Failures

```bash
# Check for type errors
make typecheck

# Fix TypeScript issues
make format    # Auto-fix formatting
# Manually fix type errors indicated in output
```

### Test Failures

```bash
# Run tests with verbose output
npm test -- --reporter=verbose --workspace=apps/api

# Run specific test file
npm test -- chunking --workspace=apps/api

# Watch mode for development
npm test -- --watch --workspace=apps/api
```

### API Key Issues

```bash
# Verify Groq API key works
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "mixtral-8x7b-32768", "messages": [{"role": "user", "content": "test"}]}'
```

## Getting Help

- **Documentation**: See [ARCHITECTURE.md](./ARCHITECTURE.md) and [NEXT_STEPS.md](./NEXT_STEPS.md)
- **Code Examples**: Check existing route handlers and components
- **Issues**: Check GitHub issues for known problems
- **Discussions**: Ask in project discussions or open an issue

## Pull Request Checklist

Before submitting a PR:

- [ ] Code follows style guidelines (run `make format`)
- [ ] TypeScript type checking passes (`make typecheck`)
- [ ] All tests pass (`make test`)
- [ ] Test coverage is 80%+ for new code
- [ ] No hardcoded secrets or API keys
- [ ] Database migrations tested locally
- [ ] Commit messages are clear and descriptive
- [ ] Related issues are referenced in PR description

## Deployment

### To Production

1. Merge PR to `main` branch
2. GitHub Actions automatically builds and deploys:
   - Backend deploys to Cloudflare Workers
   - Frontend deploys to Vercel
3. Monitor deployment status in GitHub Actions
4. Verify changes in production

### Environment-Specific Behavior

```typescript
// Check environment
if (process.env.NODE_ENV === 'development') {
  console.log('Running in development');
}

// Backend
if (c.env.ENVIRONMENT === 'production') {
  // Production-specific logic
}
```

---

**Last Updated**: 2026-03-11

For more information, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [NEXT_STEPS.md](./NEXT_STEPS.md) - RAG v2 roadmap
- [../CLAUDE.md](../CLAUDE.md) - Project guidelines
