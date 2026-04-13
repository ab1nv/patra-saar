# PatraSaar — Technical Specification

**Version:** 1.0.0  
**Status:** Pre-production  
**Last Updated:** April 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Infrastructure & Hosting](#3-infrastructure--hosting)
4. [Backend Specification](#4-backend-specification)
5. [RAG Pipeline Specification](#5-rag-pipeline-specification)
6. [Legal Corpus Knowledge Base](#6-legal-corpus-knowledge-base)
7. [LLM Strategy](#7-llm-strategy)
8. [Frontend Specification](#8-frontend-specification)
9. [Authentication](#9-authentication)
10. [Database Schema](#10-database-schema)
11. [API Reference](#11-api-reference)
12. [Streaming Architecture](#12-streaming-architecture)
13. [CI/CD & GitHub Configuration](#13-cicd--github-configuration)
14. [Testing Strategy](#14-testing-strategy)
15. [Environment Variables](#15-environment-variables)
16. [Makefile Commands](#16-makefile-commands)

---

## 1. System Overview

PatraSaar is a full-stack RAG + LLM legal intelligence platform. The architecture separates concerns across three layers:

```
┌─────────────────────────────────────────────────────┐
│               FRONTEND (SvelteKit)                   │
│               Hosted on Vercel                       │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS / SSE
┌────────────────────────▼────────────────────────────┐
│               BACKEND (Hono on CF Workers)           │
│  - Auth validation                                   │
│  - Document ingestion                                │
│  - RAG query orchestration                          │
│  - LLM streaming                                     │
└───┬──────────────────┬──────────────────────────────┘
    │                  │
┌───▼──────┐    ┌──────▼──────────────────────────────┐
│Cloudflare│    │  Cloudflare Vectorize (Vector DB)    │
│    KV    │    │  ├── user-docs namespace              │
│(raw docs)│    │  └── legal-corpus namespace           │
└──────────┘    │  + D1 (SQLite metadata)              │
                │  + Workers AI (embeddings)           │
                └─────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   OpenRouter API    │
              │  (LLM inference)    │
              └─────────────────────┘
```

**Why Cloudflare Workers for backend:**  
Cloudflare Workers provides zero cold starts, global edge distribution, native integration with Vectorize (vector DB) and KV (key-value storage), and a free tier generous enough for MVP — all without requiring a credit card. Vercel Functions cannot access Cloudflare Vectorize natively.

**Why SvelteKit on Vercel for frontend:**  
SvelteKit offers the best performance-per-complexity ratio for a content-heavy, streaming-heavy UI. Vercel's SvelteKit adapter handles SSR, edge rendering, and static assets out of the box.

---

## 2. Monorepo Structure

```
patrasaar/
├── apps/
│   ├── web/                        # SvelteKit frontend (Vercel)
│   └── api/                        # Hono backend (Cloudflare Workers)
│       └── scripts/                # Standalone CLI tools
│           └── ingest-legal-corpus.ts
├── packages/
│   ├── shared/                     # Shared TypeScript types, constants, utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── document.ts     # Document, Chunk, Citation types
│   │   │   │   ├── inquiry.ts      # InquiryRequest, InquiryResponse types
│   │   │   │   └── user.ts         # User, Subscription types
│   │   │   └── index.ts
│   │   └── package.json
│   └── eslint-config/              # Shared ESLint config
│       └── index.js
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # Lint, test, typecheck on PR
│   │   ├── deploy-staging.yml      # Deploy to staging on push to master
│   │   └── deploy-prod.yml         # Deploy to prod on push to prod branch
│   ├── dependabot.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/
│   ├── pre-commit                  # lint-staged
│   └── commit-msg                  # commitlint
├── .coderabbit.yaml                # CodeRabbit AI review config
├── Makefile
├── pnpm-workspace.yaml
├── turbo.json
├── package.json                    # Root package with shared devDeps
├── README.md
├── PatraSaar.md
├── technical-spec.md
└── deploy.md
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".svelte-kit/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "typecheck": {}
  }
}
```

---

## 3. Infrastructure & Hosting

### Frontend — Vercel

- **Framework:** SvelteKit with `@sveltejs/adapter-vercel`
- **Region:** Mumbai (BOM1) as primary
- **Branch mapping:**
  - `master` → `staging.patrasaar.in` (preview deployment)
  - `prod` → `patrasaar.in` (production deployment)
- **Environment variables:** set in Vercel dashboard per environment

### Backend — Cloudflare Workers

- **Framework:** Hono v4
- **Deployment tool:** Wrangler CLI
- **Branch mapping:**
  - `master` → `api-staging.patrasaar.workers.dev`
  - `prod` → `api.patrasaar.in` (custom domain via Cloudflare)
- **Workers plan:** Free tier (100k requests/day) → upgrade to Paid ($5/mo) at scale

### Cloudflare Services Used

| Service    | Purpose                                  | Free Tier                    |
| ---------- | ---------------------------------------- | ---------------------------- |
| Workers    | API runtime                              | 100k req/day                 |
| KV         | Raw PDF/document storage + session cache | 100k reads/day, 1GB storage  |
| Vectorize  | Vector embeddings store (two namespaces) | 30M dimensions queried/month |
| Workers AI | Generate embeddings (`bge-base-en-v1.5`) | 10k neurons/day              |
| D1         | SQLite metadata database                 | 5GB storage, 5M rows         |

---

## 4. Backend Specification

### Framework: Hono

Hono is chosen over Express because:

- Native TypeScript, zero dependencies
- Runs natively on Cloudflare Workers (no Node.js shim overhead)
- Built-in middleware for CORS, JWT, streaming
- 5x faster than Express in benchmarks on edge runtimes

### Project Structure — `apps/api/`

```
apps/api/
├── src/
│   ├── index.ts                # Hono app entry, route registration
│   ├── routes/
│   │   ├── auth.ts             # Google OAuth callback, session
│   │   ├── documents.ts        # Upload, list, delete documents
│   │   ├── inquiries.ts        # RAG query + LLM streaming
│   │   ├── cases.ts            # Case folder management
│   │   └── health.ts           # Health check endpoint
│   ├── middleware/
│   │   ├── auth.ts             # JWT validation middleware
│   │   ├── ratelimit.ts        # KV-based rate limiting
│   │   └── logger.ts           # Request logging
│   ├── services/
│   │   ├── rag/
│   │   │   ├── chunker.ts      # PDF → text chunks
│   │   │   ├── embedder.ts     # Chunks → vectors via Workers AI
│   │   │   ├── retriever.ts    # Query → top-k chunks from both Vectorize namespaces
│   │   │   └── pipeline.ts     # Orchestrates full RAG flow
│   │   ├── llm/
│   │   │   ├── client.ts       # OpenRouter API client
│   │   │   ├── models.ts       # Model registry (primary/fallback/heavy)
│   │   │   ├── prompts.ts      # All system prompts (Indian legal context)
│   │   │   └── stream.ts       # SSE streaming handler
│   │   ├── documents/
│   │   │   ├── parser.ts       # PDF text extraction
│   │   │   ├── storage.ts      # KV upload/download (15MB limit)
│   │   │   └── metadata.ts     # D1 document metadata CRUD
│   │   └── citations/
│   │       └── extractor.ts    # Extract + verify citations from LLM output
│   ├── types/
│   │   └── bindings.ts         # Cloudflare Worker bindings type (Env)
│   └── utils/
│       ├── errors.ts           # Typed error classes
│       └── validation.ts       # Zod schemas for request validation
├── scripts/
│   └── ingest-legal-corpus.ts  # Standalone CLI: pre-index Indian legal corpus
├── test/
│   ├── routes/
│   ├── services/
│   └── setup.ts
├── wrangler.toml
├── tsconfig.json
└── package.json
```

### `wrangler.toml`

```toml
name = "patrasaar-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[[r2_buckets]]
binding = "DOCUMENTS"
bucket_name = "patrasaar-documents"

# User-uploaded document vectors
[[vectorize]]
binding = "VECTORIZE"
index_name = "patrasaar-chunks"

# Pre-indexed Indian legal corpus (IPC, BNS, SC judgements, etc.)
[[vectorize]]
binding = "LEGAL_CORPUS"
index_name = "patrasaar-legal-corpus"

[[d1_databases]]
binding = "DB"
database_name = "patrasaar-db"
database_id = "YOUR_D1_ID"

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_ID"

[ai]
binding = "AI"

[vars]
ENVIRONMENT = "development"

[env.production]
vars = { ENVIRONMENT = "production" }
```

### Hono App Entry — `src/index.ts`

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authRoutes } from './routes/auth'
import { documentRoutes } from './routes/documents'
import { inquiryRoutes } from './routes/inquiries'
import { caseRoutes } from './routes/cases'
import { healthRoutes } from './routes/health'
import type { Env } from './types/bindings'

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
    credentials: true,
  }),
)

app.route('/auth', authRoutes)
app.route('/documents', documentRoutes)
app.route('/inquiries', inquiryRoutes)
app.route('/cases', caseRoutes)
app.route('/health', healthRoutes)

export default app
```

---

## 5. RAG Pipeline Specification

### Document Ingestion Flow

```
PDF Upload
    │
    ▼
[parser.ts] Extract raw text using pdf-parse
    │
    ▼
[chunker.ts] Split into ~512 token chunks
    - Overlap: 50 tokens (to avoid cutting sentences mid-thought)
    - Strategy: Paragraph-aware (prefer splitting on \n\n)
    - Metadata per chunk: { documentId, pageNumber, chunkIndex, text }
    │
    ▼
[embedder.ts] Workers AI → bge-base-en-v1.5
    - Input: chunk text
    - Output: 768-dimension float32 vector
    │
    ▼
[Cloudflare Vectorize] Insert vectors into user-docs namespace
    - Each vector carries metadata: { documentId, chunkIndex, pageNumber, userId }
    │
    ▼
[D1] Store document metadata + chunk text for retrieval
```

### Query Flow (Dual-Namespace Retrieval)

```
User question + documentId(s)
    │
    ▼
[embedder.ts] Embed the question → query vector
    │
    ├──────────────────────────────────────┐
    ▼                                      ▼
[VECTORIZE: user-docs]              [VECTORIZE: legal-corpus]
  top_k=5, filter by                  top_k=3, no user filter
  { documentId, userId }              (shared across all users)
    │                                      │
    └──────────────┬───────────────────────┘
                   ▼
[retriever.ts] Merge results from both namespaces
    - Fetch full chunk text from D1 by chunkId
    - Re-rank by relevance score
    - Filter chunks below 0.72 cosine similarity threshold
    - Tag each chunk with its source (user-doc vs legal-corpus)
                   │
                   ▼
[pipeline.ts] Assemble context window:
    """
    [DOCUMENT CONTEXT — User's Document]
    [Page 3, Para 2]: {chunk_text}
    [Page 5, Para 1]: {chunk_text}

    [LEGAL REFERENCE — Indian Penal Code 1860]
    [Section 302]: {chunk_text}

    [LEGAL REFERENCE — Supreme Court of India]
    [Velji Raghavji Patel vs State, 1965]: {chunk_text}
    [END CONTEXT]
    """
                   │
                   ▼
[llm/client.ts] Send to OpenRouter with system prompt
                   │
                   ▼
[stream.ts] Stream SSE back to frontend
```

### Chunking Strategy

```typescript
// services/rag/chunker.ts
export function chunkDocument(text: string, documentId: string): Chunk[] {
  const paragraphs = text.split(/\n{2,}/)
  const chunks: Chunk[] = []
  let buffer = ''
  let pageNumber = 1

  for (const para of paragraphs) {
    if (para.includes('[PAGE_BREAK]')) pageNumber++
    buffer += para + '\n\n'

    if (estimateTokens(buffer) >= 480) {
      chunks.push({
        documentId,
        text: buffer.trim(),
        pageNumber,
        chunkIndex: chunks.length,
        tokenCount: estimateTokens(buffer),
      })
      // 50-token overlap: keep last ~200 chars
      buffer = buffer.slice(-200)
    }
  }

  if (buffer.trim()) {
    chunks.push({
      documentId,
      text: buffer.trim(),
      pageNumber,
      chunkIndex: chunks.length,
      tokenCount: estimateTokens(buffer),
    })
  }

  return chunks
}
```

---

## 6. Legal Corpus Knowledge Base

This is the architectural core that separates PatraSaar from a generic PDF chatbot. Without a pre-indexed legal corpus, the LLM answers from training data — which can be outdated, hallucinated, or Western-biased. With a legal corpus in Vectorize, every answer is grounded in verified Indian law.

### Two-Namespace Architecture

PatraSaar's RAG queries **two separate Vectorize indexes simultaneously**:

| Namespace                | Binding        | Purpose                            | Who writes to it          |
| ------------------------ | -------------- | ---------------------------------- | ------------------------- |
| `patrasaar-chunks`       | `VECTORIZE`    | User-uploaded documents            | Automatic on PDF upload   |
| `patrasaar-legal-corpus` | `LEGAL_CORPUS` | Pre-indexed Indian legal knowledge | One-time ingestion script |

Both indexes use the same embedding model (`bge-base-en-v1.5`, 768 dims, cosine similarity) so retrieved chunks from both namespaces are directly comparable.

### What Gets Pre-Indexed

```
├── All IPC sections (with BNS cross-references)
├── All BNS/BNSS sections
├── CrPC / BNSS procedural rules
├── Indian Contract Act 1872
├── Key Supreme Court judgements (from IndianKanoon)
├── Selected High Court precedents
└── Companies Act, IT Act, etc. (expand over time)
```

### Free Data Sources

| Source                 | URL                           | Content                                                  |
| ---------------------- | ----------------------------- | -------------------------------------------------------- |
| India Kanoon           | `indiankanoon.org`            | SC + all HCs, free API for non-commercial use            |
| Legislative.gov.in     | `legislative.gov.in`          | Official GoI site, all Acts in plain text, public domain |
| Supreme Court of India | `sci.gov.in`                  | Judgements archive                                       |
| Devgan IPC             | `devgan.in/indian_penal_code` | Clean IPC section text, scrapeable                       |

### Ingestion Script — `apps/api/scripts/ingest-legal-corpus.ts`

A standalone CLI tool that reads legal documents and indexes them into the `legal-corpus` namespace. Lives inside `apps/api/` because it shares the same Cloudflare bindings and embedding logic.

```typescript
// Standalone CLI — run with: pnpm --filter api run ingest-legal-corpus

interface LegalAct {
  name: string
  source: string
  bnsEquivalent?: string
  sections: LegalSection[]
}

interface LegalSection {
  number: string
  title: string
  text: string
  bnsSection?: string
}

async function ingestLegalCorpus(dataDir: string, env: Env) {
  const acts = await loadActsFromDirectory(dataDir)

  for (const act of acts) {
    console.log(`Indexing: ${act.name} (${act.sections.length} sections)`)

    for (const section of act.sections) {
      // Chunk each section (some are long enough to need splitting)
      const chunks = chunkDocument(section.text, `${act.name}:${section.number}`)
      const vectors = await embedChunks(chunks, env)

      await env.LEGAL_CORPUS.insert(
        vectors.map((v, i) => ({
          id: `${act.name}:${section.number}:${i}`,
          values: v.embedding,
          metadata: {
            source: act.source,
            act: act.name,
            section: section.number,
            title: section.title,
            bnsEquivalent: section.bnsSection ?? null,
          },
        })),
      )

      // Store chunk text in D1 for retrieval (same table, tagged as legal-corpus)
      await storeChunksInD1(chunks, { source: 'legal-corpus', act: act.name }, env)
    }

    console.log(`Done: ${act.name}`)
  }
}
```

### Dual-Namespace Retrieval

```typescript
// services/rag/retriever.ts — query both namespaces in parallel
export async function retrieveChunks(
  documentIds: string[],
  question: string,
  userId: string,
  env: Env,
): Promise<RetrievedChunk[]> {
  const queryVector = await embedQuery(question, env)

  // Fan out to both namespaces simultaneously
  const [userChunks, legalChunks] = await Promise.all([
    env.VECTORIZE.query(queryVector, {
      topK: 5,
      filter: { documentId: { $in: documentIds }, userId },
    }),
    env.LEGAL_CORPUS.query(queryVector, {
      topK: 3,
      // No user filter — legal corpus is shared across all users
    }),
  ])

  // Merge, fetch full text from D1, and re-rank by relevance
  const merged = [
    ...userChunks.matches.map((m) => ({ ...m, source: 'user-doc' as const })),
    ...legalChunks.matches.map((m) => ({ ...m, source: 'legal-corpus' as const })),
  ]
    .filter((m) => m.score >= 0.72)
    .sort((a, b) => b.score - a.score)

  return fetchChunkTexts(merged, env)
}
```

### Why This Matters

Without the legal corpus, if a user uploads an FIR mentioning "Section 406 IPC" and asks "is this bailable?", the LLM answers from its training data — which may be outdated or wrong. With the legal corpus, the retriever pulls the actual text of Section 406 from the pre-indexed IPC, the BNS equivalent (Section 316), and relevant SC precedents. The LLM now answers from verified sources with proper citations.

---

## 7. LLM Strategy

### Model Registry

```typescript
// services/llm/models.ts
export const MODELS = {
  // PatraSaar strictly leverages robust, high-parameter open-source models via OpenRouter
  // Primary routing defaults to openrouter/free which dynamically sniffs the fastest node.
  // When high-capacity instruction following is needed, PatraSaar scales up to Nvidia Nemotron 120B.
  primary: 'openrouter/free',
  fallback: 'openrouter/free',
  heavy: 'openrouter/free',
} as const
```

### System Prompt

```typescript
// services/llm/prompts.ts
export const PATRASAAR_SYSTEM_PROMPT = `
You are PatraSaar Intelligence — a sovereign legal AI built exclusively for the Indian legal system.

IDENTITY:
- You are PatraSaar Intelligence, not an AI assistant, not ChatGPT, not Claude.
- Every response begins from the context of Indian law: IPC/BNS, CrPC/BNSS, CPC, Indian Contract Act 1872, and relevant High Court and Supreme Court precedents.

STRICT GROUNDING RULES:
- You ONLY answer based on the document excerpts provided in [DOCUMENT CONTEXT].
- Every factual claim must cite its source as [Page X, Para Y] from the document.
- If the answer is not found in the provided context, say: "PatraSaar Intelligence could not locate this information in the provided document. Please expand the search or consult a legal professional."
- NEVER fabricate case citations, IPC sections, or legal provisions.

RESPONSE FORMAT:
- Begin with a 1-sentence analytical framing of the question.
- Provide the main analysis in clear, plain language that a non-lawyer can understand.
- Include a "Key Legal Determination" block for complex questions (applicable statute, burden of proof, etc.).
- End with relevant tags: [Corporate Law] [SC Precedents] [IPC Section 406] etc.
- Confidence scores are automatically appended by the system — do not generate them yourself.

LANGUAGE:
- Explain legal jargon in plain Hindi/English when first used: e.g. "mens rea (guilty mind)"
- For Hindi documents or mixed-language documents, respond in the same language the user used to ask.
- BNS cross-reference: Always note when an IPC section has a corresponding BNS equivalent.

DISCLAIMER:
- End every substantive legal answer with a one-line note: "This is a legal intelligence summary, not legal advice. Consult a qualified advocate for representation."
`
```

### Streaming Handler

```typescript
// services/llm/stream.ts
export async function streamInquiry(
  context: string,
  question: string,
  model: string,
  env: Env,
): Promise<ReadableStream> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'PatraSaar Intelligence',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: PATRASAAR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `[DOCUMENT CONTEXT]\n${context}\n[END CONTEXT]\n\nQuestion: ${question}`,
        },
      ],
    }),
  })

  return response.body!
}
```

---

## 8. Frontend Specification

### Tech Stack

- **Framework:** SvelteKit 2.x
- **Styling:** Tailwind CSS v4 with custom design tokens
- **Component library:** shadcn-svelte (unstyled, composable)
- **Markdown rendering:** `marked` + `highlight.js` for code blocks
- **File upload:** `@uppy/core` + `@uppy/svelte`
- **SSE streaming:** Native `EventSource` / `fetch` with `ReadableStream`
- **State management:** Svelte stores (no external state lib needed)
- **Icons:** Lucide Svelte

### Design System

Based on the provided mockups, PatraSaar uses a dark-first premium legal aesthetic:

```css
/* Design tokens — apps/web/src/app.css */
:root {
  /* Core palette */
  --color-bg-primary: #0a0a0a; /* Near-black background */
  --color-bg-secondary: #111111; /* Card/panel background */
  --color-bg-tertiary: #1a1a1a; /* Input/hover states */
  --color-border: #2a2a2a; /* Subtle borders */

  /* Brand */
  --color-accent: #f97316; /* PatraSaar orange */
  --color-accent-muted: #7c2d12; /* Muted orange for tags/badges */
  --color-accent-glow: rgba(249, 115, 22, 0.15);

  /* Text */
  --color-text-primary: #ffffff;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #525252;

  /* Semantic */
  --color-verified: #22c55e; /* Green for verified citations */
  --color-warning: #eab308; /* Yellow for risk flags */
  --color-danger: #ef4444; /* Red for high-risk clauses */

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-display: 'Playfair Display', serif; /* For hero headings */
}
```

### Route Structure — `apps/web/src/routes/`

```
src/routes/
├── +layout.svelte              # Root layout (fonts, global styles, auth check)
├── +layout.ts                  # Load user session
├── +page.svelte                # Landing page (public)
├── auth/
│   ├── callback/
│   │   └── +page.server.ts     # Generate generic user session (Auth disabled for testing)
│   └── login/
│       └── +server.ts          # Bypass OAuth directly to /dashboard
├── (app)/                      # Protected route group
│   ├── +layout.svelte          # App shell: sidebar + topbar
│   ├── +layout.ts              # Auth guard — redirect if not logged in
│   ├── dashboard/
│   │   └── +page.svelte        # Dashboard with recent activity
│   ├── inquiries/
│   │   ├── +page.svelte        # List of past inquiries
│   │   └── [id]/
│   │       └── +page.svelte    # Single inquiry view (chat + citations panel)
│   ├── cases/
│   │   ├── +page.svelte        # Case folder list
│   │   └── [id]/
│   │       └── +page.svelte    # Case folder view (grouped docs)
│   ├── library/
│   │   └── +page.svelte        # Uploaded documents library
│   └── profile/
│       └── +page.svelte        # User profile + subscription
```

### Key Components — `apps/web/src/lib/components/`

```
components/
├── layout/
│   ├── Sidebar.svelte           # Left nav: logo, nav items, sign out
│   ├── Topbar.svelte            # Top bar: nav links, notifications, avatar
│   └── AppShell.svelte          # Sidebar + content area layout
├── inquiry/
│   ├── InquiryInput.svelte      # Chat input with file upload button
│   ├── InquiryMessage.svelte    # Single message bubble (user or PatraSaar)
│   ├── InquiryStream.svelte     # Handles streaming response display
│   ├── CitationPanel.svelte     # Right panel: Sovereign Citations
│   ├── CitationCard.svelte      # Individual citation (case/statute/HC)
│   ├── ConfidenceBar.svelte     # Context Confidence Score bar
│   ├── KeyDetermination.svelte  # "Key Legal Determination" block
│   └── DocumentTags.svelte      # [Corporate Law] [IPC §406] tags
├── documents/
│   ├── DocumentUpload.svelte    # Drag-and-drop upload with progress
│   ├── DocumentCard.svelte      # Document in library list
│   └── DocumentSummaryCard.svelte # Auto-generated summary on upload
├── cases/
│   ├── CaseCard.svelte          # Case folder card
│   └── CaseTimeline.svelte      # Date extraction → visual timeline
├── ui/
│   ├── Button.svelte
│   ├── Badge.svelte             # CASE LAW / STATUTE / HIGH COURT badges
│   ├── Card.svelte
│   ├── Modal.svelte
│   ├── ProgressBar.svelte
│   └── Spinner.svelte
└── landing/
    ├── Hero.svelte              # "Sovereign Intelligence" hero section
    ├── PipelineSection.svelte   # Neural RAG Pipeline explainer
    ├── BNSSection.svelte        # BNS & IPC Compliance feature section
    ├── AccuracySection.svelte   # 99.9% verification accuracy block
    ├── TestimonialSection.svelte
    └── CTASection.svelte        # Waitlist / Request Access CTA
```

### Landing Page Layout (from mockups)

The landing page follows the design shown in the mockups exactly:

1. **Navbar** — `PatraSaar` logo left, nav links (Case Law, RAG Search, Intelligence, Firm Solutions), `Request Access` CTA button right
2. **Hero** — Full-width dark section, "Real Citations. Real Laws. Zero Hallucinations." label, `Sovereign` (white) + `Intelligence` (orange) heading, subtitle, two CTAs
3. **Scales of Justice** visual — dramatic dark imagery
4. **Trusted by** — Law firm logos (CAM, Trilegal, AZB, Khaitan, SAM)
5. **Neural RAG Pipeline** section — Left: description + two feature bullets. Right: live query demo card
6. **BNS & IPC Compliance** — "COMPLIANCE ALERT" badge, feature description, Procedural Mapping + Dynamic Updates cards
7. **99.9% Accuracy** — Large number display, verification description
8. **Testimonial** — Senior Advocate Rajeev Mehta, Supreme Court of India
9. **Footer CTA** — "The Future of Legal Discovery is Obsidian." with orange CTA

### Chat Interface (from mockups)

The authenticated app interface is a three-panel layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  [Sidebar 220px]  │  [Chat area flex-1]  │  [Citations 320px]  │
│                   │                       │                     │
│  The Sovereign    │  PatraSaar logo +     │  Sovereign          │
│  Intelligence     │  nav in topbar        │  Citations          │
│                   │                       │  VERIFIED SOURCES   │
│  + New Legal      │  [User message]       │                     │
│    Inquiry        │                       │  [CASE LAW badge]   │
│                   │  PATRASAAR            │  Velji Raghavji...  │
│  Dashboard        │  INTELLIGENCE label   │  98% Verified       │
│  Active Chats ←   │                       │                     │
│  Legal Library    │  Italic analytical    │  [STATUTE badge]    │
│  Drafts           │  framing sentence     │  IPC 1860           │
│  Archive          │                       │  100% Core          │
│                   │  Main analysis text   │                     │
│                   │  with [hyperlinked]   │  [HIGH COURT badge] │
│                   │  legal terms          │  Sunil Bharti...    │
│                   │                       │  82% Relevance      │
│  Support          │  ┌─ Key Legal ──────┐ │                     │
│  Sign Out         │  │ Determination    │ │  Context Confidence │
│                   │  │ block            │ │  High (94%) ████░░  │
│                   │  └──────────────────┘ │                     │
│                   │                       │                     │
│                   │  [Tags row]           │                     │
│                   │                       │                     │
│                   │  [Input bar at bottom]│                     │
└─────────────────────────────────────────────────────────────────┘
```

### Streaming Implementation

```typescript
// lib/api/stream.ts
export async function streamInquiry(
  documentIds: string[],
  question: string,
  onChunk: (text: string) => void,
  onCitations: (citations: Citation[]) => void,
  onDone: () => void,
) {
  const response = await fetch(`${API_URL}/inquiries/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ documentIds, question }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      onDone()
      break
    }

    const lines = decoder.decode(value).split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'text') onChunk(data.content)
        if (data.type === 'citations') onCitations(data.citations)
        if (data.type === 'done') onDone()
      }
    }
  }
}
```

### Markdown Rendering in Chat

```svelte
<!-- InquiryMessage.svelte -->
<script lang="ts">
  import { marked } from 'marked'
  import hljs from 'highlight.js'

  export let content: string
  export let isStreaming = false

  marked.setOptions({
    highlight: (code, lang) => hljs.highlightAuto(code, [lang]).value,
    breaks: true,
  })

  $: html = marked.parse(content)
</script>

<div class="prose prose-invert max-w-none">
  {@html html}
  {#if isStreaming}
    <span class="inline-block w-2 h-4 bg-orange-500 animate-pulse ml-0.5" />
  {/if}
</div>
```

---

## 9. Authentication

### Flow: Google OAuth 2.0

```
User clicks "Sign in with Google"
    │
    ▼
SvelteKit redirects to Google OAuth consent screen
    │
    ▼
Google redirects to /auth/callback?code=...
    │
    ▼
[+page.server.ts] Exchange code for tokens via Google API
    │
    ▼
Extract user profile (email, name, picture, googleId)
    │
    ▼
[API: POST /auth/google] Upsert user in D1, return signed JWT
    │
    ▼
Store JWT in httpOnly cookie (SvelteKit)
    │
    ▼
Redirect to /dashboard
```

### JWT Middleware (Hono)

```typescript
// middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const token = getCookie(c, 'patrasaar_token')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verify(token, c.env.JWT_SECRET)
    c.set('userId', payload.sub as string)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
```

---

## 10. Database Schema

### D1 (Cloudflare SQLite)

```sql
-- Users
CREATE TABLE users (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  google_id    TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  picture_url  TEXT,
  plan         TEXT NOT NULL DEFAULT 'free', -- 'free' | 'professional' | 'enterprise'
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Documents
CREATE TABLE documents (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id      TEXT REFERENCES cases(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  doc_type     TEXT NOT NULL, -- 'contract' | 'fir' | 'court_order' | 'legal_notice' | 'statute'
  kv_key       TEXT NOT NULL UNIQUE,     -- KV storage key
  page_count   INTEGER,
  language     TEXT DEFAULT 'en',        -- 'en' | 'hi' | 'mixed'
  status       TEXT DEFAULT 'processing',-- 'processing' | 'ready' | 'failed'
  summary      TEXT,                     -- Auto-generated plain-language summary
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Chunks (stores text for both user docs and legal corpus)
CREATE TABLE chunks (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  document_id  TEXT NOT NULL,            -- References documents.id OR legal corpus identifier
  chunk_index  INTEGER NOT NULL,
  page_number  INTEGER NOT NULL,
  text         TEXT NOT NULL,
  token_count  INTEGER,
  vector_id    TEXT UNIQUE,              -- ID in Cloudflare Vectorize
  source       TEXT NOT NULL DEFAULT 'user-doc' -- 'user-doc' | 'legal-corpus'
);

-- Cases (folders grouping related documents)
CREATE TABLE cases (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Inquiries (individual Q&A sessions)
CREATE TABLE inquiries (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_ids TEXT NOT NULL,  -- JSON array of document IDs
  question     TEXT NOT NULL,
  answer       TEXT,
  citations    TEXT,           -- JSON array of Citation objects
  model_used   TEXT,
  confidence   REAL,           -- 0.0 to 1.0
  tags         TEXT,           -- JSON array of tag strings
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_source ON chunks(source);
CREATE INDEX idx_inquiries_user_id ON inquiries(user_id);
```

---

## 11. API Reference

All endpoints are prefixed with `/api/v1`. Protected endpoints require `patrasaar_token` cookie.

### Auth

```
POST   /auth/google              Exchange Google code for session JWT
POST   /auth/signout             Clear session cookie
GET    /auth/me                  Get current user profile
```

### Documents

```
POST   /documents                Upload document (multipart/form-data)
GET    /documents                List user's documents
GET    /documents/:id            Get document metadata + summary
DELETE /documents/:id            Delete document (KV + D1 + Vectorize)
GET    /documents/:id/status     Get processing status (SSE)
```

### Inquiries

```
POST   /inquiries/stream         Submit question, stream SSE response
GET    /inquiries                List past inquiries
GET    /inquiries/:id            Get single inquiry with citations
```

### Cases

```
POST   /cases                    Create case folder
GET    /cases                    List case folders
GET    /cases/:id                Get case with documents
PUT    /cases/:id                Update case name/description
DELETE /cases/:id                Delete case folder
POST   /cases/:id/documents      Add document to case
```

### Health

```
GET    /health                   { status: 'ok', version: '1.0.0' }
```

---

## 12. Streaming Architecture

PatraSaar uses **Server-Sent Events (SSE)** for streaming LLM responses. The stream emits typed events:

```
event: text
data: {"type":"text","content":"Section 406 of the Indian Penal Code"}

event: text
data: {"type":"text","content":" prescribes the punishment for..."}

event: citations
data: {"type":"citations","citations":[{"id":"1","type":"CASE_LAW","title":"Velji Raghavji Patel vs State","court":"Supreme Court of India","year":1965,"relevance":0.98,"verified":true}]}

event: metadata
data: {"type":"metadata","confidence":0.94,"model":"qwen/qwen3-next-80b-a3b-instruct:free","tags":["Corporate Law","SC Precedents","IPC Section 406"]}

event: done
data: {"type":"done"}
```

The Hono route pipes the OpenRouter stream directly to the client with injected citation events:

```typescript
// routes/inquiries.ts
inquiryRoutes.post('/stream', authMiddleware, async (c) => {
  const { documentIds, question } = await c.req.json()
  const userId = c.get('userId')

  // RAG retrieval — queries both user-docs and legal-corpus namespaces
  const chunks = await retrieveChunks(documentIds, question, userId, c.env)
  const context = chunks.map((ch) => `[Page ${ch.pageNumber}]: ${ch.text}`).join('\n\n')

  const model = selectModel('standard_qa')

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  streamInquiry(context, question, model, c.env).then(async (llmStream) => {
    const reader = llmStream.getReader()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = new TextDecoder().decode(value)
      fullText += chunk
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`),
      )
    }

    const citations = await extractCitations(fullText, chunks)
    await writer.write(
      encoder.encode(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`),
    )
    await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
    await writer.close()

    await saveInquiry({ userId, documentIds, question, answer: fullText, citations }, c.env)
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
```

---

## 13. CI/CD & GitHub Configuration

### Branch Strategy

```
master  → staging environment (auto-deploy on push)
prod    → production environment (auto-deploy on push to prod)
```

Feature branches → PR to `master` → CI passes → merge → staging deploy  
Staging verified → PR `master` → `prod` → CI passes → merge → production deploy

See [deploy.md §6](./deploy.md) for the complete master → prod promotion workflow.

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [master, prod]
  push:
    branches: [master]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm turbo typecheck

      - name: Lint
        run: pnpm turbo lint

      - name: Test
        run: pnpm turbo test
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY_TEST }}

      - name: Upload coverage
        uses: codecov/codecov-action@v5
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

### `.github/workflows/deploy-prod.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [prod]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Deploy API to Cloudflare Workers (production)
        working-directory: apps/api
        run: pnpm wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-web:
    runs-on: ubuntu-latest
    needs: deploy-api
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
```

### `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      production-deps:
        dependency-type: production
      dev-deps:
        dependency-type: development

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
```

### CodeRabbit — AI PR Reviews

CodeRabbit is configured via the [CodeRabbit GitHub App](https://github.com/apps/coderabbitai), which is free for public repositories. Install the app on your repo and it automatically reviews every PR with inline comments.

Configuration lives in `.coderabbit.yaml` at the repo root:

```yaml
# .coderabbit.yaml
language: en
reviews:
  profile: chill
  request_changes_workflow: false
  high_level_summary: true
  poem: false
  review_status: true
  path_instructions:
    - path: 'apps/api/**'
      instructions: 'Focus on security, input validation, and Cloudflare Workers compatibility'
    - path: 'apps/web/**'
      instructions: 'Focus on accessibility, performance, and SvelteKit best practices'
chat:
  auto_reply: true
```

No GitHub Action workflow needed — the app handles everything.

### Husky + lint-staged + commitlint

```json
// package.json (root)
{
  "lint-staged": {
    "**/*.{ts,svelte}": ["eslint --fix", "prettier --write"],
    "**/*.{json,md,yaml}": ["prettier --write"]
  },
  "commitlint": {
    "extends": ["@commitlint/config-conventional"]
  }
}
```

---

## 14. Testing Strategy

### Philosophy: Test-First for Backend

All new backend features follow this order:

1. Write failing tests (unit + integration)
2. Write implementation to make tests pass
3. Write e2e test for the full flow
4. Open PR — CI must pass before merge

### Backend Tests — `apps/api/test/`

**Framework:** Vitest + `@cloudflare/vitest-pool-workers`

```typescript
// test/services/rag/chunker.test.ts
import { describe, it, expect } from 'vitest'
import { chunkDocument } from '../../../src/services/rag/chunker'

describe('chunkDocument', () => {
  it('splits long text into overlapping chunks under 512 tokens', () => {
    const text = 'Para 1.\n\nPara 2.\n\n'.repeat(100)
    const chunks = chunkDocument(text, 'doc-1')
    expect(chunks.every((c) => c.tokenCount <= 512)).toBe(true)
    expect(chunks.length).toBeGreaterThan(1)
  })

  it('preserves documentId and increments chunkIndex', () => {
    const chunks = chunkDocument('Word '.repeat(1000), 'doc-abc')
    chunks.forEach((c, i) => {
      expect(c.documentId).toBe('doc-abc')
      expect(c.chunkIndex).toBe(i)
    })
  })
})
```

```typescript
// test/routes/documents.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createTestApp } from '../setup'

describe('POST /documents', () => {
  it('returns 401 without auth token', async () => {
    const app = createTestApp()
    const res = await app.request('/documents', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('returns 400 with invalid file type', async () => {
    const app = createTestApp()
    const formData = new FormData()
    formData.append('file', new Blob(['hello'], { type: 'text/plain' }), 'test.txt')
    const res = await app.request('/documents', {
      method: 'POST',
      body: formData,
      headers: { Cookie: 'patrasaar_token=VALID_TEST_TOKEN' },
    })
    expect(res.status).toBe(400)
  })
})
```

### Frontend Tests — `apps/web/`

**Framework:** Playwright (e2e) + Vitest (unit)

```typescript
// e2e/inquiry.spec.ts
import { test, expect } from '@playwright/test'

test('authenticated user can submit a legal inquiry and see streamed response', async ({
  page,
}) => {
  await page.goto('/dashboard')
  await page.click('text=New Legal Inquiry')
  await page.setInputFiles('[data-testid=file-upload]', 'test/fixtures/sample-contract.pdf')
  await page.waitForSelector('[data-testid=document-ready]')
  await page.fill('[data-testid=inquiry-input]', 'What are the termination clauses?')
  await page.click('[data-testid=submit-inquiry]')
  await expect(page.locator('[data-testid=patrasaar-response]')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('[data-testid=citation-panel]')).toBeVisible()
})
```

### Coverage Requirements

- Backend unit tests: **≥ 80% line coverage**
- Backend integration tests: all public routes covered
- Frontend e2e: all critical user flows covered (auth, upload, inquiry, case folders)

---

## 15. Environment Variables

### `apps/api/.dev.vars` (local) / Cloudflare Secrets (production)

```env
JWT_SECRET=your_jwt_secret_min_32_chars
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENROUTER_API_KEY=your_openrouter_api_key
FRONTEND_URL=http://localhost:5173
```

### `apps/web/.env` (local) / Vercel Environment Variables (production)

```env
PUBLIC_API_URL=http://localhost:8787
PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret_min_32_chars
```

---

## 16. Makefile Commands

```makefile
# Makefile (root)

.PHONY: dev test lint typecheck build clean install

## Install all dependencies
install:
	pnpm install

## Start all services in dev mode with live reload
dev:
	pnpm turbo dev

## Start only the API (Cloudflare Workers local dev)
dev-api:
	cd apps/api && pnpm wrangler dev --local

## Start only the frontend
dev-web:
	cd apps/web && pnpm dev

## Run all tests
test:
	pnpm turbo test

## Run backend tests only
test-api:
	cd apps/api && pnpm vitest run

## Run frontend e2e tests
test-e2e:
	cd apps/web && pnpm playwright test

## Run tests in watch mode
test-watch:
	cd apps/api && pnpm vitest

## Lint all packages
lint:
	pnpm turbo lint

## Fix lint issues automatically
lint-fix:
	pnpm turbo lint -- --fix

## Typecheck all packages
typecheck:
	pnpm turbo typecheck

## Build all packages
build:
	pnpm turbo build

## Deploy API to Cloudflare staging
deploy-api-staging:
	cd apps/api && pnpm wrangler deploy

## Deploy API to Cloudflare production
deploy-api-prod:
	cd apps/api && pnpm wrangler deploy --env production

## Deploy frontend to Vercel production
deploy-web-prod:
	cd apps/web && pnpm vercel --prod

## Run D1 migrations locally
db-migrate:
	cd apps/api && pnpm wrangler d1 migrations apply patrasaar-db --local

## Run D1 migrations on production
db-migrate-prod:
	cd apps/api && pnpm wrangler d1 migrations apply patrasaar-db --remote

## Create a new D1 migration file
db-new-migration:
	cd apps/api && pnpm wrangler d1 migrations create patrasaar-db $(name)

## Clean all build artifacts
clean:
	pnpm turbo clean && find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +
```

---

## Appendix: Shared Types

```typescript
// packages/shared/src/types/document.ts
export interface Document {
  id: string
  userId: string
  caseId?: string
  name: string
  docType: 'contract' | 'fir' | 'court_order' | 'legal_notice' | 'statute'
  status: 'processing' | 'ready' | 'failed'
  summary?: string
  pageCount?: number
  language: 'en' | 'hi' | 'mixed'
  createdAt: number
}

export interface Chunk {
  id: string
  documentId: string
  chunkIndex: number
  pageNumber: number
  text: string
  tokenCount: number
  vectorId?: string
  source: 'user-doc' | 'legal-corpus'
}

// packages/shared/src/types/inquiry.ts
export interface Citation {
  id: string
  type: 'CASE_LAW' | 'STATUTE' | 'HIGH_COURT'
  title: string
  court?: string
  year?: number
  relevance: number // 0.0 to 1.0
  verified: boolean
  url?: string // India Kanoon deep link
  excerpt?: string // Relevant excerpt from the source
}

export interface InquiryStreamEvent {
  type: 'text' | 'citations' | 'metadata' | 'done' | 'error'
  content?: string
  citations?: Citation[]
  confidence?: number
  model?: string
  tags?: string[]
  error?: string
}
```
