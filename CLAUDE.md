# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PatraSaar is an AI-powered platform that simplifies Indian legal documents. Users upload documents (PDF, DOCX, TXT, or URLs) and ask questions in natural language, receiving cited answers.

## Commands

```bash
# Development
make dev              # Start both API (port 8787) and web (port 3000)
make install          # Install dependencies

# Database
make db-migrate       # Run D1 migrations locally

# Quality
make test             # Run all tests (Vitest)
make test-coverage    # Tests with coverage
make lint             # Lint all packages
make typecheck        # TypeScript type checking
make format           # Format with Prettier

# Build
make build            # Build all packages

# Docker
make docker-up        # Start Docker dev environment
make docker-down      # Stop Docker dev environment
```

## Architecture

### Monorepo Structure (Turborepo)

```
apps/
  api/    Hono on Cloudflare Workers (auth, chat, RAG pipeline)
  web/    Next.js 15 + React 19 frontend
packages/
  shared/ Zod schemas and types shared across apps
```

### Backend (apps/api)

- **Framework**: Hono on Cloudflare Workers with queue consumers
- **Database**: Cloudflare D1 (SQLite) via Kysely
- **Storage**: Cloudflare R2 for file uploads
- **Vector Search**: Cloudflare Vectorize for semantic search
- **AI**: Cloudflare Workers AI for embeddings + Groq/OpenRouter for LLM
- **Auth**: BetterAuth with Google OAuth, session-based (no JWTs)

Key files:
- `src/index.ts` - App entry point, middleware, queue consumer for document processing
- `src/routes/chats.ts` - Chat CRUD operations
- `src/routes/messages.ts` - Message handling with RAG pipeline
- `src/lib/chunking.ts` - Legal text chunking with section awareness
- `src/db/schema.sql` - D1 database schema

### Document Processing Pipeline

1. Upload → Store in R2 → Create document record
2. Queue job → Parse (PDF/DOCX via Workers AI Vision or TXT directly)
3. Chunk text (section-aware, ~500 chars with overlap)
4. Generate embeddings (bge-base-en-v1.5) → Store in Vectorize
5. Ready for RAG queries

### Frontend (apps/web)

- **Framework**: Next.js 15 with App Router, React 19, Framer Motion
- **Routes**: `/` (landing), `/login`, `/chat`
- **API Client**: `src/lib/api.ts` - Centralized fetch wrapper with auth

### Shared Package (packages/shared)

- Zod schemas for validation (`createChatSchema`, `sendMessageSchema`, etc.)
- Type definitions (`Chat`, `Message`, `Document`, `Citation`)
- File validation helpers (`isAllowedFileType`, `isWithinSizeLimit`)
- API response types (`ApiResponse<T>`, `ApiError`)

## Environment Variables

Required in `.env`:
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GROQ_API_KEY`, `OPENROUTER_API_KEY`
- `NEXT_PUBLIC_API_URL` (frontend)

## Database Schema

Tables: `user`, `session`, `account`, `verification` (BetterAuth) + `chats`, `messages`, `documents`, `document_chunks`, `processing_jobs`, `usage_tracking`

All user-scoped queries filter by `user_id` at the database level.

## File Limits

- Max size: 10MB
- Max pages: 100
- Formats: PDF, TXT, DOC, DOCX