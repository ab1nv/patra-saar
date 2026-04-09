# PatraSaar Architecture & Techniques

## Core Concept: Dual-RAG

**RAG (Retrieval-Augmented Generation)** = ground LLM responses in actual documents instead of relying on training data.

**Dual-RAG** = search two knowledge sources in parallel:
1. **Knowledge Base (KB)**: curated Indian legal statutes (Transfer of Property Act, Tenancy Laws, etc.)
2. **User Documents**: uploaded contracts, agreements, complaints

Results are labeled [KB-N] and [DOC-N] so user knows which source each cite comes from.

---

## Tech Stack & Where It Goes

```
Frontend                 API                      Data Layer
─────────────           ─────────────             ──────────
Next.js 15             Hono 4                    D1 (SQLite)
React 19               Cloudflare Workers        R2 Storage
react-markdown         Workers AI                Vectorize
                       Groq LLM
```

### Frontend (`apps/web`)
- **Next.js 15**: SSR + static export for Cloudflare Pages
- **React 19**: UI components, state management (useState/useEffect)
- **react-markdown**: render LLM responses as formatted text (bullets, headings, bold)
- **Framer Motion**: page transitions (category selection slide-down)
- **API client**: custom `createSSEReader` for streaming responses

### API (`apps/api`)
- **Hono 4**: lightweight HTTP framework (tiny bundle, perfect for Workers CPU limits)
- **Cloudflare Workers**: serverless compute (30s execution time per request)
- **BetterAuth**: Google OAuth + httpOnly session cookies
- **Workers AI**: embed text (bge-base-en-v1.5, 768-dim vectors)

### Data Layer
- **D1**: SQLite database (chats, messages, documents, chunks, KB tables)
- **R2**: object storage for uploaded PDFs/DOCX files
- **Vectorize**: vector index for semantic search (cosine metric)

### External APIs
- **Groq**: streaming LLM (llama-3.3-70b-versatile, faster/cheaper than OpenAI)
- **Google OAuth**: user authentication

### Ingest (`packages/ingest`)
- **CLI tool** (offline, run locally): read text files → chunk → embed → upload to D1 + Vectorize
- Uses Cloudflare REST APIs to call Workers AI and D1 from your machine

---

## Workflows

### 1. Document Upload & Processing

```
User uploads PDF
      ↓
Frontend: POST /api/chats/:chatId/messages (FormData)
      ↓
API: saveToR2(file) → calls processDocument() inline
      ↓
processDocument() pipeline:
  1. Parse:   PDF/DOCX → raw text (unpdf/mammoth)
  2. Chunk:   split at Section boundaries (~512 tokens/chunk)
  3. Embed:   call Workers AI bge-base-en-v1.5 (batch of 50)
  4. Store:   write chunks to D1, vectors to Vectorize
      ↓
API: SSE stream sends progress events: {type: 'progress', stage, progress}
      ↓
Frontend: progress bar updates, then calls dual-RAG if user included query text
```

**Parallel processing note**: Everything happens in one request (inline, not queued). Vectorize upsert metadata includes `type: 'user'` to filter later.

### 2. Query & Dual-RAG Search

```
User types query
      ↓
Frontend: POST /api/chats/:chatId/messages (JSON: {content})
      ↓
API streamRagIntoController():
  
  1. Embed query:  Workers AI → 768-dim vector
  
  2. Parallel search:
     ├─ Vectorize.query(vector) filter {type:'kb', category_id}        → topK=8
     └─ Vectorize.query(vector) filter {type:'user', chat_id, user_id} → topK=5
  
  3. Fetch chunks from D1:
     ├─ KB chunks: join kb_chunks + kb_sources (get title, jurisdiction)
     └─ User chunks: join document_chunks
  
  4. Assemble context:
     "═══ KNOWLEDGE BASE ═══
      [KB-1] Transfer of Property Act, 1882 — Section 105: '...'
      
      ═══ USER'S DOCUMENT ═══
      [DOC-1] Clause 7: '...'"
  
  5. Build system prompt:
     Instructs LLM: cite [KB-N] for law, [DOC-N] for user doc, compare + analyze
  
  6. Stream response via Groq (SSE):
     Loop through Groq stream → send tokens to frontend as {type: 'token'}
  
  7. Extract citations:
     Parse LLM output for [KB-N] and [DOC-N] patterns
     Verify each citation matches a source chunk
     Store in messages table
      ↓
Frontend: SSE stream updates message in real-time, renders citations as colored pills
```

### 3. Knowledge Base Ingestion (Offline)

```
Developer: npm run ingest -- --file statute.txt --category cat_rental

CLI: read statute.txt → clean text
     ↓
Chunk: split at Section/Article boundaries (KB_CHUNK_MAX=2000 chars)
     ↓
Embed: batch call to Cloudflare Workers AI (offline, using API token)
     ↓
Upload:
  1. Write to D1: kb_sources row + kb_chunks rows
  2. Upsert Vectorize: vectors with metadata {type:'kb', category_id, source_id, section_ref, jurisdiction}
```

---

## Key Design Decisions

### Why Dual-RAG?
- User asks "is my rent clause legal?" → answers need both the statute AND their document
- Single-RAG would force separate queries or lose context

### Why Inline Processing (No Queue)?
- Workers execution limit is 30s; document processing (parse + embed + store) < 10s for typical files
- Simpler architecture: no async job tracking, immediate SSE feedback
- Faster user experience

### Why Vectorize Over BM25?
- Semantic search catches paraphrased clauses (BM25 only matches exact keywords)
- Single vector index, filtered by metadata (type + chat_id) = cheap queries
- Metadata filtering avoids cross-user leaks

### Why Groq (not OpenAI)?
- 2-3x cheaper
- Faster streaming (important for UI responsiveness)
- Community model (llama) performs well on legal text

### Why Hono (not Express/Fastify)?
- Bundle size matters on Workers (10MB limit)
- Hono compiles down to ~50KB; Express/Fastify are 300KB+
- Type-safe request/response handling

### Why R2 for Files?
- D1 has size limits; R2 doesn't
- Separates storage concerns (files vs. structured data)
- Easy to delete user files on account deletion

---

## Data Model

### Tables (D1)

```sql
chats (id, user_id, title, category_id, jurisdiction, created_at, updated_at)
messages (id, chat_id, role, content, citations JSON, created_at)
documents (id, chat_id, user_id, original_filename, file_type, r2_key, status, chunk_count, created_at)
document_chunks (id, document_id, chunk_index, content, metadata JSON)

kb_categories (id, slug, name, description, is_active, created_at)
kb_sources (id, category_id, title, source_type, jurisdiction, chunk_count, created_at)
kb_chunks (id, source_id, category_id, chunk_index, content, section_ref, created_at)
```

### Vectors (Vectorize)

Both user and KB chunks stored in same index, distinguished by metadata:

```json
{
  "id": "chunk_uuid",
  "values": [0.1, 0.2, ...],  // 768-dim bge-base-en-v1.5
  "metadata": {
    "type": "kb" | "user",
    "category_id": "cat_rental",
    "source_id": "src_tpa_1882",
    "chat_id": "chat_xyz",
    "user_id": "user_abc"
  }
}
```

---

## Citation Flow

1. **Extraction**: Regex `/\[KB-(\d+)\]/` and `/\[DOC-(\d+)\]/` from LLM output
2. **Verification**: Match refNumber to chunk array (1-based indexing → 0-based lookup)
3. **Enrichment**: Add snippet (first 200 chars), source title, section ref
4. **Storage**: JSON in messages.citations column
5. **Display**: Frontend renders as colored pills (KB=amber, DOC=blue)

---

## Auth & Sessions

- **Google OAuth**: user clicks "Sign in" → redirected to Google → callback to API
- **BetterAuth**: creates httpOnly session cookie (secure, invisible to JS)
- **Middleware**: `requireAuth` checks session, attaches `user` to request context
- **Scoping**: all queries filter by `user_id` (no cross-user leaks)

---

## Error Handling & Resilience

- **Document Processing**: wrapped in try-catch; errors stored in `processing_jobs.error_message`
- **Vector Search**: if Vectorize fails, proceeds without context (graceful degradation)
- **LLM Stream**: connection breaks → message saved with partial content
- **Rate Limiting**: per-user via D1 (future: add to usage_tracking table)

---

## Performance Optimizations

- **Chunk Size**: 512 tokens (KB), 1500 chars (user docs) → fits in LLM context, reduces embedding calls
- **Batch Embedding**: 50 chunks per call (Workers AI limits)
- **Metadata Filtering**: Vectorize filters by type + chat_id → O(1) instead of O(all vectors)
- **SSE Streaming**: tokens sent as they arrive (no buffering)
- **Static Export**: Next.js exports to static HTML (fast Cloudflare Pages deployment)

---

## Local Dev vs. Production

### Local
- `wrangler dev` runs API with in-memory D1 SQLite
- Next.js dev server on port 3000
- No Vectorize/R2 (mock or skip in dev)

### Production
- API deployed to Cloudflare Workers (global edge)
- Web deployed to Cloudflare Pages (static CDN)
- D1 production database (replicated, backed up by Cloudflare)
- R2 production bucket (persistent file storage)
- Vectorize production index (low-latency regional copies)

---

## Summary: The Happy Path

1. **User uploads rental agreement** → Workers parse + chunk + embed in-stream → SSE progress
2. **User asks "is clause 7 enforceable?"** → dual-RAG searches KB + doc → Groq synthesizes answer
3. **Response includes [KB-3] Model Tenancy Act and [DOC-2] your clause** → user sees citations
4. **Admin ingests new statute** → offline CLI chunks + embeds → Vectorize updated for all future queries

Everything is typed, tested (147 tests), and ready to handle multiple simultaneous users without blocking.
