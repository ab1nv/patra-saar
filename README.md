<p align="center">
  <img src="./public/logo.png" alt="PatraSaar" width="120" />
</p>

<h1 align="center">PatraSaar</h1>

<p align="center">
  Ask a question about Indian law, and get an answer built only from the text of the acts it has
  indexed. Every citation is checked against the source section before you see it. If it cannot
  find the provision, it says so instead of guessing.
</p>

<p align="center">
  <a href="https://github.com/ab1nv/patra-saar/actions/workflows/ci.yml"><img src="https://github.com/ab1nv/patra-saar/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
</p>

---

PatraSaar is a retrieval-augmented search tool for Indian statutory law. It indexes ten sources
(Indian Penal Code, Bharatiya Nyaya Sanhita, Bharatiya Sakshya Adhiniyam, Bharatiya Nagarik Suraksha
Sanhita, Code of Criminal Procedure, Code of Civil Procedure, the Constitution of India, the Indian
Contract Act, the IT Act, and the Companies Act) as about 3,200 individual sections. A language model
is only allowed to answer from the sections it retrieves, and it must quote them word for word. A
separate deterministic check then confirms that each cited section exists, was actually retrieved,
and that the quote matches the source text.

It also publishes a small benchmark on the landing page comparing the same model with and without
this verification step.

**Live:** https://patrasaar.ab1nv.dev · **Demo login:** `abhinav@test.com` / `abhinav`

## What it does

- Answers questions using only the indexed sections, with a verified quote behind every citation.
- Refuses to answer when retrieval finds nothing relevant.
- Shows the exact statutory text for any citation.
- Reports the active model next to the chat input.

## What it does not do

- It does not cover case law, state amendments, rules, notifications, or anything outside the ten
  indexed sources.
- It is not legal advice. Verification proves the quote is real, not that it applies to a situation.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Groq · Postgres (Neon) + Drizzle ·
in-process BM25 · Vitest · Playwright

## Quick start

```bash
pnpm install
cp .env.example .env          # set GROQ_API_KEY and DATABASE_URL
pnpm corpus:build             # regenerate data/corpus.json (already committed)
pnpm seed                     # create tables and the demo user
pnpm dev                      # http://localhost:3000
```

Without a `GROQ_API_KEY` the app runs in a deterministic offline mode. Without `DATABASE_URL` it
falls back to an in-memory store.

## Scripts

| Script                                       | Purpose                                                  |
| -------------------------------------------- | -------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`     | Run, build, serve                                        |
| `pnpm typecheck` · `pnpm lint` · `pnpm knip` | Types, lint, dead-code check                             |
| `pnpm test:unit` · `pnpm test:e2e`           | Unit tests (Vitest), end-to-end tests (Playwright)       |
| `pnpm corpus:build`                          | Rebuild the section corpus from `data/acts/*.pdf`        |
| `pnpm seed` · `pnpm db:reset`                | Create the schema and demo user, or clear conversations  |
| `pnpm audit:run`                             | Re-run the benchmark and write `data/audit-results.json` |

## Project layout

```
data/          source PDFs, the generated corpus, benchmark questions and results
scripts/       corpus builder, benchmark runner, seed and reset
src/app/       landing page, login, chat, API routes
src/components/ chat, marketing and UI components
src/lib/       corpus and retrieval, citation verifier, audit scoring, LLM, database, auth
tests/         unit and end-to-end tests
```

See [DOCS.md](./DOCS.md) for architecture and the API reference, and [HANDOFF.md](./HANDOFF.md) for
the presentation notes.

## License

[MIT](./LICENSE) © 2026 Abhinav Singh
