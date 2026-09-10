# Changelog

All notable changes to this project are documented here. Format follows
[Conventional Commits](https://www.conventionalcommits.org/).

## [3.0.0] — 2026-09-15

### Rewritten

- Replaced the SvelteKit + Hono + Cloudflare Workers monorepo with a single Next.js 16 (App Router)
  application deployed on Vercel. Removed Cloudflare Workers, Wrangler, D1, KV, Vectorize, Workers AI,
  OpenRouter, Svelte, and the Turborepo/workspace setup.
- Replaced vector retrieval with an in-process BM25 index over a parsed section corpus
  (`data/corpus.json`, 1,654 sections across six central acts) and a deterministic exact-section
  lookup. Corpus is built from the source PDFs by `scripts/build-corpus.ts`.
- Replaced the Cloudflare Python ingestion script with the TypeScript corpus builder.

### Added

- **Verified citations.** A strict `[[ACT s.NUMBER | "verbatim quote"]]` grammar plus a server-side
  verifier that checks section existence, retrieval membership, and verbatim quotation, with a
  specific failure reason per citation.
- **Abstention gate.** Retrieval coverage below threshold produces a refusal instead of an answer.
- **Coverage ledger** (`/coverage`) publishing indexed acts, section counts, parse quality and what is
  not covered.
- **IPC ↔ BNS migration mapper** (`/migrate`) with a hand-curated table and evidence-based
  similarity suggestions.
- Chat workspace: streaming answers, inline citation chips, collapsible/resizable sidebar, pin, rename
  and delete, incognito mode, PDF/text attachments, and select-to-cross-question.
- Model-generated chat titles and dynamic window titles.
- Neon Postgres + Drizzle persistence with an automatic in-memory fallback.
- Rebuilt landing page, README, DOCS.md, CI workflow, Dependabot config, and Husky hooks.

### Fixed

- Authentication now actually verifies the JWT instead of hard-coding a dummy user.
- Streaming uses the documented typed SSE event format rather than raw text.
- Citation correctness: act names containing a year (e.g. "Bharatiya Nyaya Sanhita, 2023") resolve to
  the correct act, avoiding cross-act section confusion.
