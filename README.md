# PatraSaar

**It cites the law, or it says it doesn't know.**

PatraSaar answers questions about Indian central acts and the Constitution using only an indexed
corpus of statutory text, and verifies every citation verbatim against the source section before
showing it. If nothing relevant is found, it refuses instead of guessing. It also publishes a
measured **hallucination audit** comparing the same model with and without verification.

[![CI](https://github.com/ab1nv/patra-saar/actions/workflows/ci.yml/badge.svg)](https://github.com/ab1nv/patra-saar/actions/workflows/ci.yml)

## Features

- **Verified citations** - every `[[ACT s.N | "quote"]]` is checked for existence, retrieval, and a
  verbatim quote. Passes render as ✓; failures are struck through with the exact reason.
- **Hallucination audit** (`/audit`) - the same model, same 30 questions, with and without
  retrieval-plus-verification, scored deterministically against the corpus.
- **Abstains when unsure** - a retrieval threshold gate means no answer rather than a guess.
- **Section-level corpus** - 10 acts, 3,200+ sections, parsed from the source PDFs, not blind chunks.
- **Chat workspace** - streaming, attachments, incognito mode, pin/rename/delete, cross-questioning,
  fully responsive with a mobile drawer.
- **Offline demo mode** - runs without an LLM key using deterministic extractive answers.

## Indexed acts

IPC 1860 · BNS 2023 · BSA 2023 · BNSS 2023 · CrPC 1973 · CPC 1908 · Constitution of India ·
Indian Contract Act 1872 · IT Act 2000 · Companies Act 2013

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

| Script                                       | Purpose                                           |
| -------------------------------------------- | ------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`     | Run / build / serve                               |
| `pnpm typecheck` · `pnpm lint` · `pnpm knip` | TypeScript · ESLint · dead-code check             |
| `pnpm test:unit` · `pnpm test:e2e`           | Vitest · Playwright                               |
| `pnpm corpus:build`                          | Rebuild the section corpus from `data/acts/*.pdf` |
| `pnpm seed`                                  | Create schema + demo user                         |
| `pnpm db:reset`                              | Clear all conversations (keeps the demo user)     |
| `pnpm audit:run`                             | Re-run the hallucination audit                    |

## Project structure

```
data/
  acts/                 # source bare-act PDFs
  corpus.json           # generated section corpus (committed)
  audit-questions.json  # ground-truth question set
  audit-results.json    # generated audit results (committed)
scripts/
  build-corpus.ts       # PDF -> sections -> corpus.json
  run-audit.ts          # hallucination audit harness
  seed.ts / reset-db.ts
src/
  app/                  # landing, login, chat, audit, API routes
  components/           # chat, layout, ui
  lib/
    corpus/             # loading, BM25, retrieval
    citations/          # citation grammar + verifier
    audit/              # audit scoring + aggregation
    llm/                # Groq streaming, prompt, offline fallback
    db/ auth/           # Drizzle + Neon, scrypt + JWT
  middleware.ts         # route protection (JWT verified)
tests/                  # unit (Vitest) + e2e (Playwright, desktop + mobile)
```

See [DOCS.md](./DOCS.md) for architecture, API reference and design tradeoffs, and
[HANDOFF.md](./HANDOFF.md) for the presentation package.

## Disclaimer

PatraSaar provides information about statutory text. It is not legal advice and does not create a
lawyer–client relationship. Verify all provisions against the official bare act before relying on
them.
