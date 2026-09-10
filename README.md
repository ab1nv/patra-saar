# PatraSaar

**It cites the law, or it says it doesn't know.**

PatraSaar answers questions about Indian central acts using only an indexed corpus of statutory text,
and verifies every citation verbatim against the source section before showing it. If nothing
relevant is found, it refuses instead of guessing.

[![CI](https://github.com/ab1nv/patra-saar/actions/workflows/ci.yml/badge.svg)](https://github.com/ab1nv/patra-saar/actions/workflows/ci.yml)

## Features

- **Verified citations** — every `[[ACT s.N | "quote"]]` is checked for existence, retrieval, and a
  verbatim quote. Passes render as ✓; failures are struck through with the exact reason.
- **Abstains when unsure** — a retrieval threshold gate means no answer rather than a guess.
- **Section-level corpus** — six central acts parsed into 1,650+ sections, not blind chunks.
- **IPC ↔ BNS mapper** — side-by-side texts for the 2023 transition, with a hand-checked table and
  similarity suggestions.
- **Published coverage ledger** — exactly what is indexed, and what is not.
- **Chat workspace** — streaming, attachments, incognito mode, pin/rename/delete, cross-questioning.
- **Offline demo mode** — runs without an LLM key using deterministic extractive answers.

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Groq · Neon Postgres + Drizzle ·
BM25 (in-process) · `unpdf` · jose + scrypt · Vitest · Playwright

## Quick start

```bash
pnpm install
cp .env.example .env          # set GROQ_API_KEY and DATABASE_URL
pnpm corpus:build             # regenerate data/corpus.json (already committed)
pnpm seed                     # create tables + demo user
pnpm dev                      # http://localhost:3000
```

**Demo credentials:** `abhinav@test.com` / `abhinav`

## Scripts

| Script                      | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| `pnpm dev`                  | Start the app                                     |
| `pnpm build` / `pnpm start` | Production build / serve                          |
| `pnpm typecheck`            | TypeScript                                        |
| `pnpm lint`                 | ESLint                                            |
| `pnpm knip`                 | Dead-code and unused-dependency check             |
| `pnpm test:unit`            | Vitest unit tests                                 |
| `pnpm test:e2e`             | Playwright end-to-end tests                       |
| `pnpm corpus:build`         | Rebuild the section corpus from `data/acts/*.pdf` |
| `pnpm seed`                 | Create schema + demo user                         |

## Project structure

```
data/
  acts/                 # source bare-act PDFs
  corpus.json           # generated section corpus (committed)
  ipc-bns-map.json      # hand-curated IPC ↔ BNS mapping
scripts/
  build-corpus.ts       # PDF → sections → corpus.json
  seed.ts               # schema + demo user
src/
  app/                  # landing, login, chat, coverage, migrate, API routes
  components/           # chat, migrate, layout, ui
  lib/
    corpus/             # loading, BM25, retrieval
    citations/          # citation grammar + verifier
    llm/                # Groq streaming, prompt, offline fallback
    db/                 # Drizzle + Neon
    auth/               # scrypt, JWT session
  middleware.ts         # route protection (JWT verified)
tests/
  unit/                 # Vitest
  e2e/                  # Playwright
```

See [DOCS.md](./DOCS.md) for the full architecture, API reference, testing and design tradeoffs.

## Disclaimer

PatraSaar provides information about statutory text. It is not legal advice and does not create a
lawyer–client relationship. Verify all provisions against the official bare act before relying on
them.
