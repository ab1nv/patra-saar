# PatraSaar - Presentation Handoff

**Audience:** an AI agent (or a person) preparing a capstone/viva presentation for PatraSaar.
**Goal:** explain what PatraSaar is, why it is different, and how to defend it - honestly.

**Live app:** https://patra-saar-lyart.vercel.app
**Repository:** https://github.com/ab1nv/patra-saar (branch `master`)
**Demo login:** `abhinav@test.com` / `abhinav`
**Key artefact for the panel:** the audit section on the landing page, reachable from the **See Audit** button - a measured hallucination comparison.

> **Read this first.** This project's entire credibility rests on not overclaiming. Never say "zero
> hallucinations", "100% accurate", or "complete Indian legal corpus". The defensible claim is:
> _"No citation reaches you unless it was verified verbatim against the indexed bare act - and we
> measured how often the same model fabricates citations without that check."_

---

## 1. Executive summary

PatraSaar is a retrieval-augmented question-answering tool for Indian statutory law. It answers
questions about ten indexed sources - the Indian Penal Code, Bharatiya Nyaya Sanhita, Bharatiya
Sakshya Adhiniyam, Bharatiya Nagarik Suraksha Sanhita, Code of Criminal Procedure, Code of Civil
Procedure, the Constitution of India, the Indian Contract Act, the IT Act, and the Companies Act -
using **only** an indexed corpus of ~3,200 parsed sections. A language model is constrained to
answer from the retrieved sections and must express every legal assertion as a machine-checkable
citation containing a verbatim quote. A **deterministic, non-LLM verifier** then checks each
citation before it is shown: does the section exist, was it retrieved for this question, and does
the quote appear character-for-character in the source text. Citations that pass are shown as
verified and can be expanded to reveal the real statutory text; citations that fail are struck
through and labelled with the exact failure. When retrieval finds nothing above threshold, the
system **abstains** rather than guessing.

The design thesis is not that the model can be prevented from hallucinating. It is that
hallucinations can be **caught deterministically and measured**. To prove it, the project ships a
**hallucination audit**: the same model, on the same 30-question ground-truth set, with and without
retrieval-plus-verification, scored automatically against the corpus (see the audit section on the landing page).

The one-line pitch: **"It cites the law, or it says it doesn't know."**

---

## 2. Feature summary

**Verified citations (the core).**

- Strict citation grammar the model must emit: `[[ACT_CODE s.NUMBER | "verbatim quote"]]`.
- Three server-side checks per citation: **sectionExists**, **wasRetrieved**, **quoteVerbatim**.
- Verified citations render as green chips that open a drawer with the real statutory text;
  failures are struck through with a reason (`section_not_found`, `not_retrieved`,
  `quote_not_verbatim`).
- Sub-section citations (e.g. `BNS s.318(2)`) are normalised to the base section.

**Hallucination audit (public landing-page section).**

- 30 ground-truth questions: 24 in-corpus (each with a verified expected section), 3 naming a
  section that does not exist, 3 outside the indexed acts.
- Two arms on the same model: a **Baseline** answering from parametric memory (no retrieval), and
  **PatraSaar** (retrieve → constrain → verify).
- Deterministic scoring: citation exists / verbatim / correct / fabricated, plus per-question
  accuracy and fabricated-question rate.
- Published methodology, explicit limitations, and side-by-side failure examples.
- **Headline result (n=30, `qwen/qwen3.8-27b`):** only **5.1%** of the ungrounded baseline's quotes
  appear verbatim in the actual statute, versus **97.6%** for PatraSaar; PatraSaar verified **97.6%**
  of the citations it showed and fabricated **0%**. Both arms abstained on 20% of questions. The
  baseline usually names a _real_ section - its weakness is that the quoted wording is not the law.

**Abstention.** A coverage gate on retrieval means weak matches produce a refusal, not a guess.

**Chat workspace.** Streaming markdown answers, inline citation chips, a citation drawer showing
verbatim text, collapsible/resizable sidebar, optimistic pin/rename/delete, incognito mode, and
select-to-cross-question. The active model is shown beside the composer.

**Corpus.** Ten sources parsed at the section/article level from the official PDFs (not blind
chunking). Per-act counts are printed by the build script and shown on the landing page.

**Auth and persistence.** Single seeded demo user, scrypt-hashed password, HS256 JWT in an httpOnly
cookie (actually verified in middleware), and Neon Postgres storage for chats (Drizzle ORM), with an
in-memory fallback if the database is unreachable.

**Offline demo mode.** With no `GROQ_API_KEY`, deterministic extractive answers with real verbatim
citations keep the app and its tests fully working.

---

## 3. Technical summary

**Stack.** Next.js 16 (App Router, Node runtime route handlers) · TypeScript (strict) · Tailwind CSS
v4 · Groq API (`qwen/qwen3.8-27b`) · Neon Postgres + Drizzle ORM · in-process BM25 · `unpdf` ·
`jose` + scrypt · Vitest · Playwright. Deployed on Vercel.

**Request lifecycle (`POST /api/chat`).**

1. Validate session cookie and Zod body.
2. Resolve or create the case (skipped in incognito mode).
3. `retrieve()`: deterministic exact-section lookup + BM25 over title/body, with a coverage gate.
4. Build a prompt containing only the retrieved sections and the citation rules.
5. Stream tokens to the browser as typed SSE events (`meta`, `token`).
6. Run `verifyCitations()` server-side on the assembled answer.
7. Persist (unless incognito), generate a short title, emit `citations`, `title`, `done`.

**Why BM25 and not a vector database.** The corpus is ~3,200 sections; brute-force BM25 is
single-digit milliseconds and fully deterministic, so retrieval is unit-testable. Legal queries are
lexically precise ("punishment for murder", "section 420"), which is exactly where BM25 is strong. At
100× the corpus, add dense retrieval and fuse with reciprocal rank fusion.

**Why section parsing, not blind chunking.** A section has a number, a title and a body. Preserving
that structure is what makes exact lookup and citation verification possible at all.

**Why a deterministic verifier.** The fact-checking literature shows that using a second LLM to
check the first one is unreliable - the verifier can itself hallucinate. PatraSaar's verifier is
normalised string-matching against its own indexed text, so it cannot.

**The verifier's honest limit.** It proves **provenance**, not legal reasoning: a section can be
quoted correctly and still be applied to the wrong situation. This is stated in the UI and must be
stated in the viva.

**Tests.** 33 Vitest unit tests (BM25, retrieval/abstention, citation parsing, act-name resolution,
verifier including the paraphrased-quote failure, migration, audit scoring) and Playwright E2E on
desktop **and mobile** viewports (login + redirect, streaming answer with a verified badge,
abstention, audit page). CI runs typecheck, lint, `knip`, unit tests, a Postgres service container,
seed, build and E2E - with **no repository secrets required**.

**Corpus build.** `scripts/build-corpus.ts` extracts text with `unpdf`, strips page furniture,
splits on the `NUMBER. Title.-Body` heading pattern (with a tolerant `(N) Title.-` mode for mixed
editions), rejects footnote false positives, de-duplicates, and unwraps amendment markers so quotes
are naturally verbatim. Output: `data/corpus.json`.

---

## 4. The presentation strategy (from the planning brief)

> The following is adapted from the strategy brief used to guide this build. Use it to frame the
> talk. Where it makes claims about competitors or the law, corroborating sources are listed in
> Section 9.

### 4.1 The reframe

**Old pitch (loses the room):** "PatraSaar is an AI legal assistant for Indian law that cites its
sources." The immediate objection - _any_ chatbot can be told to cite things, and five Indian
legal-tech products already do - is correct, and the category is saturated.

**New pitch:** PatraSaar is not competing to be a better legal chatbot. It is a working
demonstration, with its own **published, falsifiable measurement**, of a specific and
judicially-urgent problem: general-purpose and even purpose-built commercial legal-AI tools
hallucinate statutory citations at substantial rates, and nobody has measured this for Indian
statutory law with this approach. PatraSaar measures it, on its own corpus, and shows a deterministic
verification layer that drives fabricated citations to zero while being explicit about what it still
cannot catch.

This moves the project from "product demo competing with funded startups" to "small, rigorous
empirical study with a working reference implementation" - a much smaller, winnable fight, and
exactly what an AI/ML capstone panel should reward.

### 4.2 Why now: a real Indian court just ruled on this

> Verify the exact citation before presenting; the case is corroborated by multiple independent
> sources (Section 9).

On **2 July 2026**, in **Pooja Ramesh Singh v. Jammu & Kashmir Bank Ltd. & Anr. (2026 INSC 668)**,
the Supreme Court of India set aside orders of the NCLT and NCLAT in an insolvency matter after
finding they rested on **AI-hallucinated precedents** - some judgments entirely invented, others
real cases padded with fabricated content. The Court declared that a decision relying, even partly,
on fake, non-existent or AI-hallucinated precedents must be set aside, and directed the Bar Council
of India to examine the use of AI-fabricated material and frame guiding principles.

This followed a pattern of similar incidents: the Bengaluru bench of the Income Tax Appellate
Tribunal recalled an order in a ₹669-crore tax dispute after discovering fictitious Supreme Court
and Madras High Court citations; the Kerala High Court (July 2025) and the Gujarat High Court
(April 2026) issued formal policies on AI use in judicial work.

**That is the "why now":** the exact failure mode PatraSaar's verifier targets - a citation that
looks real but isn't - is the specific thing the Supreme Court of India just treated as
zero-tolerance, weeks before the presentation, in a live case with real financial stakes.

### 4.3 The one feature worth building (now built)

The brief's recommendation was to build a **hallucination benchmark** rather than another feature:
_"You already wrote the verifier - you've just never pointed it at an unverified baseline and
published the comparison."_ That is now implemented as the audit harness and the landing-page audit section:
ground-truth questions, an ungrounded baseline arm, deterministic scoring, and an honest
methodology. Instead of saying _"we verify citations,"_ the demo says _"we measured that our model
fabricates citations on N% of questions when ungrounded, and our verifier catches them - here is
the table."_

### 4.4 What to de-emphasise

The IPC→BNS migration mapper was removed from the product by the project owner precisely because the
brief flagged it as crowded and non-differentiating (see Section 6.4). Do not open with it, and do
not claim it as unique. If a panelist raises a competing tool, agree immediately and pivot to the
verification layer and the audit measurement.

---

## 5. Literature review (cite these by name)

Use these to answer "what research exists?" without hesitation.

- **Dahl, Magesh, Suzgun & Ho (2024), "Large Legal Fictions: Profiling Legal Hallucinations in Large
  Language Models," _Journal of Legal Analysis_ 16(1).** LLMs hallucinate on 58% (GPT-4) to 88%
  (Llama 2) of specific, verifiable questions about real federal court cases - **even at temperature
  0**. Models also fail to correct a user's false legal premise and are poor at predicting their own
  hallucination (you cannot just ask "are you sure?").
- **Magesh, Surani, Dahl, Suzgun, Manning & Ho (2025), "Hallucination-Free? Assessing the Reliability
  of Leading AI Legal Research Tools," _Journal of Empirical Legal Studies_.** First independent,
  preregistered audit of commercial legal-AI products: **Lexis+ AI ~17%**, **Westlaw AI-Assisted
  Research ~33%**, plain **GPT-4 ~43%** hallucination - despite LexisNexis's "100% hallucination-free"
  marketing claim, which the study called overstated and which was subsequently softened. _This is
  the single most useful citation in the deck._
- **Manakul, Liusie & Gales (2023), "SelfCheckGPT: Zero-Resource Black-Box Hallucination
  Detection."** Detects hallucination by sampling consistency rather than an external database - a
  useful contrast: probabilistic signal, not a guarantee.
- **"Verifying the Verifiers" (2025, arXiv 2506.13342).** Finds that fact-verifiers themselves are
  frequently unreliable, because most verification pipelines are themselves LLM calls that can
  hallucinate about whether something else hallucinated. **The strongest technical justification for
  PatraSaar's design choice.**
- **Zhang et al. (2023), "SAC3: Reliable Hallucination Detection via Semantic-aware Cross-check
  Consistency."** Shows self-consistency alone is insufficient (models can be consistently wrong).
- **Hou, Weller, Qin et al. (2025), "CLERC: A Dataset for Legal Case Retrieval and Retrieval-Augmented
  Analysis Generation," NAACL 2025.** Large legal-RAG benchmark; retrieval models struggle and LLMs
  still hallucinate **even with retrieved context** - evidence that retrieval alone is insufficient.
- **LegalGraphRAG (2026, arXiv 2605.28120).** Multi-agent "Researcher / Auditor / Adjudicator"
  pipeline for verified legal reasoning - a heavier academic instance of the same verify-before-trust
  philosophy.

**One paragraph you can say almost verbatim:**

> "The research consensus since 2024 is that retrieval-augmented generation reduces but does not
> eliminate legal hallucination. Stanford's RegLab audit of Lexis+ AI and Westlaw found 17–33%
> hallucination rates in commercial, RAG-based tools _marketed as solved_. Separately, the
> fact-checking literature has found that using a second LLM to verify the first doesn't reliably
> fix this, because the verifier can hallucinate too. PatraSaar's verifier is deliberately **not** an
> LLM - it is a deterministic three-check comparison against indexed source text - specifically to
> avoid that failure mode, and we measure the resulting rate ourselves rather than asserting it."

---

## 6. Competitor analysis (the honest version)

### 6.1 Global generalists

ChatGPT / Claude / Gemini / Perplexity: win on breadth, fluency and zero setup; have **no
deterministic verification, no published Indian-statute hallucination rate, no abstention guarantee**.

### 6.2 Global legal-AI specialists

Harvey AI (enterprise, used by major Indian firms, sales-only pricing); **Lexis+ AI / CoCounsel /
Westlaw AI-Assisted Research** (RAG-grounded, marketed as "hallucination-free", ~$80–500/user/month,
independently measured at 17–33% hallucination); vLex Vincent AI. _The measurement point is the
strongest talking point: even the tools that claim to have solved this have not, and it took an
outside academic audit to show it. Nobody has run that audit for Indian central acts._

### 6.3 Indian-native legal-tech

SCC Online AI, Manupatra AI, CaseMine (AMICUS/CaseIQ), LegitQuest, VIDUR AI, BharatLaw.AI,
NyayGuru/KanoonGPT/Niyam.ai, Provakil, Adalat AI, Supreme Today AI. These are established,
subscription-scale products; PatraSaar does not compete on corpus breadth or case law.

### 6.4 IPC→BNS conversion tools (deliberately out of scope)

NobleLex, a Play Store "IPC to BNS Converter", ipc2bns.in, LawCentral AI, Glomiq, AskCAB. **This
space is saturated and this project does not claim it.** Removed from the product for exactly this
reason.

### 6.5 Prior art on the verify-or-refuse pattern (be honest)

The "retrieve, generate, verify the quote is verbatim or refuse" pattern is known, not invented here:
an open-source project applies it to Australian tax law; a GitHub project does it for Indian
CrPC/BNSS; LegalGraphRAG proposes an academic "Auditor" agent. **The defensible differentiator is
not the pattern. It is (a) the verifier is deterministic string-matching, not another LLM, and (b)
the failure rate is measured and published, on a corpus (Indian central acts mid-BNS-transition)
that the others do not target with this rigour.**

---

## 7. Demo script and pre-written answers

### 7.1 Three-minute demo

1. **Landing page (0:00).** Read the tagline: _"It cites the law, or it says it doesn't know."_ One
   sentence on what it does.
2. **Log in (0:20).** Ask: _"What is the punishment for murder under the BNS?"_ Show the streaming
   answer, then the **✓ verified** badge, then click a citation chip to reveal the verbatim section.
3. **The money shot (0:55).** Ask something outside the corpus - _"What are the current GST rates on
   textiles?"_ - and let it **refuse**. _"It doesn't guess. Retrieval scored below threshold, so it
   abstained."_
4. **The audit (1:25).** Click **See Audit** to jump to the audit section. Show the fabricated-citation-rate comparison and one
   side-by-side example. _"Same model. Without retrieval and verification it invents or misattributes
   citations; with them, every shown citation is verified."_
5. **Scope (2:00).** State exactly what is indexed (10 acts) and what is not (case law, state
   amendments, rules/notifications). Owning the boundary is a strength.
6. **Architecture (2:25).** Thirty seconds on the three checks, then one honest line on what
   verification does _not_ catch (correct provenance ≠ correct legal reasoning).

### 7.2 The two questions you will be asked

- **"How do you know it's not hallucinating?"** → _"I assume it will. The verifier catches it. Here's
  the unit test where a paraphrased quote fails verification, and the audit where the ungrounded
  baseline fabricates citations that the verified arm does not."_
- **"Why not just use ChatGPT?"** → _"For general questions, you should. This is narrow on purpose:
  it can only answer from ten indexed sources, and it proves every citation against the source text.
  Different design point, not a better model."_

### 7.3 More likely panel questions

- _"Isn't this just RAG?"_ → Yes, plus a deterministic post-generation verifier and a published
  measurement. RAG alone is explicitly shown in the literature (CLERC, the RegLab audit) to still
  hallucinate.
- _"Why no vector database?"_ → ~3,200 sections; BM25 is milliseconds, deterministic and
  unit-testable; legal queries are lexically precise. Scale changes the answer.
- _"What about case law?"_ → Not indexed, stated plainly. Roadmap item.
- _"How rigorous is your benchmark?"_ → Small (30 questions), self-run, single-model,
  non-adversarial, not peer-reviewed; it mirrors the RegLab design at much smaller scale. Say this
  before they ask.

---

## 8. How to test the deployed app

**URL:** https://patra-saar-lyart.vercel.app · **Login:** `abhinav@test.com` / `abhinav`

1. **Auth and redirect.** Open `/chat` while signed out → redirected to `/login`. Sign in → you land
   **on `/chat`** (the login-redirect bug is fixed; no manual refresh needed).
2. **Grounded answer + verification.** Ask _"What is the punishment for murder under the BNS?"_ →
   streamed answer, a **✓ N verified** badge, numbered citation chips. Click a chip → drawer with the
   verbatim section text and the model's quote.
3. **Abstention.** Ask _"What are the current GST rates on textiles?"_ → a refusal, **no citations
   rendered**.
4. **New acts.** Ask _"What does Article 21 of the Constitution protect?"_, _"When may a police
   officer arrest without a warrant under the BNSS?"_, _"What is the procedure under CPC section
   9?"_ → correct sections, verified citations.
5. **Audit.** On the landing page, open the audit section (public, no login) → headline stats, per-metric bars, side-by-side
   examples, full table, methodology.
6. **Chat management.** Sidebar: create several chats, **pin**, **rename**, **delete** (no
   confirmation dialog now).
7. **Incognito.** Toggle incognito → ask a question → it answers but **nothing is saved** to the
   sidebar.
8. **Model label.** The model id is shown beside the composer and under the chat title.
9. **Cross-question.** Select a phrase in an answer → a **Cross-question** button appears → click →
   the selected passage is carried into the composer as context.
10. **Mobile.** Open on a phone: the sidebar becomes a hamburger drawer; the layout reflows; the
    citation drawer is full-screen; the site is fully usable.
11. **Favicon.** The PatraSaar logo mark appears in the browser tab and on the iOS home screen.

**If something looks stale:** the app is a serverless deployment; a hard refresh (Ctrl/Cmd+Shift+R)
clears cached assets.

---

## 9. Domain and deployment notes

### 9.1 Changing the domain name

1. **Buy or point a domain** (Cloudflare Registrar, Namecheap, GoDaddy, …). An Indian `.in` domain
   is available if desired.
2. **Vercel → project `patra-saar` → Settings → Domains → Add**, and enter the domain.
3. **DNS**, either method:
   - Use **Vercel nameservers** (simplest), or
   - Keep your DNS provider and add: an **A record** for the apex pointing to `76.76.21.21`, and a
     **CNAME** for `www` pointing to `cname.vercel-dns.com`.
4. **SSL is automatic** (Vercel issues the certificate). Set the new domain as **primary** so the old
   `*.vercel.app` URL redirects to it.
5. **Optional code change:** add `NEXT_PUBLIC_SITE_URL` and a `metadataBase` in
   `src/app/layout.tsx` so canonical/OpenGraph URLs use the new domain, and update the README badge
   and links.
6. **No backend change is required** - the API is same-origin with the app, so there is no CORS
   configuration to update.

### 9.2 Operating the project

- **Re-run the audit:** `pnpm audit:run` (needs `GROQ_API_KEY`; writes `data/audit-results.json`).
- **Clear all conversations:** `pnpm db:reset` (keeps the demo user).
- **Rebuild the corpus:** drop PDFs into `data/acts/`, add an entry in `scripts/build-corpus.ts`,
  run `pnpm corpus:build`.
- **CI:** `.github/workflows/ci.yml` runs on `master` with a Postgres service container - no
  repository secrets required. Dependabot opens grouped dependency updates.

---

## 10. Sources for the claims in this document

- Supreme Court of India, _Pooja Ramesh Singh v. Jammu & Kashmir Bank Ltd. & Anr._, 2026 INSC 668
  (2 July 2026) - reported by Supreme Court Observer, Vision IAS / The Hindu, IndiaLaw, and others.
- ITAT Bengaluru ₹669-crore order recalled over fictitious citations - reported by Law Times Journal
  and others.
- Dahl, Magesh, Suzgun & Ho (2024), _Journal of Legal Analysis_ 16(1).
- Magesh, Surani, Dahl, Suzgun, Manning & Ho (2025), _Journal of Empirical Legal Studies_.
- Manakul, Liusie & Gales (2023), SelfCheckGPT.
- "Verifying the Verifiers" (2025), arXiv:2506.13342.
- Zhang et al. (2023), SAC3.
- Hou et al. (2025), CLERC, NAACL 2025.
- LegalGraphRAG (2026), arXiv:2605.28120.

> **Caveat for the presenter:** confirm each citation independently before presenting (dates,
> reporter and holding). This project's whole argument is that citations must be checked - apply the
> same standard to the presentation itself.
