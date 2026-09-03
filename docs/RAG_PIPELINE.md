# RAG Pipeline Architecture

**Last Updated:** April 2026  
**Status:** Production-ready (fully implemented)

---

## Overview

The RAG (Retrieval-Augmented Generation) pipeline orchestrates how legal documents flow from ingestion → retrieval → LLM context → answer.

```
┌─────────────────────┐
│  User Upload PDF    │
│   or Legal Corpus   │
└──────────┬──────────┘
           │
      INGESTION PHASE
           ↓
    ┌─────────────────────────────────────┐
    │  1. Chunk (1000 chars, 200 overlap)  │
    │  2. Embed (Workers AI bge-base)      │
    │  3. Store vectors (Vectorize)        │
    │  4. Store text (D1)                  │
    └──────────────────┬──────────────────┘
                       │
                    RETRIEVAL PHASE (on query)
                       ↓
    ┌──────────────────────────────────────┐
    │  Query: "punishment for murder?"      │
    │  ↓ Embed question                     │
    │  ↓ Vectorize.query(user-docs, 5)     │
    │  ↓ Vectorize.query(legal-corpus, 3)  │
    │  ↓ Merge + filter (threshold 0.72)   │
    │  → [8 matched chunks with scores]    │
    └──────────────────┬───────────────────┘
                       │
                   CONTEXT BUILD
                       ↓
    ┌──────────────────────────────────────┐
    │  For each matched chunk:              │
    │  1. Lookup full text in D1            │
    │  2. Format with source + relevance    │
    │  3. Build context window              │
    └──────────────────┬───────────────────┘
                       │
                    LLM PROMPT
                       ↓
    ┌──────────────────────────────────────┐
    │  [SYSTEM] You are PatraSaar...        │
    │  [CONTEXT] [LEGAL REFERENCE: BNS     │
    │           (relevance: 0.92)          │
    │           Section 101: Punishment    │
    │           for murder...]             │
    │  [QUESTION] punishment for murder?   │
    │  ↓ Stream to OpenRouter               │
    └──────────────────┬───────────────────┘
                       │
                   STREAMING → CLIENT
                       ↓
    ┌──────────────────────────────────────┐
    │  SSE: data: {"delta": "Punishment..."}│
    │  Accumulate full answer               │
    │  Persist to D1 inquiries table        │
    └──────────────────────────────────────┘
```

---

## Ingestion Phase

### User Document Upload

When a user uploads a PDF:

```
POST /documents → apps/api/src/routes/documents.ts
  ↓
ingestDocument(documentId, userId, text, env)
  ├─ chunkDocument() → [Chunk]
  │   └─ RecursiveCharacterTextSplitter(1000, 200)
  ├─ embedTexts() → [[float32]]
  │   └─ Workers AI @cf/baai/bge-base-en-v1.5
  └─ Insert both:
      ├─ CHUNKS_INDEX.insert(vectors + metadata)
      │   └─ metadata: documentId, userId, chunkIndex, pageNumber, text[:500]
      └─ D1: INSERT INTO chunks (id, document_id, ..., text, vector_id)
           └─ Full text stored for buildContext() lookup
```

**File:** `apps/api/src/services/rag/pipeline.ts:ingestDocument()`

### Legal Corpus Pre-Ingestion

The legal corpus (Indian statutes, case law) is pre-ingested once via a Python script:

```bash
# Set credentials
export CLOUDFLARE_ACCOUNT_ID=<your-account-id>
export CLOUDFLARE_API_TOKEN=<your-api-token>

# Run ingestion
cd apps/api/scripts
python3 ingest_legal_corpus.py --data-dir ../../../legal-data
```

**What it does:**

```python
# For each PDF in legal-data/:
for pdf_file:
    loader = PyMuPDFLoader(pdf_file)  # lazy load pages
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, overlap=200)
    
    for page in loader.lazy_load():
        chunks = splitter.split_documents([page])
        
        # Batch 25 chunks at a time
        for batch in chunks:
            embeddings = get_embeddings(batch)  # Workers AI
            
            # Write to both Vectorize and D1 in parallel
            asyncio.gather(
                insert_vectorize(embeddings, batch),
                insert_d1_chunks(batch)  # ← CRITICAL: Full text to D1
            )
```

**File:** `apps/api/scripts/ingest_legal_corpus.py`

---

## Retrieval Phase

### Query Embedding & Vector Search

When a user asks a question:

```typescript
const queryVector = await embedQuery(question, env)
// → Workers AI embedding for the question

const [userResults, legalResults] = await Promise.all([
  env.CHUNKS_INDEX.query(queryVector, {
    topK: 5,
    filter: { documentId: { $in: documentIds }, userId }
  }),
  env.LEGAL_INDEX.query(queryVector, {
    topK: 3
  })
])
```

**File:** `apps/api/src/services/rag/retriever.ts:retrieveChunks()`

Returns:

```typescript
interface RetrievedChunk {
  id: string          // vector_id: "doc123:5" or "ipc_2023:42"
  score: number       // 0.72 - 0.95 (similarity)
  source: 'user-doc' | 'legal-corpus'
  metadata: {
    documentId?: string
    userId?: string
    chunkIndex?: number
    file_name?: string
    text?: string     // preview only (500 chars)
  }
}
```

### Context Building (CRITICAL FIX)

**Before:** `buildContext()` only returned labels, no text:
```
[LEGAL REFERENCE] (score: 0.87)
```
→ LLM got empty context → useless answers.

**Now:** Fetches full text from D1 by `vector_id`:

```typescript
export async function buildContext(
  documentIds: string[],
  question: string,
  userId: string,
  env: Env
): Promise<{ context: string; chunkIds: string[] }> {
  const retrieved = await retrieveChunks(...)
  
  // Fetch full text from D1 for all matched chunks
  const chunkIds = retrieved.map(r => r.id)
  const rows = await env.DB.prepare(
    `SELECT vector_id, text, document_id FROM chunks 
     WHERE vector_id IN (${placeholders})`
  ).bind(...chunkIds).all()
  
  // Build context with full text + source attribution
  const contextParts = retrieved.map(chunk => {
    const row = textByVectorId.get(chunk.id)
    const label = chunk.source === 'legal-corpus' 
      ? 'LEGAL REFERENCE' 
      : 'DOCUMENT CONTEXT'
    const source = chunk.source === 'legal-corpus'
      ? (chunk.metadata.file_name ?? 'legal corpus')
      : row.document_id
    return `[${label}: ${source}] (relevance: ${chunk.score.toFixed(2)})
${row.text}`
  })
  
  return {
    context: contextParts.join('\n\n---\n\n'),
    chunkIds
  }
}
```

**File:** `apps/api/src/services/rag/pipeline.ts:buildContext()`

---

## LLM Query & Streaming

### Inquiry Endpoint

```typescript
POST /inquiries/stream
{
  "documentIds": ["doc_123", "doc_456"],
  "question": "What is the punishment for murder under IPC?"
}
```

Response: SSE stream with `Content-Type: text/event-stream`

**Implementation:**

```typescript
// 1. Build context from RAG
const { context, chunkIds } = await buildContext(
  documentIds, question, userId, env
)

// 2. Prepare LLM prompt
const messages = [
  { role: 'system', content: SYSTEM_PROMPT },
  { role: 'user', content: `Context:\n${context}\n\nQ: ${question}` }
]

// 3. Stream from OpenRouter
const llmRes = await fetch(OPENROUTER_API_URL, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${env.OPENROUTER_API_KEY}` },
  body: JSON.stringify({ model: 'google/gemini-flash-1.5', messages, stream: true })
})

// 4. Forward SSE to client + collect answer
return new Response(readable, {
  headers: { 'Content-Type': 'text/event-stream' }
})

// 5. Persist inquiry + answer + citations to D1 (non-blocking)
```

**File:** `apps/api/src/routes/inquiries.ts:POST /stream`

---

## Database Schema

### Vectorize Indexes

**`CHUNKS_INDEX` (user-docs namespace)**
```
id: "doc123:5"
values: [768-dimensional float32 vector]
metadata: {
  documentId: "doc123",
  userId: "user456",
  chunkIndex: 5,
  pageNumber: 12,
  text: "First 500 chars of chunk..."
}
```

**`LEGAL_INDEX` (legal-corpus namespace)**
```
id: "ipc_2023:42"
values: [768-dimensional float32 vector]
metadata: {
  source: "legal-corpus",
  file_name: "THE INDIAN PENAL CODE.pdf",
  text: "First 500 chars..."
}
```

### D1 Chunks Table

```sql
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL,           -- FULL TEXT (not truncated)
  token_count INTEGER,
  vector_id TEXT UNIQUE,        -- Matches Vectorize ID
  source TEXT NOT NULL          -- 'user-doc' or 'legal-corpus'
);
```

**Why D1 is critical:**
- Vectorize stores vectors + 500-char preview only
- `buildContext()` needs **full chunk text** for LLM context
- D1 is the source of truth for text retrieval
- This was the missing piece before the fix

---

## Configuration

### Environment Variables

```bash
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_API_TOKEN=<api-token>
D1_DATABASE_ID=7f445d8e-a005-466d-ae39-ddbc0a50bee9

# wrangler.toml declares:
# - CHUNKS_INDEX → patrasaar-chunks
# - LEGAL_INDEX → patrasaar-legal-corpus
# - DB → patrasaar-db (D1)
# - AI → Workers AI binding

# LLM
OPENROUTER_API_KEY=<key>
FRONTEND_URL=http://localhost:5173

# Auth
GOOGLE_CLIENT_ID=<from Google Cloud>
GOOGLE_CLIENT_SECRET=<from Google Cloud>
JWT_SECRET=<generate: openssl rand -hex 32>
```

---

## Performance Notes

### Vectorize Query Costs

- `CHUNKS_INDEX.query()`: topK=5 per user document
- `LEGAL_INDEX.query()`: topK=3 (shared across all users)
- Both queries run in parallel
- Results filtered by similarity threshold (0.72)
- Typical query: 8 chunks retrieved (5 + 3, minus low-score filtering)

### D1 Lookup Costs

- Single query: `SELECT ... WHERE vector_id IN (?)` with 8 vector IDs
- One round trip to D1 per inquiry
- Indexes on `vector_id` (UNIQUE) for fast lookup

### Estimated Latencies

```
Question asked
  → Embed (Workers AI): 200ms
  → Vectorize query (parallel): 150ms
  → D1 lookup (8 rows): 50ms
  → LLM streaming: 2-5s
  ─────────────────────
  Total to first token: ~2.5s
  Total to complete answer: 2-10s (depends on answer length)
```

---

## Testing RAG Locally

### Test Ingestion

```bash
cd apps/api/scripts

# Ingest a test PDF
python3 ingest_legal_corpus.py \
  --data-dir ../../../legal-data

# Watch output for success messages:
# ✓ THE INDIAN PENAL CODE.pdf — 342 chunks → Vectorize + D1
```

### Test Retrieval

```bash
# In the SvelteKit frontend (while dev server running)
POST http://localhost:8787/inquiries/stream
{
  "documentIds": [],
  "question": "What is punishment for murder?"
}

# You should see SSE stream:
# data: {"delta": "Under the "}
# data: {"delta": "Bharatiya "}
# data: {"delta": "Nyaya..."}
```

### Test E2E

```bash
make test-e2e
# Playwright tests cover:
# - Upload document
# - Query with user docs
# - Query with legal corpus
# - Verify citations
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "No relevant context found" | Vectorize returned no matches above 0.72 threshold | Lower threshold in `retriever.ts` or improve query |
| Empty answer from LLM | `buildContext()` returned empty string | Check D1 chunks table has text for `vector_id` |
| Ingestion hangs | Rate limiting from Cloudflare AI or Vectorize | Reduce BATCH_SIZE or CONCURRENCY_LIMIT in Python script |
| D1 query 500s | Missing chunks table | Run `make db-migrate` |

---

## Architecture Decisions

### Why Two Vectorize Namespaces?

- **User docs** are user-specific → need `userId` filter
- **Legal corpus** is shared → no filter, global access
- Separate namespaces = simpler filtering + per-namespace quotas

### Why Both Vectorize + D1?

- **Vectorize** = vector similarity search (semantic matching)
- **D1** = full text storage (context for LLM, citations)
- Can't store large text in Vectorize metadata (size limits)

### Why Not Use OpenAI's RAG?

- Hosted services have rate limits, egress costs, vendor lock-in
- Cloudflare ecosystem is free tier friendly
- Workers AI embeddings run in the same data center as Vectorize
- Full control over legal corpus curation

---

## Next Steps (Future)

- [ ] Batch ingestion from IndianKanoon API
- [ ] Citation rank/relevance scoring
- [ ] Filters by act, section, year (structured metadata)
- [ ] Case law similarity clustering
- [ ] Multi-language support (Hindi, Tamil, etc.)
