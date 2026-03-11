# RAG v2 Implementation Plan

<!-- AUTO-GENERATED: 2026-03-11 -->

This document outlines the complete RAG v2 enhancement roadmap for PatraSaar, improving retrieval quality through hybrid search, reranking, compression, and enhanced citations.

## Overview

The RAG v2 system replaces simple vector search with a sophisticated multi-stage pipeline:

```
User Query
    ↓
[Phase 1] Enrich Metadata (if not done)
    ↓
[Phase 2] Hybrid Retrieval (Vector + FTS5)
    ↓
[Phase 3] Reranking (Workers AI BGE Reranker)
    ↓
[Phase 4] Contextual Compression (Groq parallel)
    ↓
[Phase 5] Structured Citations (parse LLM response)
    ↓
[Phase 6] Source Cards UI (frontend)
    ↓
[Phase 7] Multi-Document Visibility
    ↓
LLM Response + Citations
```

---

## Phase 1: Enrich Chunk Metadata

**Objective**: Capture rich metadata during document chunking to enable advanced retrieval features.

**Backend Changes**:

1. **Update `src/lib/chunking.ts`**:
   - Track `page_number` for each chunk (increment on page breaks)
   - Capture full `section_title` (e.g., "Chapter 2, Section 5: Rights of the Applicant")
   - Return array of chunks with structure:
     ```typescript
     {
       content: string;
       page_number: number;
       section_title: string;
     }
     ```

2. **Database Schema Migration** (`src/db/schema.sql`):
   - Add columns to `document_chunks` table:
     ```sql
     ALTER TABLE document_chunks ADD COLUMN page_number INTEGER DEFAULT 0;
     ALTER TABLE document_chunks ADD COLUMN section_title TEXT;

     -- Create FTS5 virtual table for BM25 search
     CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
       content,
       chunk_id UNINDEXED,
       document_id UNINDEXED
     );
     ```

3. **Vectorize Metadata Enrichment**:
   - Update embedding insert to include metadata:
     ```typescript
     const metadata = {
       document_filename: document.filename,
       page: chunk.page_number,
       sectionTitle: chunk.section_title,
       chunk_id: chunkId,
       document_id: document.id
     };
     ```

**Files Affected**:
- `apps/api/src/lib/chunking.ts` (update chunking logic)
- `apps/api/src/db/schema.sql` (add columns + FTS5 table)
- `apps/api/src/index.ts` (update queue consumer for document processing)

**Testing**:
- Unit test: verify page numbers increment correctly across chunks
- Unit test: verify section titles are preserved and non-empty
- Integration test: verify FTS5 table is created and populated

---

## Phase 2: Hybrid Retrieval (Vector + FTS5)

**Objective**: Combine vector similarity search with full-text search for better recall.

**Backend Changes**:

1. **Parallel Search in `src/routes/messages.ts`**:
   ```typescript
   // Vector search
   const vectorResults = await vectorize.query(embedding, { topK: 20 });

   // FTS5 BM25 search
   const ftsResults = await db.selectFrom('document_chunks_fts')
     .where('document_chunks_fts.document_id', '=', documentId)
     .innerJoin('document_chunks', 'document_chunks.id', 'document_chunks_fts.chunk_id')
     .select(['document_chunks.id', 'document_chunks.content', 'document_chunks.page_number'])
     .orderBy('rank')
     .limit(20)
     .execute();
   ```

2. **Reciprocal Rank Fusion (RRF)**:
   - Merge results using RRF score:
     ```typescript
     const rrf = (vectorRank: number, ftsRank: number) => {
       return 1 / (60 + vectorRank) + 1 / (60 + ftsRank);
     };

     // Combine, deduplicate by chunk_id, score by RRF
     const merged = mergeResults(vectorResults, ftsResults)
       .sort((a, b) => b.rrfScore - a.rrfScore)
       .slice(0, 15);
     ```

3. **D1 FTS5 Population**:
   - Update document processing queue consumer to insert chunks into FTS5 table
   - On each chunk insert: `INSERT INTO document_chunks_fts(content, chunk_id, document_id) VALUES (...)`

**Files Affected**:
- `apps/api/src/routes/messages.ts` (add hybrid retrieval logic)
- `apps/api/src/index.ts` (update queue consumer to populate FTS5)

**Testing**:
- Unit test: RRF scoring function with mock rankings
- Integration test: verify FTS5 and vector results merge correctly
- Manual test: query with terms that appear in metadata vs. content

---

## Phase 3: Reranking

**Objective**: Use a specialized reranking model to score retrieved chunks by query relevance.

**Backend Changes**:

1. **BGE Reranker Integration** (Cloudflare Workers AI):
   - Use `@cf/baai/bge-reranker-base` (available via Workers AI binding)
   - Rerank top 15 hybrid results, keep top 6:
     ```typescript
     const reranked = await env.AI.run('@cf/baai/bge-reranker-base', {
       query: query,
       passages: merged.map(r => r.content),
     });

     // reranked.scores is array of relevance scores (0-1)
     const topChunks = merged
       .map((chunk, idx) => ({
         ...chunk,
         rerank_score: reranked.scores[idx]
       }))
       .sort((a, b) => b.rerank_score - a.rerank_score)
       .slice(0, 6);
     ```

2. **Fallback Strategy**:
   - If BGE reranker unavailable: fall back to RRF scores from Phase 2
   - Log warnings but don't interrupt flow

**Files Affected**:
- `apps/api/src/routes/messages.ts` (add reranking step)

**Testing**:
- Unit test: verify top 6 selection after reranking
- Integration test: BGE reranker API call with mock responses
- Manual test: verify fallback to RRF when reranker unavailable

**Risks**:
- BGE reranker model availability on Cloudflare (verify in regional docs)

---

## Phase 4: Contextual Compression

**Objective**: Extract only the sentences relevant to the user query from each chunk, reducing noise in LLM context.

**Backend Changes**:

1. **Parallel Compression via Groq**:
   - For each of top 6 chunks, call Groq with compression prompt:
     ```typescript
     const compressionPrompt = `
       Extract only the sentences from the following text that directly answer
       or relate to this query: "${query}"

       If no relevant sentences exist, respond with "N/A".

       Text: ${chunk.content}
     `;

     const compressed = await Promise.all(
       topChunks.map(chunk => groqClient.chat.completions.create({
         model: 'mixtral-8x7b-32768',
         messages: [{ role: 'user', content: compressionPrompt }],
         max_tokens: 150,
       }))
     );
     ```

2. **Filter Out N/A Results**:
   - If compressed response is "N/A", exclude that chunk from context
   - Final context uses only relevant compressed chunks

3. **Update Context Before LLM**:
   - Replace full chunks with compressed versions in system context

**Files Affected**:
- `apps/api/src/routes/messages.ts` (add compression step)

**Testing**:
- Unit test: compression prompt formatting
- Integration test: parallel Groq API calls with mock responses
- Manual test: verify compression reduces token count vs. full chunks

**Risks**:
- Groq rate limits (6 parallel calls might exceed free tier)
- Latency impact from parallel API calls (measure and set timeout)

---

## Phase 5: Structured Citations

**Objective**: Parse citations from the LLM response and save them with rich metadata.

**Backend Changes**:

1. **Update System Prompt** (`src/routes/messages.ts`):
   ```
   You are a legal document assistant. Answer based ONLY on the provided sources.

   Format each source reference as [N] where N is the source number.

   SOURCES:
   [1] Document: Constitution_of_India.pdf | Section II | Page 45
   [2] Document: IPC_2023.pdf | Chapter 3 | Page 12
   ...
   ```

2. **Parse [N] Citations from Streamed Response**:
   - Regex: `/\[(\d+)\]/g` to extract citation numbers
   - Build map of citation number → chunk metadata:
     ```typescript
     const citationMap = new Map();
     topChunks.forEach((chunk, idx) => {
       citationMap.set(idx + 1, {
         chunk_id: chunk.id,
         document_name: chunk.document_filename,
         section_title: chunk.section_title,
         page_number: chunk.page_number,
         snippet: compressed[idx].content.substring(0, 150) + '...'
       });
     });
     ```

3. **Extract Citations from Response**:
   - After streaming completes, parse full response for [N] patterns
   - Build Citation objects:
     ```typescript
     const citations = response.match(/\[(\d+)\]/g)
       .map(match => {
         const num = parseInt(match.slice(1, -1));
         return {
           number: num,
           ...citationMap.get(num)
         };
       })
       .filter(c => c.chunk_id); // Remove invalid citations
     ```

4. **Save Citations to Database**:
   - Add `citations` JSON column to `messages` table (if not exists)
   - Save after streaming:
     ```sql
     UPDATE messages SET citations = ? WHERE id = ?
     ```

5. **Emit Citations Over SSE**:
   - After 'done' event, send 'citations' event:
     ```typescript
     controller.enqueue(`data: ${JSON.stringify({
       type: 'citations',
       data: citations
     })}\n\n`);
     ```

**Database Migration**:
```sql
ALTER TABLE messages ADD COLUMN citations JSON DEFAULT '[]';
CREATE INDEX idx_messages_citations ON messages(id) WHERE citations != '[]';
```

**Files Affected**:
- `apps/api/src/routes/messages.ts` (parsing, saving, SSE)
- `apps/api/src/db/schema.sql` (add citations column)

**Testing**:
- Unit test: citation extraction regex with various [N] patterns
- Unit test: Citation object construction from citationMap
- Integration test: SSE event emission and order
- Manual test: verify citations appear in JSON response

**Risks**:
- Malformed citation numbers in LLM response (handle gracefully)
- Citation numbers not in valid range (filter out)
- Streaming order issues (send citations after 'done')

---

## Phase 6: Source Cards UI

**Objective**: Display retrieved sources visually below assistant messages.

**Frontend Changes**:

1. **New `SourceCard` Component** (`apps/web/src/components/SourceCard.tsx`):
   - Display: document icon, filename, section title, page badge
   - Snippet preview with expand/collapse
   - Hover effects for visual feedback
   ```typescript
   interface SourceCardProps {
     number: number;
     document_name: string;
     section_title: string;
     page_number: number;
     snippet: string;
   }
   ```

2. **New `SourceCardsPanel` Component** (`apps/web/src/components/SourceCardsPanel.tsx`):
   - Horizontal scrollable row of SourceCards
   - Header: "Sources (N)" where N = citation count
   - Responsive: show all on desktop, scroll on mobile
   - Only render if citations.length > 0

3. **Update SSE Reader** (`apps/web/src/lib/api.ts`):
   - Handle new 'citations' event type:
     ```typescript
     case 'citations':
       setCurrentMessage(prev => ({
         ...prev,
         citations: event.data
       }));
       break;
     ```

4. **Update Message Component** (`apps/web/src/components/Message.tsx`):
   - After message content, render SourceCardsPanel if citations exist:
     ```tsx
     {message.citations && message.citations.length > 0 && (
       <SourceCardsPanel citations={message.citations} />
     )}
     ```

5. **Update Frontend Types** (`packages/shared/src/types.ts`):
   - Ensure `Citation` type includes all fields
   - Update `Message` type to include `citations?: Citation[]`

**Files Affected**:
- `apps/web/src/components/SourceCard.tsx` (new)
- `apps/web/src/components/SourceCardsPanel.tsx` (new)
- `apps/web/src/lib/api.ts` (SSE handling)
- `apps/web/src/components/Message.tsx` (render SourceCardsPanel)
- `packages/shared/src/types.ts` (Citation type)

**Testing**:
- Component test: SourceCard renders all fields correctly
- Component test: SourceCardsPanel handles 0, 1, 5+ citations
- Integration test: SSE events trigger UI updates
- Manual test: visual appearance on mobile and desktop

**Design Notes**:
- Use consistent icon set (e.g., Lucide React)
- Color code by document type if applicable
- Page badge: show as "#12" in top-right corner
- Snippet: truncate at 150 chars, add "..." if longer

---

## Phase 7: Multi-Document Visibility

**Objective**: Show users which documents are being queried and their processing status.

**Backend Changes**:

1. **New Endpoint** (`src/routes/chats.ts`):
   ```typescript
   GET /api/chats/:chatId/documents
   Response:
   [
     {
       id: "doc-123",
       filename: "Constitution_of_India.pdf",
       status: "ready" | "processing" | "failed",
       chunk_count: 42,
       uploaded_at: "2026-03-10T12:00:00Z"
     }
   ]
   ```
   - Query documents linked to chat's messages
   - Include processing status from `processing_jobs` table
   - Include chunk count from `document_chunks` table

**Frontend Changes**:

1. **New `DocumentList` Component** (`apps/web/src/components/DocumentList.tsx`):
   - List of documents with status badges
   - Status icons: checkmark (ready), spinner (processing), error (failed)
   - Show chunk count: "42 chunks"
   - Click to show/hide details
   ```tsx
   interface DocumentListProps {
     documents: Document[];
     loading?: boolean;
   }
   ```

2. **Update Chat Layout** (`apps/web/src/app/chat/layout.tsx`):
   - Add collapsible right sidebar with DocumentList
   - Toggle button: "Documents" or document icon
   - Collapsed state: show icon only, tooltip
   - Expanded state: full list with "N documents" header
   - Width: ~280px when expanded

3. **Fetch Documents** (`apps/web/src/lib/api.ts`):
   - New function: `getDocuments(chatId: string)`
   - Called on chat open or after new message
   - Cache invalidation when new document uploaded

4. **UI Hint for Users**:
   - Below chat input: "Asking across N documents" (if N > 1)
   - Update when documents added/removed
   - Help tooltip: explains what this means

**Files Affected**:
- `apps/api/src/routes/chats.ts` (new endpoint)
- `apps/web/src/components/DocumentList.tsx` (new)
- `apps/web/src/app/chat/layout.tsx` (add sidebar)
- `apps/web/src/lib/api.ts` (getDocuments function)

**Testing**:
- API test: endpoint returns correct documents for chat
- Component test: DocumentList renders status badges correctly
- Integration test: sidebar toggles and syncs with doc state
- Manual test: visual feedback when documents added/removed

**Design Notes**:
- Match existing sidebar width and styling
- Use subtle animations for sidebar open/close
- Status colors: green (ready), yellow (processing), red (failed)
- Accessibility: ensure keyboard navigation works

---

## Implementation Order

**Backend-first approach** (enables frontend later):

1. **Phase 1** → 2 → 3 → 4 → 5 (complete in sequence)
2. **Phase 6** → 7 (frontend, can run in parallel)

**Parallelizable work**:
- Phase 6 and 7 are independent; both frontend developers can work simultaneously

**Timeline Estimate**:
- Phase 1: 2 hours (schema, chunking logic)
- Phase 2: 3 hours (hybrid search, RRF)
- Phase 3: 2 hours (reranker integration)
- Phase 4: 3 hours (Groq compression, parallel calls)
- Phase 5: 4 hours (citation parsing, SSE, database)
- Phase 6: 4 hours (UI components, styling)
- Phase 7: 3 hours (endpoint, sidebar, sync logic)

**Total**: ~21 hours development + testing

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| BGE reranker model not available in all Cloudflare regions | High | Verify availability in official docs; implement fallback to RRF scoring |
| Groq rate limits exceeded during compression (6 parallel calls) | Medium | Test with free tier limits; batch if needed; add retry logic |
| D1 FTS5 not supported or unreliable | High | Test FTS5 creation in wrangler D1 CLI; have alternative BM25 via Cloudflare KV prepared |
| Citation parsing misses edge cases (malformed [N]) | Medium | Comprehensive regex testing; sanitize citation numbers; log parse errors |
| Latency impact from 4-stage pipeline (vector → rerank → compress → cite) | Medium | Profile each stage; set timeouts; consider phase-out of slowest stage if P50 latency > 2s |
| Streaming SSE sends citations before message complete | Medium | Queue citations event after 'done' event; test order in browser console |
| FTS5 table grows large, slowing queries | Low | Implement pruning job (delete chunks > 1 year old); add index on document_id |

---

## Files Affected (Summary)

| Phase | Backend | Frontend | Database |
|-------|---------|----------|----------|
| 1 | chunking.ts, index.ts | - | schema.sql |
| 2 | messages.ts, index.ts | - | schema.sql (FTS5) |
| 3 | messages.ts | - | - |
| 4 | messages.ts | - | - |
| 5 | messages.ts | - | schema.sql (citations column) |
| 6 | - | SourceCard.tsx, SourceCardsPanel.tsx, Message.tsx, api.ts | - |
| 7 | chats.ts | DocumentList.tsx, layout.tsx, api.ts | - |

---

## Testing Checklist

Before each phase completion:

- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests with real APIs (not mocks)
- [ ] Manual testing with real documents
- [ ] Performance profiling (latency, token count)
- [ ] Edge case handling (empty results, malformed input)
- [ ] Error handling and logging
- [ ] Type safety (TypeScript strict mode)
- [ ] Database migration tested locally with `make db-migrate`

---

## Verification Plan

After all phases complete:

1. **End-to-End Flow**:
   - Upload multi-page PDF with complex structure
   - Ask question spanning multiple sections
   - Verify: response includes citations, correct pages/sections
   - Verify: source cards appear below message
   - Verify: document list shows all uploads

2. **Retrieval Quality**:
   - Compare hybrid search vs. vector-only (measure precision@6)
   - Compare reranked vs. un-reranked results
   - Compare compression vs. full chunks (verify answer quality unchanged)

3. **Performance**:
   - Measure end-to-end latency (target: < 3s to first token)
   - Measure token count reduction from compression
   - Profile each stage independently

4. **User Experience**:
   - Mobile responsiveness of source cards
   - Sidebar toggle and document sync
   - Citation visual clarity and readability

---

**Last Updated**: 2026-03-11
