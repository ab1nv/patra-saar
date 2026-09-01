# PatraSaar — Sovereign Intelligence for Indian Law

> Internal engineering documentation. This repo is private.  
> For the non-technical product overview, see [PatraSaar.md](./PatraSaar.md).  
> For full deployment instructions, see [deploy.md](./deploy.md).

---

## What This Repo Contains

PatraSaar is a full-stack RAG + LLM monorepo. It has two deployable applications and two shared packages:

```
patrasaar/
├── apps/
│   ├── api/        Hono backend on Cloudflare Workers
│   └── web/        SvelteKit frontend on Vercel
├── packages/
│   ├── shared/     Shared TypeScript types used by both apps
│   └── eslint-config/  Shared ESLint rules
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend runtime | Cloudflare Workers | Zero cold start, native Vectorize/R2/D1 access |
| Backend framework | Hono v4 | Fastest TS framework on edge, zero deps |
| Frontend | SvelteKit 2 on Vercel | Best performance/complexity ratio, SSR |
| Vector DB | Cloudflare Vectorize | Native Workers integration, free tier |
| Document storage | Cloudflare R2 | S3-compatible, no egress fees |
| Metadata DB | Cloudflare D1 | SQLite at the edge, free tier |
| Embeddings | Workers AI (bge-base-en-v1.5) | Free, runs in same Workers infra |
| LLM | OpenRouter (Qwen3/Gemma4/gpt-oss) | Free models, easy swap to paid |
| Auth | Google OAuth 2.0 + JWT | Simple, trusted, no extra service |
| Package manager | pnpm | Faster installs, better monorepo support |
| Task runner | Turborepo | Parallel builds, smart caching |

---

## Quick Start

### Requirements

- Node.js 20+
- pnpm 9+
- A Cloudflare account (free)
- A Vercel account (free)
- A Google Cloud project with OAuth credentials

### Setup

```bash
# 1. Clone
git clone git@github.com:your-org/patrasaar.git && cd patrasaar

# 2. Install all dependencies
make install

# 3. Set up local environment files
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.env.example apps/web/.env
# Edit both files with your credentials (ask a teammate for values)

# 4. Run local DB migrations
make db-migrate

# 5. Start dev servers (frontend + backend simultaneously)
make dev
```

**Frontend:** http://localhost:5173  
**API:** http://localhost:8787  
**API Health check:** http://localhost:8787/health

---

## Repository Structure

### `apps/api/` — Backend

```
src/
├── index.ts              Entry point — Hono app, route registration
├── routes/               HTTP route handlers (thin — delegate to services)
│   ├── auth.ts           Google OAuth callback, /me, sign out
│   ├── documents.ts      PDF upload, list, delete, status
│   ├── inquiries.ts      RAG + LLM streaming endpoint
│   ├── cases.ts          Case folder CRUD
│   └── health.ts         Health check
├── middleware/
│   ├── auth.ts           JWT validation — applied to all protected routes
│   ├── ratelimit.ts      KV-based per-user rate limiting
│   └── logger.ts         Structured request logging
├── services/
│   ├── rag/              All RAG pipeline logic
│   │   ├── chunker.ts    PDF text → overlapping token chunks
│   │   ├── embedder.ts   Chunks → 768-dim vectors via Workers AI
│   │   ├── retriever.ts  Query → top-k chunks from Vectorize
│   │   └── pipeline.ts   Orchestrates full ingestion + retrieval flow
│   ├── llm/              LLM interaction layer
│   │   ├── client.ts     OpenRouter API client
│   │   ├── models.ts     Model registry + task-based model selection
│   │   ├── prompts.ts    System prompts (PatraSaar Intelligence persona)
│   │   └── stream.ts     SSE streaming from OpenRouter → client
│   ├── documents/        Document lifecycle management
│   │   ├── parser.ts     PDF binary → plain text extraction
│   │   ├── storage.ts    R2 upload/download helpers
│   │   └── metadata.ts   D1 CRUD for documents and chunks
│   └── citations/
│       └── extractor.ts  Post-process LLM output → structured Citations
├── types/
│   └── bindings.ts       TypeScript type for Cloudflare Worker `Env` bindings
└── utils/
    ├── errors.ts          Typed HTTP error classes (BadRequest, Unauthorized, etc.)
    └── validation.ts      Zod schemas for all request bodies
```

**Key rule:** Routes are thin. All business logic lives in `services/`. Routes just validate input, call a service, and return.

### `apps/web/` — Frontend

```
src/
├── routes/               SvelteKit file-based routing
│   ├── +page.svelte      Public landing page
│   ├── auth/             OAuth callback handler
│   └── (app)/            Protected route group — requires auth
│       ├── dashboard/    Home after login
│       ├── inquiries/    Chat interface + citation panel
│       ├── cases/        Case folder management
│       ├── library/      Uploaded documents list
│       └── profile/      User profile + subscription info
├── lib/
│   ├── components/       All Svelte components
│   │   ├── layout/       App shell, sidebar, topbar
│   │   ├── inquiry/      Chat bubbles, citation panel, streaming
│   │   ├── documents/    Upload, cards, summary
│   │   ├── cases/        Case cards, timeline
│   │   ├── ui/           Generic: Button, Badge, Card, Modal
│   │   └── landing/      Public landing page sections
│   ├── api/              API client functions (typed fetch wrappers)
│   ├── stores/           Svelte writable stores (auth, current inquiry, etc.)
│   └── utils/            Date formatters, string helpers, etc.
└── app.css               Global styles + design tokens (CSS variables)
```

### `packages/shared/`

TypeScript types shared between `apps/api` and `apps/web`. Import as:

```typescript
import type { Document, Citation, InquiryStreamEvent } from '@patrasaar/shared'
```

Never put business logic here — types and constants only.

---

## Make Commands

| Command | What it does |
|---|---|
| `make install` | Install all dependencies |
| `make dev` | Start frontend + backend with live reload |
| `make dev-api` | Start only the Cloudflare Workers backend |
| `make dev-web` | Start only the SvelteKit frontend |
| `make test` | Run all tests across all packages |
| `make test-api` | Run only backend unit/integration tests |
| `make test-e2e` | Run Playwright end-to-end tests |
| `make test-watch` | Run backend tests in watch mode |
| `make lint` | Check linting across all packages |
| `make lint-fix` | Auto-fix lint issues |
| `make typecheck` | TypeScript typecheck across all packages |
| `make build` | Production build all packages |
| `make db-migrate` | Apply D1 migrations locally |
| `make db-migrate-prod` | Apply D1 migrations to production |
| `make db-new-migration name=add_tags` | Create a new migration file |
| `make deploy-api-staging` | Deploy Workers to staging |
| `make deploy-api-prod` | Deploy Workers to production |
| `make deploy-web-prod` | Deploy SvelteKit to Vercel production |
| `make clean` | Remove all build artifacts + node_modules |

---

## Branch Strategy

```
feature/my-feature  →  PR to master  →  CI runs  →  merge  →  staging deploy
master              →  PR to prod    →  CI runs  →  merge  →  production deploy
```

- `master` → automatically deploys to staging on every push
- `prod` → automatically deploys to production on every push
- Never push directly to `prod` except for hotfixes

---

## Adding a New Feature (Correct Process)

1. Branch off `master`: `git checkout -b feature/my-feature`
2. **Write tests first** in `apps/api/test/` or `apps/web/e2e/`
3. Write the implementation to make tests pass
4. Run `make test` + `make lint` + `make typecheck` locally — all must pass
5. Open PR to `master` — CI runs automatically, CodeRabbit posts review
6. Address review comments, get approval, merge
7. Verify on staging, then open PR from `master` → `prod` to release

---

## LLM Model Strategy

PatraSaar uses three models from OpenRouter, all currently free:

| Role | Model | Used For |
|---|---|---|
| Primary | `qwen/qwen3-next-80b-a3b-instruct:free` | Standard Q&A, summaries, most queries |
| Fallback | `google/gemma-4-26b-a4b:free` | When primary hits rate limits |
| Heavy | `openai/gpt-oss-120b:free` | Complex contract analysis, multi-doc |

When upgrading to paid models, change the strings in `apps/api/src/services/llm/models.ts`. Nothing else needs to change.

---

## CI/CD Overview

All CI is in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | PR to master or prod | Lint, typecheck, test, coverage |
| `deploy-staging.yml` | Push to master | Deploy API to CF staging + web to Vercel preview |
| `deploy-prod.yml` | Push to prod | Deploy API to CF production + web to Vercel production |
| `ai-review.yml` | PR opened/updated | CodeRabbit AI posts inline review comments |

Required GitHub secrets — see [deploy.md](./deploy.md) section 5a for the full list.

---

## Environment Variables

See `.dev.vars.example` (API) and `.env.example` (web) for all required variables.  
See [deploy.md](./deploy.md) for how to set these in production.

---

## Database

PatraSaar uses Cloudflare D1 (SQLite at the edge). Migrations live in `apps/api/migrations/`.

- Never edit D1 directly in production — always write a migration
- Migration naming: `0001_create_users.sql`, `0002_create_documents.sql`, etc.
- Schema reference: [technical-spec.md](./technical-spec.md) section 9

---

## Questions?

Read [technical-spec.md](./technical-spec.md) for architecture decisions.  
Read [deploy.md](./deploy.md) for deployment procedures.  
Read [PatraSaar.md](./PatraSaar.md) to understand what the product does and why.
