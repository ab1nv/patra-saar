# PatraSaar - Documentation

> PatraSaar answers questions about Indian central acts and the Constitution using only an indexed
> corpus of statutory text, and verifies every citation verbatim against the source section before
> showing it. If nothing relevant is found, it refuses instead of guessing. It also publishes a
> measured hallucination audit.

**Tagline:** _It cites the law, or it says it doesn't know._

---

## 1. Executive summary

PatraSaar is a retrieval-augmented question-answering tool for Indian statutory law. A user asks a
question; the system retrieves the most relevant sections from a pre-built corpus of ten sources
using BM25 and exact-section lookup; a language model is constrained to answer only from those
sections and to emit every legal assertion as a machine-checkable citation containing a verbatim
quote; and a deterministic, non-LLM verifier then checks each citation before it is shown. Citations
that pass all three checks are marked **✓ verified** and can be expanded to show the real statutory
text. Citations that fail are struck through and labelled with the exact failure. When retrieval finds
nothing above threshold, the system abstains.

The design goal is not to prevent the model from hallucinating, but to **catch it deterministically
and measure it**. The project ships a **hallucination audit** as a section on the landing page (`/#audit`): the same model, on the same
30-question ground-truth set, with and without retrieval-plus-verification, scored automatically
against the corpus.

---

## 2. The problem and who it is for

Indian legal information is fragmented across central acts, state amendments, rules and case law.
General-purpose AI assistants answer legal questions from broad training data: they invent section
numbers, they cite repealed provisions, and they rarely show the underlying text. India's 2023
replacement of the IPC with the Bharatiya Nyaya Sanhita compounds this: a large amount of pre-2024
legal knowledge is now numbered differently. In 2026 the Supreme Court of India (_Pooja Ramesh Singh
v. Jammu & Kashmir Bank Ltd._, 2026 INSC 668) set aside tribunal orders that relied on
AI-hallucinated precedents - the exact failure mode this project targets.

Users: law students, junior advocates, paralegals and informed citizens who need a fast, checkable
answer about the text of a central act - and who need to know when the tool does not know.

---

## 3. What it does, and explicitly does not do

**Does**

- Answer questions grounded only in the ten indexed sources.
- Verify every citation for existence, retrieval and verbatim quotation.
- Show the exact statutory text behind a citation.
- Abstain when retrieval is weak.
- Publish a measured hallucination comparison.

**Does not**

- Cover case law, state amendments, rules, notifications, or anything outside the ten sources.
- Provide legal advice or create a lawyer–client relationship.
- Support multiple users, teams, or roles.
- Guarantee that a correctly quoted section is applied to the correct legal situation. Verification
  proves **provenance**, not legal reasoning.

---

## 4. Product walkthrough

- **Landing page (`/`)** - the position, the tradeoff, and the indexed corpus.
- **Login (`/login`)** - single seeded user, scrypt-hashed password, JWT session cookie. Signing in
  performs a full navigation and lands directly on the workspace.
- **Workspace (`/chat`)** - streaming markdown answers, inline verification badges, expandable
  citation chips, a right-hand **Sources & acts** panel listing every cited section (a slide-over
  below the xl breakpoint), collapsible/resizable sidebar (a drawer on mobile), instant optimistic
  pin, rename, delete and create, incognito mode, three randomly chosen example prompts, the active
  model shown beside the composer, and select-to-cross-question.
- **Hallucination audit (public landing-page section)** - headline statistics, per-metric comparison bars,
  side-by-side failure examples, the full results table, and an explicit methodology.
- **Abstention** - ask an out-of-corpus question and the system refuses, with no citations rendered.

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
│    /api/sections → verbatim section text for the drawer       │
│                                                              │
│  lib/                                                        │
│    corpus/  → corpus.json loaded at module scope + BM25       │
│    citations/ → citation grammar + 3-check verifier           │
│    audit/   → deterministic scoring + aggregation             │
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
3. `retrieve()`: exact section lookup + BM25 over title/body, with a coverage gate for abstention.
4. Build a system prompt containing only the retrieved sections and the citation rules.
5. Stream the model's tokens to the browser as typed SSE events (`meta`, `token`).
6. After generation completes, `verifyCitations()` runs server-side on the assembled answer.
7. Persist the exchange (unless incognito), generate a short title, emit `citations`, `title`, `done`.

### Design decisions and tradeoffs

- **BM25 instead of a vector database.** The corpus is ~3,200 sections. Brute-force BM25 over that is
  single-digit milliseconds and fully deterministic, so retrieval can be unit-tested. Legal queries
  are lexically precise ("punishment for murder", "section 420"), which is exactly where BM25 is
  strong. At 100× the corpus we would add dense retrieval and fuse with reciprocal rank fusion.
- **Parsing statutes into real sections instead of blind chunking.** Preserving number, title and
  body is what makes exact lookup and citation checking possible.
- **Verify after generation rather than prompt-engineering only.** Instructions reduce but do not
  eliminate invented citations. A deterministic post-check converts "trust the model" into a
  checkable claim, and - unlike a second LLM check - the verifier cannot itself hallucinate.
- **One Next.js app instead of a separate backend.** One language, one deploy target, one set of
  types.
- **A bounded context budget.** The free Groq tier caps input tokens per minute, so prompts are
  capped (`MAX_SECTION_CHARS` = 4,200 and `MAX_CONTEXT_CHARS` = 14,000 characters). The per-section
  cap is generous enough to reach the operative words of long sections (BNS 318 puts its punishment
  after long illustrations). Quotes are still verified against the full section text server-side.
- **Explicit act scoping.** When a question names an act ("under the BNS"), lexical results are
  restricted to that act before ranking, so a longer title in another act that happens to contain
  the question's phrase cannot outrank the canonical section.
- **Title phrase boost.** BM25 splits a query into terms, so a section whose title contains a
  contiguous phrase from the question scores 1.5x, and a single-word title named verbatim scores
  1.3x.
- **Offline fallback.** With no `GROQ_API_KEY`, a deterministic generator produces answers with real
  verbatim citations, so the app and its tests run without an external dependency.

---

## 6. The verification layer

**Citation grammar.** The model must emit each legal assertion as:

```
[[ACT_CODE s.NUMBER | "verbatim quote from that section"]]
```

`ACT_CODE` is one of `IPC`, `BNS`, `BSA`, `BNSS`, `CrPC`, `CPC`, `Constitution`, `Contract Act`,
`IT Act`, `Companies Act`.

**The three checks** (in order, server-side, after generation):

1. `sectionExists` - the cited section resolves in the corpus (act name + number).
2. `wasRetrieved` - that section id was actually retrieved for this query.
3. `quoteVerbatim` - the quote appears in the section text after normalization (lowercase, unify
   quotes and dashes, collapse whitespace, strip punctuation).

A citation that passes all three is verified. Otherwise it carries a `failureReason` of
`section_not_found`, `not_retrieved`, or `quote_not_verbatim`, and is rendered struck through.

**What it does not catch.** A correctly quoted section applied to the wrong factual situation. The
verifier proves the quote is real and came from the retrieved material; it does not judge whether the
citation is legally apt.

---

## 7. The hallucination audit

`data/audit-questions.json` holds 30 questions: 24 in-corpus (each with a ground-truth section
verified to exist), 3 naming a section that does not exist, and 3 outside the indexed acts.

`scripts/run-audit.ts` (`pnpm audit:run`) runs each question through two arms:

- **Baseline** - the same model answering from parametric memory, with the same citation grammar but
  no retrieved context (simulating "just ask a chatbot").
- **PatraSaar** - retrieve → constrain → verify.

Every answer is scored deterministically by `src/lib/audit/score.ts`: a citation _exists_ if it
resolves in the corpus, is _verbatim_ if the quote is found in the section, and is _correct_ if it
matches the ground-truth section. A citation that resolves to no real section is counted as
_fabricated_. The same `checkSectionExists` / `checkQuoteVerbatim` functions power the live verifier,
so the audit measures the shipped system.

Results are written to `data/audit-results.json` and rendered as the audit section of the landing page, together with the
methodology and its limitations (small, self-run, single-model, non-adversarial, not peer-reviewed;
mirrors the Stanford RegLab design at much smaller scale).

**Headline result (n=30, `qwen/qwen3.8-27b`):** the ungrounded baseline resolved 100% of its
citations to real sections but only **5.1%** of its quotes were verbatim; PatraSaar verified
**97.6%** of its citations (exists + retrieved + verbatim) and fabricated **0%**. Baseline
question-level accuracy was 87.5% vs PatraSaar 95.8%; both arms abstained on 20% of questions. The
baseline's failure mode is not invented section numbers - it is quoted wording that is not the
statute.

---

## 8. Corpus pipeline

`scripts/build-corpus.ts` (`pnpm corpus:build`):

1. Extract text per PDF with `unpdf`.
2. Normalize whitespace, drop page numbers, running headers and all-caps chapter headings.
3. Split on the heading pattern `NUMBER. Title.-Body`, requiring the em/en dash so the
   "ARRANGEMENT OF SECTIONS" table of contents (which has no dash) is skipped. A tolerant
   `(NUMBER) Title.-Body` mode is enabled for the BNSS edition, with a monotonic guard so
   sub-section markers are not mistaken for section headings.
4. Reject footnote candidates structurally (an internal ". " that real short titles do not contain)
   and de-duplicate on section number.
5. Unwrap amendment markers (`1[imprisonment for life]` → `imprisonment for life`) so quotes are
   naturally verbatim.
6. Write `data/corpus.json` and print a per-act count plus spot checks.

Current corpus: **~3,270 sections with text** across IPC (483), BNS (355), Companies Act (434),
Constitution (419), CrPC (490), BNSS (525), BSA (170), CPC (180), IT Act (108), Indian Contract Act
(104). Repealed/omitted sections with no body are intentionally excluded. To add an act, drop the PDF
in `data/acts/`, add an entry to `ACTS` in the script and re-run `pnpm corpus:build`.

---

## 9. API reference

All responses use one error shape: `{ "error": string, "message": string }`. Auth is a `ps_session`
httpOnly cookie.

| Method & path                 | Auth | Body / params                                                 | Response                                               |
| ----------------------------- | ---- | ------------------------------------------------------------- | ------------------------------------------------------ |
| `GET /api/health`             | no   | -                                                             | `{ status, corpusSections, builtAt, provider, model }` |
| `POST /api/auth/login`        | no   | `{ email, password }`                                         | `{ user }` + sets cookie                               |
| `POST /api/auth/logout`       | no   | -                                                             | `{ ok: true }` + clears cookie                         |
| `GET /api/auth/me`            | yes  | -                                                             | `{ user }` or 401                                      |
| `POST /api/chat`              | yes  | `{ question, caseId?, mode?, incognito?, selectionContext? }` | SSE stream                                             |
| `GET /api/cases`              | yes  | -                                                             | `{ cases }`                                            |
| `POST /api/cases`             | yes  | `{ title }`                                                   | `{ case }` (201)                                       |
| `GET /api/cases/:id`          | yes  | -                                                             | `{ case, messages }`                                   |
| `PATCH /api/cases/:id`        | yes  | `{ title?, pinned? }`                                         | `{ case }`                                             |
| `DELETE /api/cases/:id`       | yes  | -                                                             | `{ ok: true }`                                         |
| `GET /api/sections/:act/:num` | yes  | -                                                             | `{ section }`                                          |

**Chat SSE events** (`text/event-stream`, one JSON object per `data:` frame):

```
data: {"type":"meta","provider":"groq","model":"qwen/qwen3.8-27b","caseId":"…","abstained":false,"incognito":false,"retrieved":[…]}
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

## 10. Data model (Neon Postgres)

```
users     (id TEXT PK, email TEXT UNIQUE, password_hash TEXT, created_at BIGINT)
cases     (id TEXT PK, user_id TEXT, title TEXT, pinned BOOLEAN, created_at BIGINT)
messages  (id TEXT PK, case_id TEXT, role TEXT, content TEXT,
           citations_json TEXT, abstained BOOLEAN, created_at BIGINT)
```

No foreign keys are declared; ownership is enforced in application code. Incognito conversations
never touch the database. `pnpm db:reset` clears cases and messages and re-seeds the demo user.

---

## 11. Auth model

Single seeded user (`pnpm seed`, credentials in `.env`). Passwords are hashed with `scrypt`
(`node:crypto`), never stored in plaintext. Login signs an HS256 JWT (`jose`) stored in an httpOnly,
SameSite=Lax cookie, marked `secure` in production. `src/middleware.ts` verifies the JWT for `/chat`.
For production this would be replaced with real OAuth/multi-user accounts.

---

## 12. Local development

```bash
pnpm install
cp .env.example .env          # fill in GROQ_API_KEY and DATABASE_URL
pnpm corpus:build             # regenerate data/corpus.json (already committed)
pnpm seed                     # create tables + demo user
pnpm dev                      # http://localhost:3000
```

Set `GROQ_API_KEY` for live inference; leave it empty to run in deterministic offline demo mode. With
no `DATABASE_URL` the app falls back to an in-memory store. Useful scripts: `pnpm db:reset`,
`pnpm audit:run`, `pnpm knip`.

---

## 13. Testing strategy

- **Unit (Vitest, `tests/unit`)** - 37 tests. BM25 ranking and determinism; retrieval (exact pinning,
  lexical hits, abstention, act boosting, act scoping, title phrase boost, filler words,
  Constitution articles); citation parsing
  (suffixed numbers, sub-sections, long act names, malformed); act-name resolution; the **verifier**
  (valid, section-not-found, not-retrieved, paraphrased quote, malformed); audit scoring and
  aggregation.
- **E2E (Playwright, `tests/e2e`)** - desktop and **mobile** viewports: login (bad password, guard
  redirect, success landing on `/chat`), chat (streamed answer + verified badge, abstention with no
  citations), audit page, and a mobile drawer/chat smoke test. The LLM stream is stubbed with a
  fixture so E2E never depends on a live API key.

Not covered: live Groq response quality, live database failure modes, visual regression.

---

## 14. Deployment

- **App:** Vercel (framework preset `nextjs`). Set `GROQ_API_KEY`, `GROQ_MODEL`, `JWT_SECRET`,
  `DATABASE_URL` in the project's environment variables.
- **Database:** Neon Postgres. `pnpm seed` creates the schema and demo user.
- **CI:** `.github/workflows/ci.yml` runs on `master` with a **Postgres service container**, so no
  repository secrets are required. It runs typecheck, lint, knip, unit tests, seed, build and E2E.
  Dependabot opens grouped dependency updates weekly (monthly for Actions).
- **Default branch:** `master`.

### Changing the domain

1. Buy/point a domain.
2. Vercel → project → Settings → Domains → Add.
3. DNS: use Vercel nameservers, or an `A` record to `76.76.21.21` (apex) plus a `CNAME` to
   `cname.vercel-dns.com` (www).
4. SSL is automatic; set the new domain as primary.
5. Optional: add `NEXT_PUBLIC_SITE_URL` + `metadataBase` for canonical URLs. No backend change is
   needed (same-origin API).

---

## 15. Known limitations & roadmap

**Limitations**

- Corpus is bounded to ten sources; case law, state amendments, rules and notifications are excluded.
- BNSS is parsed from a mixed-format edition (sectioned, ~99% of nominal count); other acts vary
  slightly from their nominal counts due to repealed/omitted sections.
- English only; single user; no teams or roles.
- BM25 is weak on purely conceptual paraphrase queries sharing no vocabulary with the statute.
- The verifier proves provenance, not legal applicability.
- The audit is small (30 questions), self-run, single-model and non-adversarial.

**Roadmap**

- Hybrid dense + BM25 retrieval fused with reciprocal rank fusion, behind a flag.
- Case-law ingestion with the same verification layer.
- Hindi and other Indian-language queries.
- Real OAuth and multi-user accounts.
- Per-question citations drawn only from the top section to tighten precision.

---

## 16. Disclaimer

PatraSaar provides information about statutory text. It is not legal advice and does not create a
lawyer–client relationship. Verify all provisions against the official bare act before relying on
them.
