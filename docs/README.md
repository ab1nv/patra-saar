# PatraSaar Documentation

Welcome to the PatraSaar documentation. This directory contains guides for understanding the system architecture, contributing to the project, and implementing future enhancements.

## Documentation Files

### [ARCHITECTURE.md](./ARCHITECTURE.md)
**Understand how PatraSaar works**

Comprehensive system design documentation covering:
- Monorepo structure (Turborepo, workspaces)
- Technology stack (Hono, Next.js, Cloudflare, D1, R2, Vectorize, Queues)
- Backend architecture (routes, RAG pipeline, database schema)
- Frontend architecture (components, API client, state management)
- Data flow diagrams (document upload, message/RAG flow)
- Security model and authentication
- Deployment and performance considerations

**Read this if**: You're new to the project, need to understand how components interact, or planning major changes.

---

### [NEXT_STEPS.md](./NEXT_STEPS.md)
**Implement RAG v2 enhancements**

Complete implementation roadmap for advancing the RAG pipeline with:
- **Phase 1**: Enrich chunk metadata (page numbers, section titles)
- **Phase 2**: Hybrid retrieval (vector search + FTS5 BM25)
- **Phase 3**: Reranking (BGE reranker model)
- **Phase 4**: Contextual compression (extract relevant sentences)
- **Phase 5**: Structured citations (parse and save references)
- **Phase 6**: Source cards UI (display citations in frontend)
- **Phase 7**: Multi-document visibility (show which docs are queried)

Each phase includes:
- Specific code changes with examples
- Files affected (backend/frontend/database)
- Testing requirements
- Risk assessment and mitigation
- Timeline estimates

**Read this if**: You're implementing new features, improving retrieval quality, or adding UI enhancements.

---

### [CONTRIBUTING.md](./CONTRIBUTING.md)
**Set up development environment and follow workflow**

Complete guide for developers including:
- Prerequisites and setup (Node.js, API keys, environment variables)
- Installation (`make install`)
- Starting development servers (`make dev`)
- Available commands and their purposes
- Project structure and key files
- Development workflow (branching, testing, commits)
- Code style guidelines (immutability, naming, error handling)
- Testing requirements (80%+ coverage, TDD approach)
- Debugging techniques
- Common development tasks
- Troubleshooting guide
- PR checklist

**Read this if**: You're a developer setting up the project or contributing code.

---

## Quick Start

### First Time Setup
1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) - Installation section
2. Run `make install` and `make dev`
3. Check API at http://localhost:8787 and web at http://localhost:3000

### Understanding the Project
1. Start with [ARCHITECTURE.md](./ARCHITECTURE.md) - Overview section
2. Read the monorepo and technology stack sections
3. Review the data flow diagrams

### Implementing Features
1. Check [NEXT_STEPS.md](./NEXT_STEPS.md) for planned work
2. Follow the phase breakdown and file references
3. Use [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow

---

## Key Concepts

### RAG (Retrieval-Augmented Generation)
The system retrieves relevant document chunks and provides them as context to an LLM, enabling accurate, cited responses. See [ARCHITECTURE.md](./ARCHITECTURE.md#rag-pipeline-architecture) for the pipeline.

### Monorepo Structure
The project uses Turborepo to manage three workspaces:
- `apps/api` - Backend (Hono on Cloudflare Workers)
- `apps/web` - Frontend (Next.js 15)
- `packages/shared` - Shared types and schemas

See [ARCHITECTURE.md](./ARCHITECTURE.md#monorepo-structure) for the full structure.

### Authentication
Uses BetterAuth with Google OAuth, storing sessions in D1 database. No JWT tokens, cookie-based sessions only.

### Cloudflare Stack
All backend infrastructure uses Cloudflare services:
- **D1**: SQLite database
- **R2**: File storage
- **Vectorize**: Vector embeddings index
- **Queues**: Async document processing
- **Workers AI**: Embeddings and reranking models

---

## Development Commands

```bash
# Setup and development
make install              # Install dependencies
make dev                  # Start API + Web servers
make db-migrate           # Initialize D1 database

# Quality checks
make test                 # Run all tests
make test-coverage        # Tests with coverage report
make lint                 # Lint code
make typecheck            # Type checking
make format               # Format code

# Building
make build                # Build all packages
make clean                # Clean artifacts
```

For detailed command descriptions, see [CONTRIBUTING.md](./CONTRIBUTING.md#available-commands).

---

## Architecture at a Glance

### Current Flow (v1)
```
Upload PDF → R2 → D1 → Parse → Chunk → Embed → Vectorize
                                                      ↓
Question → Embed → Vector Search → LLM Stream → User
```

### RAG v2 Flow (Planned)
```
Upload → [Enrich metadata with page/section info]
              ↓
         [Hybrid search: Vector + FTS5]
              ↓
         [Rerank with BGE model]
              ↓
         [Compress chunks with Groq]
              ↓
         [Generate response with citations]
              ↓
         [Display source cards in UI]
```

---

## File Structure Reference

**Backend Files**:
- `apps/api/src/routes/messages.ts` - RAG pipeline
- `apps/api/src/lib/chunking.ts` - Text chunking algorithm
- `apps/api/src/db/schema.sql` - Database schema

**Frontend Files**:
- `apps/web/src/app/chat/page.tsx` - Chat interface
- `apps/web/src/lib/api.ts` - API client
- `apps/web/src/components/` - React components

**Shared**:
- `packages/shared/src/schemas/` - Zod validation
- `packages/shared/src/types/` - Type definitions

---

## Common Questions

**Q: How do I run tests?**
A: `make test` for all tests, or `npm test --watch --workspace=apps/api` for specific workspace.

**Q: Where do I add API keys?**
A: Create `.env` file in `apps/api/` with GROQ_API_KEY, GOOGLE_CLIENT_SECRET, etc. See [CONTRIBUTING.md](./CONTRIBUTING.md#environment-variables).

**Q: How do I deploy changes?**
A: Merge to `main` branch. GitHub Actions automatically deploys backend to Cloudflare Workers and frontend to Vercel.

**Q: What's the next major feature?**
A: RAG v2 with hybrid retrieval, reranking, compression, and citations. See [NEXT_STEPS.md](./NEXT_STEPS.md).

**Q: Where is the database?**
A: Cloudflare D1 (SQLite). Locally stored in `.wrangler/state/`. Schema in `apps/api/src/db/schema.sql`.

---

## Related Files

- **[../CLAUDE.md](../CLAUDE.md)** - Project guidelines for Claude Code
- **[../Makefile](../Makefile)** - Development commands
- **[../package.json](../package.json)** - Workspace configuration

---

**Last Updated**: 2026-03-11

For questions or issues, check the existing documentation first, then open an issue on GitHub.
