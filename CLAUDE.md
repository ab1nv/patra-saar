# CLAUDE.md

<<<<<<< master
<<<<<<< HEAD
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
=======
=======
>>>>>>> master
This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**PatraSaar** is an AI-powered platform for simplifying Indian legal documents using RAG (Retrieval-Augmented Generation).

### What It Does
- Users upload legal documents (PDF, DOCX, TXT) or provide URLs
- Documents are parsed, chunked, and embedded
- When users ask questions, relevant document chunks are retrieved and used as context
- Responses are grounded in uploaded documents with citations

### Current Status: RAG Pipeline — Phase 1 & 2 Complete ✅

**Progress**: Phase 1 (Document Parsing) and Phase 2 (Citation Extraction) are complete with 96%+ test coverage.

**Completed Work**:
- ✅ **Phase 1**: Document parsing for PDF, DOCX, TXT with 58 tests
- ✅ **Phase 2**: Citation extraction & verification with 42 tests
- ✅ **Total Coverage**: 113 tests passing, 96.03% statements, 100% functions

**What Works Now**:
- PDF extraction (unpdf library — Workers-compatible)
- DOCX extraction (mammoth.js)
- TXT extraction with encoding detection
- LLM response citation extraction and verification
- Citation storage in messages table
- 96%+ test coverage with comprehensive edge case handling

**Next Phase (Phase 3)**: Knowledge Base Creation (bulk ingestion, admin API, KB schema)

---

## Tech Stack & Architecture

### Frontend (Next.js 15)
- **Framework**: Next.js 15 with React 19, Framer Motion
- **Location**: `apps/web/src`
- **Structure**:
  - `app/` - Pages (landing, chat, login)
  - `lib/` - Utilities and helpers
  - Tests in `__tests__/`

### API (Hono on Cloudflare Workers)
- **Framework**: Hono 4 (lightweight, perfect for Workers)
- **Location**: `apps/api/src`
- **Structure**:
  ```
  api/src/
  ├── index.ts           Main app + queue consumer for document processing
  ├── env.ts             Cloudflare bindings (DB, STORAGE, VECTORIZE, AI)
  ├── routes/            API endpoints (chats.ts, messages.ts)
  ├── auth/              Google OAuth via BetterAuth
  ├── lib/               Utilities (chunking.ts for legal-aware text splitting)
  └── db/                Database schema (D1 SQLite)
  ```

### Data Pipeline (Document → Knowledge Base)
```
User Upload → R2 Storage → Queue → Parse → Chunk → Embed → Vectorize
                                         ↓
                              Stored in D1 (chunks table)
```

### Shared Package
- **Location**: `packages/shared/src`
- **Purpose**: Zod schemas, validation, type definitions
- Imported by both frontend and API

---

## Current RAG Implementation

### What Works ✅

#### 1. **Document Parsing** ✅ PHASE 1 COMPLETE
- **File**: `apps/api/src/lib/document-parser.ts`
- **Tests**: 58 tests, 100% coverage
- **Features**:
  - PDF extraction via `unpdf` (Workers-compatible)
  - DOCX extraction via `mammoth.js`
  - TXT extraction with encoding detection
  - Proper error handling with detailed messages
  - Edge cases: corrupted files, invalid formats, empty documents
- **Replaces**: Workers AI vision fallback (slow, expensive, inaccurate)

#### 2. **Process Document Pipeline** ✅ PHASE 1 COMPLETE
- **File**: `apps/api/src/lib/process-document.ts`
- **Tests**: 58 tests (shared with document-parser)
- **Features**:
  - End-to-end pipeline: parse → chunk → embed
  - Integrates document parsing, chunking, and embedding
  - Stores chunks in D1 with metadata (section, page, clause_ref)
  - Stores vectors in Vectorize (768-dim, cosine metric)
  - Comprehensive error handling and logging

#### 3. **Citation Extraction** ✅ PHASE 2 COMPLETE
- **File**: `apps/api/src/lib/citation-extractor.ts`
- **Tests**: 42 tests, 97.72% coverage
- **Features**:
  - Extracts [N] references from LLM responses
  - Verifies citations against source chunks
  - Handles malformed citations ([1a], [2.5], [99])
  - Ignores citations in code blocks
  - Deduplicates with position tracking
  - Returns structured citations with content

#### 4. **Text Chunking** ✅
- **File**: `lib/chunking.ts`
- **Tests**: 82.5% coverage (expanded needed for edge cases)
- **Features**:
  - Legal-aware: splits by sections (Section, Article, Clause, Chapter)
  - Max 1500 chars per chunk with 200-char overlap
  - Extracts section metadata (Section #, Article #, etc.)

#### 5. **Query & Search** ✅
- **File**: `routes/messages.ts`
- **Updated for**: Citation extraction integration
- **Features**:
  - Embeds user query
  - Searches Vectorize for top-10 relevant chunks (filters by chat_id + user_id)
  - Retrieves chunk content from D1
  - Streams LLM response via SSE using Groq's Llama 3.3 70B
  - Extracts and returns citations in streaming response

### What Needs Work (Remaining Phases)

#### Phase 3: **Knowledge Base Creation**
- Currently: Ad-hoc document uploads per chat
- **Todo**:
  - Design KB schema (categories, versions, timestamps)
  - Create bulk ingestion endpoint for canonical documents
  - Add admin API to manage documents
  - Implement document versioning

#### Phase 4: **Search Quality**
- Current: Simple top-K vector search
- **Issues**:
  - No hybrid search (BM25 + semantic)
  - No relevance threshold (poor matches still returned)
  - No re-ranking of results
- **Todo**:
  - Implement hybrid search
  - Add cosine similarity threshold filtering
  - Test on real legal queries

#### Phase 5: **Error Handling & Resilience**
- Document processing can fail silently
- No retry logic for failed embeddings
- **Todo**:
  - Improve failure recovery
  - Add retry logic for failed operations
  - Better validation throughout pipeline

---

## Development Commands

### Quick Start
```bash
make install          # Install dependencies
make dev              # Start API (localhost:8787) + Web (localhost:3000)
make test             # Run all tests
make build            # Build all packages
make format           # Format code with Prettier
make db-migrate       # Run D1 migrations locally
```

### Testing
```bash
# Run tests (all workspaces)
npm test

# Test specific workspace
npm test --workspace=apps/api
npm test --workspace=apps/web

# Coverage report
npm run test:coverage

# Watch mode (from specific workspace)
cd apps/api && npm run test -- --watch
```

### Linting & Type Checking
```bash
make lint             # Run Next.js linter (web only)
make typecheck        # Run TypeScript on all packages
```

### Database
```bash
# Local D1 setup
make db-migrate

# View local DB (if sqlite3 installed)
sqlite3 .wrangler/state/d1/indices/patrasaar-db.sqlite3
```

---

## Key Files for RAG Development

### Phase 1 & 2 Complete Files
| File | Purpose | Status |
|------|---------|--------|
| `apps/api/src/lib/document-parser.ts` | PDF/DOCX/TXT extraction | ✅ 100% coverage |
| `apps/api/src/lib/document-parser.test.ts` | Document parsing tests | ✅ 58 tests |
| `apps/api/src/lib/process-document.ts` | End-to-end processing pipeline | ✅ 100% coverage |
| `apps/api/src/lib/process-document.test.ts` | Pipeline tests | ✅ 58 tests |
| `apps/api/src/lib/citation-extractor.ts` | Citation extraction from LLM responses | ✅ 97.72% coverage |
| `apps/api/src/lib/citation-extractor.test.ts` | Citation tests | ✅ 42 tests |

### Existing Files (Updated)
| File | Purpose |
|------|---------|
| `apps/api/src/lib/chunking.ts` | Legal-aware text splitting |
| `apps/api/src/lib/chunking.test.ts` | Chunk tests |
| `apps/api/src/index.ts` | Document processing queue consumer (simplified) |
| `apps/api/src/routes/messages.ts` | Query endpoint, embedding + search + LLM streaming + citations |
| `apps/api/src/db/schema.sql` | D1 tables: documents, document_chunks, messages, processing_jobs |
| `packages/shared/src/index.ts` | Zod schemas (extended citationSchema) |

---

## Database Schema (Key Tables)

### `documents`
Uploaded files or URLs, scoped by user + chat
```sql
id, chat_id, message_id, user_id, original_filename, file_type,
file_size, r2_key, source_url, status (pending/processing/ready/failed),
chunk_count, error_message, created_at, processed_at
```

### `document_chunks`
Parsed and chunked text from documents
```sql
id, document_id, chunk_index, content, metadata (JSON: section, page, etc.)
```

### `processing_jobs`
Async job tracking for document processing
```sql
id, document_id, status (queued/parsing/chunking/embedding/ready/failed),
progress (0-100), error_message, created_at, updated_at
```

### `messages`
Chat history (user & assistant messages, scoped by chat_id + user_id)
```sql
id, chat_id, role (user/assistant), content, citations (nullable),
tokens_used (nullable), created_at
```

---

## API Endpoints

### Chat Management
```
POST   /api/chats                    # Create chat
GET    /api/chats                    # List user's chats
GET    /api/chats/:chatId            # Get chat with message history
DELETE /api/chats/:chatId            # Delete chat (soft delete)
```

### Messages & RAG
```
POST   /api/chats/:chatId/messages   # Send message (optionally upload file/URL)
                                      # Returns SSE stream of AI response
GET    /api/chats/:chatId/messages   # Get chat history

GET    /api/chats/jobs/:jobId/status # Poll document processing status
```

**Note**: Messages endpoint handles both text queries AND document uploads. If file is provided, it queues processing and returns early. Frontend polls status, then re-queries for AI response.

---

## Cloudflare Resources (Current Setup)

### D1 Database
- **Name**: patrasaar-db
- **ID**: 0f96dcd7-feda-4103-9070-043abaa0a6fd (in `wrangler.toml`)
- **Status**: ✅ Active

### R2 Storage
- **Status**: 🟡 **Commented out** in `wrangler.toml` (line 17-19)
- **Todo**: Uncomment and create bucket `patrasaar-uploads`
- **Purpose**: Store uploaded PDF/DOCX files before processing

### Processing Queue
- **Status**: 🟡 **Commented out** in `wrangler.toml` (line 21-29)
- **Todo**: Uncomment and enable (requires Cloudflare Workers Queues)
- **Purpose**: Async document parsing + embedding

### Vectorize
- **Name**: patrasaar-docs
- **Dimensions**: 768 (for bge-base-en-v1.5)
- **Metric**: cosine
- **Status**: ✅ Active (but needs indexing via queue consumer)

### Workers AI
- **Models used**:
  - `@cf/baai/bge-base-en-v1.5` - Text embeddings (768-dim)
  - `@cf/meta/llama-3.2-11b-vision-instruct` - Document vision (PDF fallback)
- **Status**: ✅ Active (fallback for document parsing)

### Secrets (set via `wrangler secret put` or `.dev.vars`)
```
BETTER_AUTH_SECRET       # Random 32+ char string
BETTER_AUTH_URL          # e.g., https://patrasaar-api.workers.dev
GOOGLE_CLIENT_ID         # From Google Cloud Console
GOOGLE_CLIENT_SECRET     # From Google Cloud Console
GROQ_API_KEY             # From console.groq.com
OPENROUTER_API_KEY       # Fallback LLM (optional)
```

---

## Patterns & Best Practices

### Error Handling
- Always validate inputs at route level
- Return structured errors: `{ error: { message, code } }`
- Log to console (visible in wrangler tail)
- For async jobs: track failures in processing_jobs table with error_message

### Database Queries
- Use prepared statements (Kysely or raw `.prepare().bind()`)
- Always scope by user_id for security (no cross-user leaks)
- Limit query results (e.g., LIMIT 10 for chat history)

### Chunking & Metadata
- Preserve section/page info in metadata (needed for citations)
- Keep chunks under 1500 chars (token budget for LLM context)
- Test chunking on actual legal documents (IPC, IT Act, contracts)

### Streaming Responses
- Use SSE (Server-Sent Events) for long-running operations
- Send `{ type: 'token', content: '...' }` for streamed text
- Send `{ type: 'done', messageId: '...' }` at end
- Always handle errors gracefully (send error before closing)

### Citation Strategy (Todo)
- Extract [N] references from LLM output
- Cross-check against provided context chunks
- Return structured citations: `{ refNumber, section, page, snippet }`
- Store citations in messages table for future reference

---

## Testing Strategy

### Current Coverage
- Chunking tests exist (`lib/chunking.test.ts`) — **expand these**
- Basic integration tests in `packages/shared`
- Frontend landing/login page tests

### What's Missing (Priority)
1. **RAG Integration Tests**
   - Mock Vectorize search
   - Test query embedding → search → context retrieval
   - Test LLM streaming

2. **Document Processing Tests**
   - Test chunking on various document types
   - Test metadata extraction
   - Test error recovery

3. **E2E Tests**
   - Upload document → check processing → query → verify response

4. **Citation Tests**
   - Verify extracted citations match source chunks

---

## Local Development Tips

### Running Workers Locally
```bash
cd apps/api
npm run dev
# API runs on http://localhost:8787
# Use wrangler tail to see logs
```

### Debugging Document Processing
- Processing jobs stuck in "queued"? Queue binding may not be active
- Embedding failures? Check Vectorize limits or Workers AI quota
- Chunking issues? Test with `npx ts-node lib/chunking.ts < sample.txt`

### Testing Embeddings Locally
If Workers AI isn't available in local dev, the `streamRagResponse` function has a fallback that returns a simple error. For production testing, deploy to Cloudflare.

### Database Inspection
```bash
# After running migrations
sqlite3 .wrangler/state/d1/indices/patrasaar-db.sqlite3

# View documents table
SELECT id, original_filename, status, chunk_count FROM documents;

# View chunks for a document
SELECT id, content, metadata FROM document_chunks WHERE document_id = '...';
```

---

## Common Workflows

### Adding a New API Endpoint
1. Define Zod schema in `packages/shared/src/index.ts`
2. Create route handler in `apps/api/src/routes/`
3. Add auth middleware if needed: `messages.use('*', requireAuth)`
4. Return structured response: `c.json({ data: ... })` or error
5. Add tests in `__tests__/` directory
6. Test locally with `npm run dev` + `curl`

### Improving Document Parsing
1. Update `processDocument` function in `index.ts`
2. Integrate new parsing library (pdf-parse, mammoth, etc.)
3. Improve text extraction quality
4. Test on sample legal documents (Indian IPC, IT Act, contracts)
5. Add error handling for unsupported formats

### Implementing Knowledge Base
1. Design schema for canonical documents (categories, versions)
2. Create admin bulk ingest endpoint
3. Build UI for KB management
4. Update query routing to optionally use KB vs. user-uploaded docs
5. Add versioning for KB updates

---

## Performance & Costs

### Cloudflare Limits (Free Tier)
- **D1**: 3GB storage (unlimited queries)
- **R2**: 10GB/month free storage
- **Vectorize**: 100K monthly requests (low cost after free tier)
- **Workers AI**: Bundled with Workers, with usage limits

### Optimizations for RAG
- **Chunking**: Larger chunks (1500 chars) reduce embedding costs
- **Search**: Filter by chat_id + user_id to reduce Vectorize scans
- **Caching**: Consider caching frequent embeddings (query deduplication)
- **Batch Embedding**: Process chunks in batches of 50 (already done)

### Cost Estimate (at scale)
- Per document upload: ~$0.01-0.05 (parsing + embeddings + storage)
- Per query: ~$0.001-0.005 (embedding + search + LLM streaming)

---

## Deployment

### Local → Production Checklist
- [ ] R2 bucket enabled and working
- [ ] Processing Queue enabled
- [ ] Vectorize index populated with documents
- [ ] All Cloudflare secrets configured
- [ ] Document parsing tested on real PDFs/DOCX
- [ ] Tests passing (80%+ coverage on RAG pipeline)
- [ ] Citation extraction working
- [ ] Error handling in place

### Deploy API
```bash
cd apps/api
npx wrangler deploy
```

### Deploy Frontend
```bash
cd apps/web
npm run build
npx wrangler pages deploy out
```

---

## Future Roadmap

### Phase 1: Complete RAG ✅ DONE
- [x] Proper document parsing (unpdf + mammoth)
- [x] Citation extraction & verification
- [x] Comprehensive tests (113 tests, 96%+ coverage)

### Phase 2: Remaining Work

#### Phase 3: Knowledge Base (Next)
- [ ] Design KB schema & admin API
- [ ] Bulk document ingestion endpoint
- [ ] Document versioning & categories
- [ ] KB management UI

#### Phase 4: Search Quality
- [ ] Hybrid search (BM25 + semantic)
- [ ] Relevance threshold filtering
- [ ] Result re-ranking

#### Phase 5: Polish & Resilience
- [ ] Response quality metrics
- [ ] User feedback loop (thumbs up/down)
- [ ] Improved error recovery & retry logic
- [ ] Custom prompts per document type

---

## Contact & Debug

- **Local logs**: `wrangler tail` (watch real-time API logs)
- **Errors**: Check processing_jobs.error_message for document processing failures
- **Type issues**: `make typecheck` before committing
- **Format**: Run `make format` to auto-fix style

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
<<<<<<< master
>>>>>>> 0b6e2ba (MVP Ready pre-test)
=======
>>>>>>> master
