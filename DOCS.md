# PatraSaar — Documentation

> PatraSaar answers questions about Indian central acts using only an indexed corpus of
> statutory text, and verifies every citation verbatim against the source section before
> showing it. If nothing relevant is found, it refuses instead of guessing.

**Tagline:** _It cites the law, or it says it doesn't know._

---

## 1. Executive summary

PatraSaar is a retrieval-augmented question-answering tool for Indian statutory law. A user asks a
question; the system retrieves the most relevant sections from a pre-built corpus of six central
acts using BM25 and exact-section lookup; a language model is constrained to answer only from those
sections and to emit every legal assertion as a machine-checkable citation containing a verbatim
quote; and a server-side verifier then checks each citation before it is shown. Citations that pass
all three checks are marked **✓ verified** and can be expanded to show the real statutory text.
Citations that fail are struck through and labelled with the exact failure. When retrieval finds
nothing above threshold, the system abstains.

The design goal is not to prevent the model from hallucinating, but to **catch it when it does** and
to publish a measurable, honest boundary around what the system knows.

---

## 2. The problem and who has it

Indian legal information is fragmented across central acts, state amendments, rules and case law.
General-purpose AI assistants answer legal questions from broad training data: they invent section
numbers, they cite repealed provisions, and they rarely show the underlying text. India's 2023
replacement of the Indian Penal Code, 1860 with the Bharatiya Nyaya Sanhita, 2023 makes this worse —
a large amount of pre-2024 legal knowledge is now numbered differently.

The users this is built for are law students, junior advocates, paralegals and informed citizens who
need a fast, checkable answer about the text of a central act — and who need to know when the tool
does not know.

---

## 3. What it does, and explicitly does not do

**Does**

- Answer questions grounded only in six indexed central acts.
- Verify every citation for existence, retrieval and verbatim quotation.
- Show the exact statutory text behind a citation.
- Abstain when retrieval is weak.
- Map IPC sections to their Bharatiya Nyaya Sanhita counterparts (curated table + similarity
  suggestions).
- Publish exactly what is indexed and what is not.

**Does not**

- Cover case law, state amendments, rules, notifications or the Constitution.
- Provide legal advice or create a lawyer–client relationship.
- Support multiple users, teams, or document upload to a persistent corpus (attachments are used
  per-question only, and are not treated as legal sources).
- Guarantee that a correctly quoted section is being applied to the correct legal situation.
  Verification proves **provenance**, not legal reasoning.

See `/coverage` in the running app for the live version of this list.

---

## 4. Product walkthrough

- **Landing page (`/`)** — the position and the tradeoff, with a live section count from the corpus.
- **Login (`/login`)** — single seeded demo user, scrypt-hashed password, JWT session cookie.
- **Workspace (`/chat`)** — a Claude-style chat. Streaming answers, inline verification badges,
  expandable citation chips, collapsible/resizable sidebar, pinned and renameable chats, incognito
  mode, file attachments (PDF/text, text extracted and passed to the model), and a
  select-to-cross-question tooltip.

- **Coverage ledger (`/coverage`)** — public page listing each act, its section count, parse quality,
  source file and build date, plus everything that is not covered.
- **IPC ↔ BNS mapper (`/migrate`)** — side-by-side IPC and BNS section texts, a **Verified mapping**
  badge for the hand-checked table, and a **Suggested** fallback with text-similarity candidates.
- **Abstention** — ask an out-of-corpus question (for example about GST rates) and the system
  refuses, with no citations rendered.

---

## 5. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router) on Vercel                            │
│                                                              │
│  Route Handlers (Node runtime)                               │
│    /api/auth/*   → scrypt + jose JWT in httpOnly cookie       │
│    /api/chat     → retrieve → prompt → stream → verify        │
│    /api/cases/*  → chat persistence (Neon Postgres)           │
│    /api/migrate  → IPC↔BNS curated map + BM25 suggestions     │
│    /api/extract  → PDF/text extraction (unpdf)                │
│    /api/sections → verbatim section text for the drawer       │
│                                                              │
│  lib/                                                        │
│    corpus/  → corpus.json loaded at module scope + BM25       │
│    citations/ → citation grammar + 3-check verifier           │
│    llm/     → Groq streaming + prompt + offline fallback      │
│    db/      → Drizzle + Neon Postgres                         │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
        ┌───────▼────────┐            ┌────────▼─────────┐
        │  Groq API      │            │  Neon Postgres   │
        │  (LLM stream)  │            │  users/cases/msgs│
        └────────────────┘            └──────────────────┘
```

### Request lifecycle (`POST /api/chat`)

1. Validate the session cookie and the Zod request body.
2. Resolve or create the case (skipped entirely in incognito mode).
3. `retrieve()`: exact section lookup + BM25 over the corpus, with a coverage gate for abstention.
4. Build a system prompt containing only the retrieved sections and the strict citation grammar.
5. Stream the model's tokens to the browser as typed SSE events (`meta`, `token`), including the
   citations-after-generation and title events.
6. After generation completes, `verifyCitations()` runs server-side on the assembled answer.
7. Persist the exchange (unless incognito), generate a short title, emit `citations`, `title`, `done`.

### Design decisions and tradeoffs

- **BM25 instead of a vector database.** The corpus is ~1,650 sections. Brute-force BM25 over that
  is single-digit milliseconds and fully deterministic, so retrieval can be unit-tested — which a
  hosted vector store makes hard. Legal queries are lexically precise ("punishment for murder",
  "section 420"), which is exactly where BM25 is strong. At 100× the corpus we would add dense
  retrieval and fuse with reciprocal rank fusion (see roadmap).
- **Parsing statutes into sections instead of blind chunking.** A section has a number, a title and
  a body. Preserving that structure is what makes exact lookup and citation checking possible;
  fixed-size chunking destroys it.
- **Verify after generation rather than prompt-engineering only.** Instructions reduce but do not
  eliminate invented citations. A deterministic post-check converts "trust the model" into a
  checkable claim.
- **One Next.js app instead of a separate backend.** One language, one deploy target, one set of
  types. A separate service would buy nothing here.
- **Offline fallback.** With no `GROQ_API_KEY`, a deterministic generator produces answers with real
  verbatim citations, so the app and its tests run without an external dependency.

---

## 6. The verification layer

**Citation grammar.** The model must emit each legal assertion as:

```
[[ACT_CODE s.NUMBER | "verbatim quote from that section"]]
```

`ACT_CODE` is one of `IPC`, `BNS`, `Contract Act`, `IT Act`, `Companies Act`, `BSA`.

**The three checks** (in order, server-side, after generation):

1. `sectionExists` — the cited section resolves in the corpus (act name + number).
2. `wasRetrieved` — that section id was actually retrieved for this query.
3. `quoteVerbatim` — the quote appears in the section text after normalization (lowercase, unify
   quotes and dashes, collapse whitespace, strip punctuation).

A citation that passes all three is `verified: true`. Otherwise it carries a `failureReason` of
`section_not_found`, `not_retrieved`, or `quote_not_verbatim`, and is rendered struck through.

**What it does not catch.** A correctly quoted section applied to the wrong factual situation. The
verifier proves the quote is real and came from the retrieved material; it does not judge whether the
citation is legally apt. That limitation is stated in the UI and here.

---

## 7. Corpus pipeline

`scripts/build-corpus.ts` (`pnpm corpus:build`):

1. Extract text per PDF with `unpdf`.
2. Normalize whitespace, drop page numbers, running headers and all-caps chapter headings.
3. Split on the heading pattern `NUMBER. Title.—Body`, requiring the em/en dash so the
   "ARRANGEMENT OF SECTIONS" table of contents (which has no dash) is skipped.
4. Reject footnote candidates structurally (an internal ". " that real short titles do not contain)
   and de-duplicate on section number.
5. Unwrap footnote markers (`1[imprisonment for life]` → `imprisonment for life`) so quotes are
   naturally verbatim.
6. Write `data/corpus.json` and print a spot-check table.

Current corpus: **1,654 sections with text** across IPC (483), BNS (355), Companies Act (434),
Bharatiya Sakshya Adhiniyam (170), IT Act (108), Indian Contract Act (104). Repealed sections with no
body are intentionally excluded. To add an act, drop the PDF in `data/acts/`, add an entry to `ACTS`
in the script and re-run `pnpm corpus:build`.

---

## 8. API reference

All responses use one error shape: `{ "error": string, "message": string }`.
Auth is a `ps_session` httpOnly cookie.

| Method & path                 | Auth | Body / params                                                                  | Response                                        |
| ----------------------------- | ---- | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| `GET /api/health`             | no   | —                                                                              | `{ status, corpusSections, builtAt, provider }` |
| `POST /api/auth/login`        | no   | `{ email, password }`                                                          | `{ user }` + sets cookie                        |
| `POST /api/auth/logout`       | no   | —                                                                              | `{ ok: true }` + clears cookie                  |
| `GET /api/auth/me`            | yes  | —                                                                              | `{ user }` or 401                               |
| `POST /api/chat`              | yes  | `{ question, caseId?, mode?, incognito?, attachmentText?, selectionContext? }` | SSE stream                                      |
| `GET /api/cases`              | yes  | —                                                                              | `{ cases }`                                     |
| `POST /api/cases`             | yes  | `{ title }`                                                                    | `{ case }` (201)                                |
| `GET /api/cases/:id`          | yes  | —                                                                              | `{ case, messages }`                            |
| `PATCH /api/cases/:id`        | yes  | `{ title?, pinned? }`                                                          | `{ case }`                                      |
| `DELETE /api/cases/:id`       | yes  | —                                                                              | `{ ok: true }`                                  |
| `GET /api/sections/:act/:num` | yes  | —                                                                              | `{ section }`                                   |
| `GET /api/migrate`            | yes  | `?ipc=` or `?bns=`                                                             | `MigrateResult`                                 |
| `GET /api/coverage`           | no   | —                                                                              | `{ builtAt, sectionCount, acts, notCovered }`   |
| `POST /api/extract`           | yes  | `multipart/form-data` `file`                                                   | `{ name, chars, text }`                         |

**Chat SSE events** (`text/event-stream`, one JSON object per `data:` frame):

```
data: {"type":"meta","provider":"groq","caseId":"…","abstained":false,"incognito":false,"retrieved":[…]}
data: {"type":"token","value":"Under "}
data: {"type":"citations","value":[…],"verifiedCount":1,"unverifiedCount":0}
data: {"type":"title","caseId":"…","title":"Murder Under BNS"}
data: {"type":"done","caseId":"…","messageId":"…","title":"…","verifiedCount":1,"unverifiedCount":0,"abstained":false}
```

Curl example:

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is the punishment for murder under the BNS?"}'
```

---

## 9. Data model (Neon Postgres)

```
users     (id TEXT PK, email TEXT UNIQUE, password_hash TEXT, created_at BIGINT)
cases     (id TEXT PK, user_id TEXT, title TEXT, pinned BOOLEAN, created_at BIGINT)
messages  (id TEXT PK, case_id TEXT, role TEXT, content TEXT,
           citations_json TEXT, abstained BOOLEAN, created_at BIGINT)
```

No foreign keys are declared; ownership is enforced in application code. Incognito conversations
never touch the database.

---

## 10. Auth model

Single seeded user (`pnpm seed`, credentials in `.env`). Passwords are hashed with `scrypt`
(`node:crypto`), never stored in plaintext. Login signs an HS256 JWT (`jose`) stored in an httpOnly,
SameSite=Lax cookie, marked `secure` in production. `src/middleware.ts` verifies the JWT for
`/chat` and `/migrate`. The JWT is **actually verified** — it is not a placeholder. For production
this would be replaced with real OAuth/multi-user accounts and short-lived tokens issued by an
identity provider.

---

## 11. Local development

```bash
pnpm install
cp .env.example .env          # fill in GROQ_API_KEY and DATABASE_URL
pnpm corpus:build             # regenerate data/corpus.json (already committed)
pnpm seed                     # create tables + demo user in Postgres
pnpm dev                      # http://localhost:3000
```

Open the app, sign in with the demo credentials, and ask a question. Set `GROQ_API_KEY` for live
inference; leave it empty to run in deterministic offline demo mode. With no `DATABASE_URL` the app
falls back to an in-memory store.

---

## 12. Testing strategy

- **Unit (Vitest, `tests/unit`)** — 29 tests. BM25 ranking and determinism; retrieval (exact
  pinning, lexical hits, abstention, act boosting); citation parsing (suffixed numbers, long act
  names, malformed tokens); act-name resolution (full names with years); the **verifier** (valid,
  section-not-found, not-retrieved, paraphrased-quote, malformed); IPC↔BNS migration.
- **E2E (Playwright, `tests/e2e`)** — login (bad password, guard redirect, success), chat (streamed
  answer + verified badge, and abstention with no citations), IPC↔BNS mapper, coverage ledger.
  The LLM stream is stubbed with a fixture so E2E does not depend on a live API key or rate limits.

What is **not** covered: the real Groq response quality, live database failure modes, and visual
regression. Run each suite with `pnpm test:unit` and `pnpm test:e2e`.

---

## 13. Deployment

- **App:** Vercel (framework preset `nextjs`). Set `GROQ_API_KEY`, `GROQ_MODEL`, `JWT_SECRET`,
  `DATABASE_URL` in the project's environment variables.
- **Database:** Neon Postgres. `pnpm seed` creates the schema and demo user.
- **CI:** `.github/workflows/ci.yml` runs typecheck, lint, knip, unit tests, build, seed and E2E on
  pushes and PRs to `main`. Dependabot opens grouped dependency updates weekly (monthly for Actions).
- **Default branch:** `main`.

---

## 14. Known limitations & roadmap

**Limitations**

- Corpus incompleteness: only six central acts with text; repealed sections excluded. Parse quality
  per act is published on `/coverage`.
- No case law, state amendments, rules or notifications.
- English only; the source PDFs are English.
- Single user; no teams, sharing or roles.
- BM25 is weak on purely conceptual paraphrase queries that share no vocabulary with the statute.
- The verifier does not judge legal applicability, only provenance.
- The IPC↔BNS curated table covers the most-used sections; the rest are similarity suggestions.

**Roadmap**

- Hybrid dense + BM25 retrieval fused with reciprocal rank fusion, behind a flag.
- Case-law ingestion (Supreme Court / High Court) with the same verification layer.
- Hindi and other Indian-language queries.
- Real OAuth and multi-user accounts.
- Persisting user-uploaded documents as a separate, clearly-labelled retrieval namespace.

---

## 15. Disclaimer

PatraSaar provides information about statutory text. It is not legal advice and does not create a
lawyer–client relationship. Verify all provisions against the official bare act before relying on
them.
