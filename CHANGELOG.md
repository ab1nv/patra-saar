# Changelog

All notable changes to PatraSaar are documented in this file.

## [Unreleased]

### Added

#### RAG Pipeline — Full End-to-End Implementation
- **Implemented `/inquiries/stream` endpoint** (`apps/api/src/routes/inquiries.ts`)
  - Accepts `{ documentIds, question }` over HTTP POST
  - Streams LLM responses as Server-Sent Events (SSE)
  - Persists inquiries + answers + citations to D1 in the background
  - Includes list and get endpoints for inquiry history

- **Python legal corpus ingestion script** (`apps/api/scripts/ingest_legal_corpus.py`)
  - Async ingestion with configurable concurrency (rate limit friendly)
  - Processes 6 Indian legal PDFs: IPC, BNS 2023, Contract Act, IT Act, Companies Act, Bharatiya Sakshya Adhiniyam
  - Chunks via LangChain RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
  - Embeds via Cloudflare Workers AI (bge-base-en-v1.5)
  - Writes to both Vectorize (vectors) and D1 (full text) in parallel
  - Environment variable validation deferred to main() to allow testing/imports

#### RAG Context Building — Critical Fix
- **`buildContext()` now retrieves full chunk text from D1** (`apps/api/src/services/rag/pipeline.ts:buildContext()`)
  - **Before:** Only emitted `[LEGAL REFERENCE] (score: 0.87)` — LLM received empty context
  - **After:** Fetches full text via `SELECT ... WHERE vector_id IN (...)` from D1 chunks table
  - Builds proper context blocks with source attribution, relevance scores, and full text
  - LLM now receives substantive context from legal corpus + user documents

### Documentation

- **New:** `docs/RAG_PIPELINE.md` — Complete RAG architecture guide
  - Ingestion flow (chunking → embedding → storage)
  - Retrieval flow (query → vector search → context building → LLM)
  - Database schema and why both Vectorize + D1 are required
  - Configuration, performance notes, testing instructions
  - Architecture decisions and common issues

### Fixed

- **D1 chunks table now populated for legal corpus**
  - Before: `ingest_legal_corpus.py` only wrote to Vectorize; D1 was empty → buildContext had no text to retrieve
  - After: Python script inserts into D1 via Cloudflare REST API batch endpoint
  - Full chunk text preserved (not truncated like Vectorize metadata)
  - Matches vector_id for fast lookup during retrieval

- **RAG context now includes actual content**
  - Before: LLM received only labels and relevance scores
  - After: LLM receives full chunk text with source attribution
  - Answers are now grounded in verified legal text, not training data hallucinations

- **Removed module-level sys.exit(1) from Python ingestion script**
  - Before: Environment variable check ran at import time, breaking testability
  - After: Check deferred to `async_main()`, script is importable in tests

### Infrastructure

- **Updated wrangler.toml defaults**
  - D1_DATABASE_ID hardcoded to production database in Python script (for simplicity)
  - Can be overridden via env var if needed
  - CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required for ingestion

---

## [1.0.0] — 2026-04-12

### Initial Release

Full-stack RAG legal assistant for Indian law:
- **Backend:** Hono on Cloudflare Workers (D1, KV, Vectorize, Workers AI)
- **Frontend:** SvelteKit 2 on Vercel
- **Auth:** Google OAuth 2.0 + JWT
- **LLM:** OpenRouter (Gemini Flash, Qwen, Gpt-OSS)
- **E2E Tests:** Playwright with auth fixtures
- **CI/CD:** GitHub Actions (lint, test, deploy to staging/prod)

#### Features
- User authentication (Google OAuth)
- Document upload & automatic RAG ingestion
- Legal case management (CRUD)
- Inquiry history with streaming LLM responses
- Dual-namespace Vectorize for user docs + legal corpus
- D1 SQLite backend for all metadata
- Server-sent event streaming for real-time LLM responses

#### Known Limitations
- Legal corpus ingestion is manual (one-time via Python script)
- LLM model selection is hardcoded (no per-query model switching yet)
- No batch API for document upload (single file only)
- No offline mode

---

## How to Read This Changelog

- **Added:** New features or capabilities
- **Fixed:** Bug fixes and corrections
- **Changed:** Updates to existing features
- **Deprecated:** Features marked for removal
- **Removed:** Deleted features
- **Security:** Security fixes or improvements
- **Documentation:** Docs-only updates

Dates are YYYY-MM-DD. Versions follow [SemVer](https://semver.org/).
