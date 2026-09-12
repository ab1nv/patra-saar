# Changelog

All notable changes to this project are documented here. Format follows
[Conventional Commits](https://www.conventionalcommits.org/).

## [3.2.0] - 2026-09-16

### Added

- **Exact-phrase boost in retrieval.** BM25 boosts a section 1.5x when its title contains a
  contiguous phrase from the question, and 1.3x for a single-word title the question names
  verbatim. Fixes the BNS-theft ranking miss.
- **Sub-section highlighting.** A citation such as `BNS s.318(2)` keeps its sub-section
  through parsing and verification, and the drawer highlights that paragraph in the full
  section text.
- **Audit hero metrics** on the landing page: the 5.1% vs 97.6% verbatim comparison.
- **Model labelling** in the chat header, beside the composer, in the landing hero, in the
  audit section and in the comparison table.

### Changed

- The hallucination audit moved from its own `/audit` page into a section on the landing
  page, reachable from a **See Audit** button in the hero.
- Chat list and history are optimistic and cached: deleting, renaming, pinning and creating
  chats update the UI instantly and persist in the background. The chat list is cached in
  localStorage and per-chat messages are cached in memory for instant switching.
- "New inquiry" renamed to "New Chat".
- The composer is realigned, with the model id on the left and the Send button on the right.
- Example prompts now mirror the benchmark question set.
- A transient Neon cold-start failure is retried once before surfacing.

### Removed

- Document attachments: the paperclip, the attachment state and the `/api/extract` route are
  gone. PatraSaar answers from its indexed corpus only.

## [3.1.0] - 2026-09-16

### Added

- **Hallucination audit.** A two-arm benchmark (ungrounded baseline vs. retrieve-and-verify) over a
  30-question ground-truth set, scored deterministically against the corpus, with a public `/audit`
  page, methodology and limitations. New `pnpm audit:run`.
- **Corpus expanded** from 6 to 10 sources: added the Bharatiya Nagarik Suraksha Sanhita, the Code
  of Criminal Procedure, the Code of Civil Procedure and the Constitution of India (~3,270 sections
  total). Added "Article" reference parsing, new act aliases, and a tolerant heading mode for mixed
  BNSS editions.
- Real logo mark restored from git history and generated into an app icon set (`favicon.ico`,
  `icon.png`, `apple-icon.png`, PWA icons, web manifest).
- Responsive layout with a mobile sidebar drawer, scroll-reveal and entrance animations, and reduced
  motion support.
- `pnpm db:reset` to clear all conversations.
- Mobile Playwright project and an audit unit-test suite.

### Changed

- **Removed the IPC↔BNS mapper and the coverage ledger** (and their APIs, tests and navigation), as
  the mapper is a crowded space and the audit is the differentiator.
- Rebuilt the landing page and chat interface with an editorial design pass.
- Context budget for prompts, so expanded sections stay within the free-tier token limit.
- CI now runs on `master` with a self-contained Postgres service container (no repository secrets).

### Fixed

- **Login now redirects reliably** after sign-in (a full navigation replaces a racing soft push).
- Deleting a chat no longer shows a confirmation dialog.
- False abstentions caused by act-name words ("Indian", "Penal", "Constitution") and query filler in
  the retrieval coverage calculation.
- Constitution and `article` references now resolve to the correct act instead of falling back to an
  unrelated section with the same number.
- Sub-section citation syntax (e.g. `BNS s.318(2)`) is normalised to the base section.
- Removed stale `.next` type artifacts that broke `tsc` after route deletions.

## [3.0.0] - 2026-09-15

### Rewritten

- Replaced the SvelteKit + Hono + Cloudflare Workers monorepo with a single Next.js 16 (App Router)
  application deployed on Vercel.
- Replaced vector retrieval with an in-process BM25 index over a parsed section corpus.
- Replaced the Python ingestion script with the TypeScript corpus builder.

### Added

- **Verified citations** with a strict grammar and a server-side three-check verifier.
- **Abstention gate** when retrieval coverage is low.
- Chat workspace: streaming, citation chips, collapsible sidebar, pin/rename/delete, incognito,
  attachments, cross-questioning.
- Model-generated chat titles and dynamic window titles.
- Neon Postgres + Drizzle persistence with an in-memory fallback.
- Landing page, DOCS.md, CI workflow, Dependabot config and Husky hooks.

### Fixed

- Authentication now verifies the JWT instead of hard-coding a dummy user.
- Streaming uses typed SSE events rather than raw text.
- Act names containing a year resolve to the correct act.
