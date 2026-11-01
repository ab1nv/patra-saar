# Hybrid Retrieval & Local Dense Embeddings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade PatraSaar's retrieval engine from lexical BM25 to hybrid Dense + Sparse retrieval using `@xenova/transformers` (`all-MiniLM-L6-v2`) and Reciprocal Rank Fusion (RRF) across all 3,630 sections.

**Architecture:** Embeddings are precomputed at build time and packed into a flat `Float32Array` binary file (`corpus-embeddings.bin`). At query time, a lazy singleton `@xenova/transformers` pipeline embeds the query and computes CPU dot products in $<2\text{ms}$. Results are fused with BM25 rankings via RRF ($k=60$) gated by a dual-channel abstention check.

**Tech Stack:** TypeScript, Next.js 16, `@xenova/transformers` (ONNX runtime), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-hybrid-retrieval-rrf.md`

## Global Constraints

- Pure Node.js in-process execution with zero external vector databases or network embedding API dependencies.
- Vector binary storage must remain under 6 MB (`data/corpus-embeddings.bin`).
- All existing exact section pinning behavior (`score = 9999`) and deterministic citation verification rules must be preserved.
- Out-of-corpus queries must continue to abstain cleanly.

---

### Task 1: Install `@xenova/transformers` Dependency

- [ ] Install `@xenova/transformers` using `pnpm add @xenova/transformers` (with `BypassSandbox: true`).
- [ ] Add `"embeddings:build": "tsx scripts/build-embeddings.ts"` script to `package.json`.
- [ ] Verify `package.json` and lockfile updates.

### Task 2: Offline Embedding Ingestion Script (`scripts/build-embeddings.ts`)

- [ ] Create `scripts/build-embeddings.ts` that loads `data/corpus.json`.
- [ ] Format each section into a rich textual representation: `${actFull} Section ${number}: ${title}. ${text.slice(0, 500)}`.
- [ ] Generate 384-dimensional normalized float32 embeddings using `@xenova/transformers` with `Xenova/all-MiniLM-L6-v2`.
- [ ] Serialize vectors contiguously to `data/corpus-embeddings.bin` and IDs to `data/corpus-embeddings-index.json`.
- [ ] Run `pnpm embeddings:build` and verify the generated binary file is ~5.58 MB with 3,630 vectors.

### Task 3: In-Memory Vector Search Module (`src/lib/corpus/dense.ts`)

- [ ] Create `src/lib/corpus/dense.ts`.
- [ ] Implement lazy loading of `corpus-embeddings.bin` into `Float32Array` and `corpus-embeddings-index.json`.
- [ ] Implement lazy singleton query embedding extractor with `@xenova/transformers`.
- [ ] Implement `searchDense(query: string, topK?: number): Promise<{ id: string; score: number }[]>`.
- [ ] Gracefully handle missing binary files (return empty array so the system falls back to BM25).

### Task 4: Hybrid RRF Fusion Engine & Abstention Gate (`src/lib/corpus/retrieve.ts`)

- [ ] Update `src/lib/corpus/retrieve.ts` to implement asynchronous `retrieve(question, opts): Promise<RetrievalResult>`.
- [ ] Execute both BM25 search (Top 30) and `searchDense()` (Top 30).
- [ ] Calculate RRF scores: $RRF(d) = 1/(60 + r_{bm25}) + 1/(60 + r_{dense})$.
- [ ] Implement the hybrid coverage gate: abstain if exact matches == 0 AND BM25 coverage < 0.20 AND peak dense cosine < 0.48.
- [ ] Retain exact section pinning with score 9999 at the top.
- [ ] Export `retrieveSync()` for purely lexical synchronous environments if needed.

### Task 5: Update Caller Call Sites

- [ ] Update `src/app/api/chat/route.ts` to `await retrieve(retrievalQuery)`.
- [ ] Update `scripts/run-audit.ts` to `await retrieve(question)`.

### Task 6: Testing & Verification

- [ ] Update `tests/unit/retrieve.test.ts` to test hybrid colloquial queries (`"stealing a phone"` -> BNS 303 / IPC 378; `"cheque returned unpaid"` -> NI Act 138).
- [ ] Update `tests/unit/verify.test.ts` to await `retrieve()`.
- [ ] Run `pnpm test:unit` and confirm 100% test pass.
- [ ] Run `pnpm typecheck` and `pnpm lint`.
