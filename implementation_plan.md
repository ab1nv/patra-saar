# PatraSaar — System Design & Implementation Plan

> **Legal clarity, distilled.**

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [Problem Statement](#2-problem-statement)
3. [Product Strategy](#3-product-strategy)
4. [System Architecture](#4-system-architecture)
5. [Knowledge Base Strategy](#5-knowledge-base-strategy)
6. [Dual-RAG Pipeline Deep Dive](#6-dual-rag-pipeline-deep-dive)
7. [Data Model & Schema Design](#7-data-model--schema-design)
8. [API Design](#8-api-design)
9. [Frontend & UX Strategy](#9-frontend--ux-strategy)
10. [Prompt Engineering & Citation System](#10-prompt-engineering--citation-system)
11. [Security & Compliance](#11-security--compliance)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Phased Roadmap](#13-phased-roadmap)
14. [Risk Analysis & Mitigations](#14-risk-analysis--mitigations)
15. [Future Vision & Expansion](#15-future-vision--expansion)

---

## 1. Vision & Philosophy

### 1.1 The Core Insight

Most AI legal tools today fall into one of two camps:

**Camp A — Generic chatbots:** ChatGPT wrappers that answer legal questions from general training data. They can hallucinate, cite non-existent sections, and have no grounding in the actual source text of Indian law.

**Camp B — Document summarizers:** Upload your PDF, get a summary. Useful, but shallow. They tell you what your document says, but not whether it's *legal*, *fair*, or *enforceable*.

**PatraSaar occupies a third position:** It analyzes your document *against the actual law*. It doesn't just summarize — it cross-references, compares, and flags. Every statement is grounded in either a real statute or your actual document. Nothing is made up.

### 1.2 The Metaphor

Think of PatraSaar as a legal analyst who:
- Has memorized every relevant Act, section, and sub-section for a given domain
- Reads your specific document carefully
- Tells you, clause by clause, where your document aligns with the law and where it deviates
- Cites the exact legal provision every time

This is what the Dual-RAG architecture enables.

### 1.3 Design Principles

| Principle | What It Means |
|-----------|---------------|
| **Grounded, not generative** | Every claim must trace back to a source — either the Knowledge Base or the user's document. If there is no source, say "I don't know." |
| **Start narrow, go deep** | One legal category done excellently is better than ten done poorly. We start with Rental/Tenancy and make it bulletproof before expanding. |
| **Cite everything** | Two citation types: `[Act Name, §Section]` for the law, `[Your Document, Clause X]` for the user's text. Users must be able to verify. |
| **Accessible language** | Legal jargon is the problem. PatraSaar speaks in plain language, defining terms where necessary. Hindi/Hinglish support is a future goal. |
| **Free and open** | Runs entirely on free-tier infrastructure. No paywalls. Legal comprehension is a public good. |
| **Not legal advice** | PatraSaar is an information tool. Every interaction carries a clear disclaimer. |

---

## 2. Problem Statement

### 2.1 Who Is This For?

**Primary users:**
- **Tenants** signing rental agreements who want to know if the terms are fair
- **Landlords** drafting agreements who want to ensure legal compliance
- **First-generation professionals** navigating legal documents without family lawyers
- **Students and researchers** studying tenancy law across Indian states

**Secondary users (future):**
- Consumers dealing with product warranties and refund disputes
- Employees reviewing employment contracts
- Small business owners dealing with commercial leases

### 2.2 The Pain Points

1. **Legal documents are written to be unreadable.** Dense jargon, archaic phrasing, cross-references to Acts most people have never heard of.

2. **Most Indians don't have easy access to a lawyer.** Consulting one for a rental agreement review costs ₹2,000–₹10,000. Many tenants just sign whatever the landlord gives them.

3. **Existing AI tools don't ground in Indian law.** ChatGPT might give generic advice, but it won't tell you that your landlord's "eviction with 15 days notice" clause violates Section 14 of the Delhi Rent Control Act.

4. **The law varies by state.** Rent control is a state subject. What's legal in Delhi may not be legal in Maharashtra or Karnataka. Users need answers specific to their jurisdiction.

### 2.3 The Value Proposition

> "Upload your rental agreement. PatraSaar will tell you which clauses protect you, which ones may be illegal under your state's law, and what rights you have that aren't even mentioned in your contract."

---

## 3. Product Strategy

### 3.1 Product Model

PatraSaar is a **focused legal analysis tool**, not a general-purpose chatbot. The user journey is:

```
1. Choose a legal category (e.g., "Rental & Tenancy Law")
2. (Optionally) Choose a jurisdiction (e.g., "Delhi", "Maharashtra")
3. Upload a document (e.g., a rental agreement PDF)
4. The system processes the document (parse → chunk → embed → index)
5. User asks questions in natural language
6. PatraSaar responds with analysis grounded in:
   - The actual statutes from the Knowledge Base
   - The specific clauses from the user's uploaded document
7. Every claim is cited to its source
```

### 3.2 What PatraSaar Is NOT

- **Not a legal advisor.** It does not recommend actions. It explains laws and compares documents against them.
- **Not a document generator.** It does not draft new agreements. It analyzes existing ones.
- **Not a case law search engine.** We may index landmark judgments later, but the MVP focuses on statutes and acts.
- **Not a general chatbot.** Every chat must be in the context of a legal category. There is no "ask me anything" mode.

### 3.3 The Category Model

PatraSaar is organized around **Legal Categories** — each is a focused domain with its own curated Knowledge Base.

```
┌──────────────────────────────────────────────────────────┐
│                    PatraSaar Platform                      │
├──────────────┬──────────────────┬─────────────────────────┤
│  Category 1  │   Category 2     │   Category 3 ...        │
│  Rental &    │   Consumer       │   Employment            │
│  Tenancy Law │   Protection     │   Law                   │
├──────────────┼──────────────────┼─────────────────────────┤
│  - TPA 1882  │  - CPA 2019      │  - ID Act 1947          │
│  - MTA 2021  │  - E-Commerce    │  - PF Act               │
│  - Delhi RCA │    Rules 2020    │  - Gratuity Act          │
│  - MH RCA    │  - FSSAI Rules   │  - Shops & Est. Acts    │
│  - KA Rent   │                  │                         │
└──────────────┴──────────────────┴─────────────────────────┘
```

**For MVP (V1), only "Rental & Tenancy Law" is active.** Others are planned but not yet curated.

### 3.4 Jurisdiction Awareness

Indian rental law is a **state subject**. Tenancy rules differ significantly:

| Aspect | Delhi | Maharashtra | Karnataka |
|--------|-------|-------------|-----------|
| Governing Act | Delhi Rent Control Act, 1958 | Maharashtra Rent Control Act, 1999 | Karnataka Rent Act, 1999 |
| Eviction grounds | §14 — limited grounds | §16 — similar but different | §21 — distinct provisions |
| Rent increase | Controlled | Fair rent mechanism | Standard rent concept |
| Registration required? | Yes, above certain rent | Yes | Yes |

**For MVP:** We include the central acts (Transfer of Property Act, Model Tenancy Act) plus 2-3 major state acts (Delhi, Maharashtra, Karnataka). The system prompt instructs the LLM to note jurisdictional differences when relevant.

**Future:** User selects their state at the start, and retrieval is filtered by jurisdiction.

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PatraSaar Platform                            │
│                                                                        │
│  ┌─────────────────┐     ┌──────────────────────────────────┐          │
│  │   Next.js App    │────▶│        Hono API (CF Workers)     │          │
│  │   (Frontend)     │◀────│                                  │          │
│  └─────────────────┘     │  ┌────────────────────────────┐  │          │
│                          │  │    BetterAuth Middleware    │  │          │
│                          │  └────────────────────────────┘  │          │
│                          │  ┌────────────────────────────┐  │          │
│                          │  │    Route Handlers           │  │          │
│                          │  │    /categories              │  │          │
│                          │  │    /chats (CRUD)            │  │          │
│                          │  │    /chats/:id/messages      │  │          │
│                          │  └────────────────────────────┘  │          │
│                          │  ┌────────────────────────────┐  │          │
│                          │  │    Dual-RAG Engine          │  │          │
│                          │  │    KB Search + User Search  │  │          │
│                          │  │    Context Assembly         │  │          │
│                          │  │    LLM Streaming            │  │          │
│                          │  └────────────────────────────┘  │          │
│                          └──────────────────────────────────┘          │
│                                       │                                │
│              ┌────────────────────────┼────────────────────┐           │
│              ▼                        ▼                    ▼           │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │   Cloudflare D1   │   │  Cloudflare R2    │   │ CF Vectorize     │   │
│  │   (Metadata DB)   │   │  (File Storage)   │   │ (Vector Search)  │   │
│  │                    │   │                    │   │                  │   │
│  │  - Users/Sessions  │   │  - User uploaded   │   │  - KB vectors    │   │
│  │  - Chats/Messages  │   │    documents       │   │    (type: kb)    │   │
│  │  - KB metadata     │   │                    │   │  - User vectors  │   │
│  │  - User doc chunks │   │                    │   │    (type: user)  │   │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    External Services                              │  │
│  │   Groq API (LLM)  •  Google OAuth  •  CF Workers AI (Embedding) │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Offline: Knowledge Base Pipeline                     │  │
│  │   packages/ingest CLI  →  parse  →  chunk  →  embed  →  upload  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Design Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| **Separate KB ingestion from runtime** | Offline CLI tool | KB is curated by developers, not users. Decouples curation from the live system. Allows careful quality control. |
| **Single Vectorize index** | Metadata filtering (`type: kb` vs `type: user`) | Simpler than managing two indexes. Vectorize supports metadata filtering natively. One index = one configuration. |
| **Inline document processing** | No Cloudflare Queues for MVP | User documents are small (≤10MB, ≤100 pages). Processing takes 5-15 seconds inline. Queues add complexity without proportional benefit at this scale. |
| **Category-scoped chats** | Each chat has a `category_id` | Ensures the right KB segment is searched. Prevents irrelevant legal context from polluting answers. |
| **SSE streaming** | Server-Sent Events from Hono | Simpler than WebSockets. Native support on CF Workers. Users see tokens as they arrive. |
| **No fine-tuning** | Use Groq's Llama 3.3 70B as-is | Fine-tuning is expensive and unnecessary. The RAG context + carefully crafted system prompt gives us the control we need. The model is a reasoning engine, not a knowledge store. |

### 4.3 Data Flow: Complete Lifecycle

**A. Knowledge Base Ingestion (Offline, by developers)**

```
1. Developer acquires a legal text (e.g., Transfer of Property Act)
   Source: indiacode.nic.in → download as text/PDF → clean manually

2. Text is placed in packages/ingest/sources/rental-tenancy/tpa-1882.txt

3. Developer runs the ingest CLI:
   $ npm run ingest -- --category rental-tenancy --source tpa-1882.txt

4. The CLI:
   a. Reads the raw text
   b. Cleans it (normalize whitespace, fix encoding, remove headers/footers)
   c. Creates a kb_sources row in D1 (title, type, year, etc.)
   d. Chunks the text using legal-aware chunking:
      - Detects Section/Article/Clause boundaries
      - Respects sentence boundaries within sections
      - 512 tokens per chunk, 50-token overlap for cross-boundary recall
      - Extracts section_ref metadata (e.g., "Section 105")
   e. Creates kb_chunks rows in D1 (one per chunk, with metadata)
   f. Generates embeddings via Workers AI (bge-base-en-v1.5, 768-dim)
   g. Upserts vectors to Vectorize with metadata:
      { type: "kb", category_id, source_id, section_ref }

5. The knowledge base is now searchable.
```

**B. User Document Upload (Runtime)**

```
1. User signs in → selects "Rental & Tenancy Law" → creates a chat
2. User uploads their rental agreement (PDF, ≤10MB)

3. The API:
   a. Validates the file (extension, size, MIME type)
   b. Uploads to R2 (key: user_id/chat_id/doc_id/filename)
   c. Creates a documents row in D1 (status: 'processing')
   d. Extracts text:
      - PDF with text → pdf-parse / Workers AI
      - Scanned PDF → Workers AI vision model (OCR)
      - DOCX → mammoth.js or Workers AI
      - TXT → direct read
   e. Chunks the extracted text (same legal-aware chunker)
   f. Creates document_chunks rows in D1
   g. Generates embeddings (Workers AI bge-base-en-v1.5)
   h. Upserts vectors to Vectorize with metadata:
      { type: "user", chat_id, user_id }
   i. Updates document status to 'ready'

4. Frontend is notified (polling or direct response) → user can now ask questions.
```

**C. Question & Answer (Runtime)**

```
1. User types: "Can my landlord increase rent mid-lease?"

2. The API:
   a. Embeds the query (Workers AI bge-base-en-v1.5)
   
   b. Performs TWO parallel Vectorize searches:
      
      Search 1 — Knowledge Base:
        topK: 8
        filter: { type: "kb", category_id: "rental-tenancy" }
        → Returns: relevant sections from TPA, MTA, state RCAs
      
      Search 2 — User's Document:
        topK: 5
        filter: { type: "user", chat_id: current_chat_id }
        → Returns: relevant clauses from the user's lease
   
   c. Fetches chunk text from D1 for both result sets
   
   d. Assembles the LLM prompt:
      - System prompt (role, rules, citation format)
      - Knowledge Base context (labeled as "LEGAL KNOWLEDGE BASE")
      - User Document context (labeled as "USER'S DOCUMENT")
      - Chat history (last 8 messages for conversational continuity)
      - Current question
   
   e. Calls Groq API (stream: true, temperature: 0.3)
   
   f. Streams tokens back to the frontend via SSE
   
   g. On stream completion:
      - Saves the full response as an assistant message in D1
      - Attaches extracted citations

3. User sees the answer with distinct citations:
   "Under Section 105 of the Transfer of Property Act, 1882, the rent
   agreed upon at the start of the lease cannot be unilaterally increased
   by the landlord during the lease period [TPA 1882, §105]. Your
   agreement states in Clause 7 that 'Rent may be revised annually at
   the landlord's discretion' [Your Document, Clause 7]. This clause may
   be overridden by the statutory protection, meaning the landlord would
   need your consent for any increase during the lease term."
```

---

## 5. Knowledge Base Strategy

### 5.1 Sourcing Legal Texts

**Primary sources (all public domain):**

| Source | URL | Content |
|--------|-----|---------|
| India Code | indiacode.nic.in | Official repository of all central and state Acts |
| Indian Kanoon | indiankanoon.org | Free access to Acts, Amendments, and Judgments |
| Legislative Department | legislative.gov.in | Central legislation, ordinances |
| State Government Gazette sites | Varies by state | State-specific acts and rules |

**For MVP — specific documents to curate:**

| # | Document | Source | Relevance | Est. Pages |
|---|----------|--------|-----------|------------|
| 1 | Transfer of Property Act, 1882 (Sections 105-117: Leases) | India Code | Foundation of all lease law in India | ~15 |
| 2 | Model Tenancy Act, 2021 | India Code | Modern central template for state adoption | ~40 |
| 3 | Delhi Rent Control Act, 1958 | India Code | Governs tenancy in NCT of Delhi | ~30 |
| 4 | Maharashtra Rent Control Act, 1999 | India Code | Governs tenancy in Maharashtra | ~35 |
| 5 | Karnataka Rent Act, 1999 | India Code | Governs tenancy in Karnataka | ~25 |
| 6 | Registration Act, 1908 (relevant sections) | India Code | When registrations becomes mandatory | ~10 |
| 7 | Indian Stamp Act, 1899 (relevant sections) | India Code | Stamp duty on lease agreements | ~10 |

**Total: ~165 pages → ~450-700 chunks → comfortably within Vectorize free tier (5,000 vectors)**

### 5.2 Curation Quality Requirements

Each legal text must be:

1. **Verified** — sourced from India Code (official) or cross-referenced against it
2. **Complete** — the full text of relevant sections, not summaries
3. **Clean** — formatting artifacts, page numbers, and headers removed
4. **Structured** — section numbers preserved and extractable by the chunker
5. **Metadata-tagged** — year of enactment, amendments noted, jurisdiction tagged

### 5.3 Chunking Strategy for Legal Texts

Legal texts have unique structure that demands specialized chunking:

```
TYPICAL LEGAL STRUCTURE:
Act → Part/Chapter → Section → Sub-section → Clause → Proviso → Explanation

Example:
  Section 105. Lease defined.—
    A lease of immoveable property is a transfer of a right to enjoy
    such property, made for a certain time, express or implied, or
    in perpetuity, in consideration of a price paid or promised...

    Explanation.— A price paid or promised may be in money, a share
    of crops, service, or any other thing of value...
```

**Chunking rules:**
- **Never split inside a section if it fits within 512 tokens.** A complete section is the ideal unit.
- **For long sections:** Split at sub-section or proviso boundaries, with 50-token overlap.
- **Preserve section references:** Each chunk must carry metadata: `section_ref: "Section 105"`, `source: "TPA 1882"`.
- **Keep explanations with their parent section** when possible (they are interpretive context).
- **Never chunk below sentence level.** A sentence is the atomic unit.

### 5.4 Knowledge Base Versioning & Updates

Legal texts are amended periodically. We need a simple strategy:

- **Version 1:** Manual curation. Developer sources, cleans, and ingests texts.
- **When an amendment happens:** Developer updates the source text, re-runs ingestion for that source only. Old vectors are deleted, new ones upserted.
- **Each `kb_sources` row tracks `ingested_at`** so we know when the KB was last refreshed.
- **Future:** Periodic automated checks against India Code for amendments.

### 5.5 The Ingestion Pipeline (`packages/ingest`)

```
packages/ingest/
├── package.json                    # CLI dependencies (wrangler, nanoid, etc.)
├── tsconfig.json
├── README.md                       # How to use the ingest CLI
│
├── sources/                        # Raw legal texts (plain text, UTF-8)
│   └── rental-tenancy/
│       ├── transfer-of-property-act-1882.txt
│       ├── model-tenancy-act-2021.txt
│       ├── delhi-rent-control-act-1958.txt
│       ├── maharashtra-rent-control-act-1999.txt
│       ├── karnataka-rent-act-1999.txt
│       ├── registration-act-1908-relevant.txt
│       └── indian-stamp-act-1899-relevant.txt
│
└── src/
    ├── cli.ts                      # Entry point: parse CLI args, run pipeline
    ├── reader.ts                   # Read and clean source text files
    ├── chunker.ts                  # Re-use legal-aware chunking from apps/api/src/lib/
    ├── embedder.ts                 # Call Workers AI for batch embeddings
    ├── uploader.ts                 # Write to D1 (kb_sources, kb_chunks) + Vectorize
    └── config.ts                   # Category definitions, source metadata
```

**CLI usage:**

```bash
# Ingest a single source
npm run ingest -- --file sources/rental-tenancy/tpa-1882.txt \
                  --category rental-tenancy \
                  --title "Transfer of Property Act, 1882" \
                  --type central_act \
                  --year 1882

# Ingest all sources in a category
npm run ingest -- --category rental-tenancy --all

# Re-ingest a source (delete old chunks + vectors, insert new)
npm run ingest -- --file sources/rental-tenancy/tpa-1882.txt --replace

# Dry run (show what would be ingested, don't write)
npm run ingest -- --category rental-tenancy --all --dry-run
```

---

## 6. Dual-RAG Pipeline Deep Dive

### 6.1 Why Dual-RAG?

Standard RAG: `query → search one index → context → LLM → answer`

PatraSaar's Dual-RAG: `query → search KB index + search user index → merge context → LLM → comparative analysis`

The key insight: **the LLM's job is not retrieval or summarization — it is *comparison and analysis*.** It receives two sets of context (the law + the user's document) and reasons about how they relate.

### 6.2 Retrieval Configuration

```
Knowledge Base Search:
  - Index: patrasaar-docs
  - Filter: { type: "kb", category_id: "<chat's category>" }
  - topK: 8 (more context from the law is better)
  - Similarity threshold: 0.3 (discard irrelevant chunks)

User Document Search:
  - Index: patrasaar-docs (same index)
  - Filter: { type: "user", chat_id: "<current chat>", user_id: "<current user>" }
  - topK: 5 (user docs are typically shorter)
  - Similarity threshold: 0.25 (slightly lower — user docs may use different terminology)
```

### 6.3 Context Assembly

The retrieved chunks are formatted into two labeled sections:

```
═══ KNOWLEDGE BASE (Indian Legal Statutes) ═══

[KB-1] Transfer of Property Act, 1882 — Section 105:
"A lease of immoveable property is a transfer of a right to enjoy
such property, made for a certain time..."

[KB-2] Delhi Rent Control Act, 1958 — Section 14:
"Notwithstanding anything to the contrary contained in any other
law, no order or decree for the recovery of possession..."

[KB-3] Model Tenancy Act, 2021 — Section 4(2):
"Every agreement of tenancy shall be in writing..."

═══ USER'S DOCUMENT ═══

[DOC-1] Clause 4 — Duration:
"This agreement is valid for 11 months from the date of signing..."

[DOC-2] Clause 7 — Rent Revision:
"The landlord reserves the right to revise rent annually at a rate
not exceeding 10% of the current rent..."

[DOC-3] Clause 12 — Termination:
"Either party may terminate this agreement by giving 30 days'
written notice..."
```

### 6.4 Edge Cases

| Scenario | How to Handle |
|----------|---------------|
| **No user document uploaded yet** | Only search KB. System prompt adjusts: "Answer based on the law. The user has not uploaded a document yet." |
| **KB has no relevant chunks** | Only search user doc. System prompt: "I could not find relevant legal provisions in my knowledge base for this specific question." |
| **Neither has relevant chunks** | Honest response: "I don't have enough information in my knowledge base or your document to answer this confidently." |
| **User asks about a different category** | "This chat is focused on Rental & Tenancy Law. For questions about consumer rights, please start a new chat and select that category." |
| **User's document is in a non-English language** | Current limitation. Note it and flag for future multilingual support. |

---

## 7. Data Model & Schema Design

### 7.1 Entity Relationship Diagram

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│    user      │───1:N──│   session    │        │  account     │
│  (BetterAuth)│        │ (BetterAuth) │        │ (BetterAuth) │
└──────┬───────┘        └──────────────┘        └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐        ┌───────────────┐
│    chats      │───N:1──│ kb_categories  │
│               │        │                │
│  category_id──┼────────│  id            │
│  user_id      │        │  slug          │
│  title        │        │  name          │
│  jurisdiction │        │  description   │
└──────┬───────┘        └──────┬────────┘
       │                       │
       │ 1:N                   │ 1:N
       ▼                       ▼
┌──────────────┐        ┌───────────────┐
│   messages    │        │  kb_sources    │
│               │        │                │
│  chat_id      │        │  category_id   │
│  role         │        │  title         │
│  content      │        │  source_type   │
│  citations    │        │  jurisdiction  │
└──────────────┘        └──────┬────────┘
       │                       │
       │                       │ 1:N
       │                       ▼
       │                ┌───────────────┐
       │ 1:N            │  kb_chunks     │
       ▼                │                │
┌──────────────┐        │  source_id     │
│  documents    │        │  category_id   │
│               │        │  content       │
│  chat_id      │        │  section_ref   │
│  user_id      │        └───────────────┘
│  status       │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│ document_chunks   │
│                   │
│  document_id      │
│  content          │
│  section_ref      │
└──────────────────┘
```

### 7.2 Schema: New & Modified Tables

**New — `kb_categories`**: Defines legal domains.

**New — `kb_sources`**: Individual acts/guidelines within a category.

**New — `kb_chunks`**: Pre-indexed chunks from legal sources.

**Modified — `chats`**: Adds `category_id` (required) and optional `jurisdiction` to scope the chat.

**Simplified — `documents`**: Remove `source_url` field and URL-related logic. Focus purely on file uploads.

**Simplified — `processing_jobs`**: May become unnecessary if we process inline. Keep for now but make optional.

### 7.3 Vectorize Index Design

**Single index: `patrasaar-docs`**
- Dimensions: 768 (bge-base-en-v1.5)
- Metric: cosine

**Metadata schema for KB vectors:**
```json
{
  "type": "kb",
  "category_id": "rental-tenancy",
  "source_id": "src_tpa1882",
  "section_ref": "Section 105",
  "jurisdiction": "central"
}
```

**Metadata schema for User vectors:**
```json
{
  "type": "user",
  "chat_id": "chat_abc123",
  "user_id": "user_xyz789",
  "document_id": "doc_def456"
}
```

---

## 8. API Design

### 8.1 Route Map

```
Public:
  GET  /api/health                      → Health check
  GET  /api/categories                  → List active legal categories

Auth (BetterAuth — auto-mounted):
  ALL  /api/auth/*                      → Session mgmt, Google OAuth

Protected (require auth):
  GET  /api/chats                       → List user's chats
  POST /api/chats                       → Create new chat (with category_id)
  GET  /api/chats/:id                   → Get chat with messages
  PATCH /api/chats/:id                  → Rename chat
  DELETE /api/chats/:id                 → Delete chat + cleanup R2 + Vectorize

  POST /api/chats/:id/messages          → Send message (text + optional file)
                                          Returns SSE stream for AI response

  GET  /api/chats/:id/documents         → List documents in a chat
```

### 8.2 Key Changes from Current API

| Endpoint | Change |
|----------|--------|
| `POST /api/chats` | Now requires `category_id` in the body |
| `POST /api/chats/:id/messages` | Dual-RAG search instead of single search |
| `GET /api/categories` | **New** — returns list of active categories |
| `GET /api/chats/jobs/:id/status` | **Simplified or removed** — inline processing makes polling less critical |

---

## 9. Frontend & UX Strategy

### 9.1 User Journey

```
Landing Page
    │
    ▼
Sign In (Google OAuth)
    │
    ▼
Dashboard / Category Selection
    ├── "Rental & Tenancy Law" [Active]
    ├── "Consumer Protection" [Coming Soon]
    └── "Employment Law" [Coming Soon]
    │
    ▼
New Chat (in selected category)
    │
    ├── Upload document (drag & drop / click)
    │   └── Processing indicator (5-15 seconds)
    │
    ├── Ask questions
    │   └── Streaming response with dual citations
    │       ├── [Act, §Section] → highlighted in gold
    │       └── [Your Document, Clause X] → highlighted in blue
    │
    └── Chat history in sidebar
```

### 9.2 Pages to Update

| Page | Current State | What Changes |
|------|---------------|-------------|
| **Landing page** | Generic "upload and simplify" messaging | Rewrite copy for dual-RAG value prop. Emphasize "backed by actual law." |
| **Login page** | Fine as-is | No changes needed |
| **Chat layout** | Basic sidebar + main area | Add category badge on each chat in sidebar |
| **New chat view** | Text input + file attachment | Category selection step BEFORE the input bar appears |
| **Conversation view** | Basic messages with streaming | Enhanced citation rendering (KB vs Doc citations) |

### 9.3 Citation Display Design

In the chat UI, citations should be visually distinct:

```
┌──────────────────────────────────────────────────────────────┐
│ PatraSaar                                                    │
│                                                              │
│ Your agreement's Clause 7 allows the landlord to increase    │
│ rent by up to 10% annually at their sole discretion.         │
│                                                              │
│ However, under the Transfer of Property Act:                 │
│                                                              │
│  ┌─ KB Citation ─────────────────────────────────────────┐   │
│  │ 📜 Transfer of Property Act, 1882 — Section 105       │   │
│  │ "...the duration of a lease, the rent to be paid...   │   │
│  │ are to be determined by the agreement of the parties" │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Doc Citation ────────────────────────────────────────┐   │
│  │ 📄 Your Document — Clause 7                           │   │
│  │ "The landlord reserves the right to revise rent       │   │
│  │ annually at a rate not exceeding 10%..."              │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ⚠️ While TPA allows parties to agree on rent terms, the     │
│ Delhi Rent Control Act (if applicable) restricts arbitrary   │
│ rent increases. Check your jurisdiction.                     │
│                                                              │
│ ⚖️ This is for informational purposes only, not legal       │
│ advice. Consult a qualified lawyer for specific matters.    │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Prompt Engineering & Citation System

### 10.1 System Prompt (Full Draft)

```
You are PatraSaar, an AI legal analyst specializing in Indian law.

YOUR ROLE:
You help users understand their legal documents by analyzing them against 
actual Indian legal statutes, acts, and guidelines from our verified 
knowledge base. You do NOT provide legal advice — you provide legal 
information and analysis.

CURRENT CONTEXT:
- Legal Category: {category_name}
- Jurisdiction (if specified): {jurisdiction}
- User has uploaded: {document_summary_or_none}

YOU HAVE TWO VERIFIED SOURCES OF INFORMATION:

1. KNOWLEDGE BASE (Marked as [KB-N]):
   These are verified Indian legal statutes and acts. They are 
   authoritative. When citing, use the format:
   [Act Short Name, §Section Number]
   Example: [TPA 1882, §105], [Delhi RCA 1958, §14]

2. USER'S DOCUMENT (Marked as [DOC-N]):
   This is the user's uploaded document. When citing, use the format:
   [Your Document, Clause/Section X]
   Example: [Your Document, Clause 7], [Your Document, Section 3.2]

ANALYSIS RULES:
1. ALWAYS compare the user's document clauses against the relevant law.
2. Cite EVERY factual claim to its source. No un-cited assertions.
3. When a document clause conflicts with the law, explain clearly:
   - What the clause says
   - What the law says
   - What the practical implication is
4. Flag potentially unfair, one-sided, or unenforceable clauses with ⚠️
5. Highlight user rights that may not be mentioned in their document with ✅
6. Use simple, everyday language. Define legal terms in parentheses.
7. If you are not sure, say "Based on the available context, I cannot 
   determine this with certainty."
8. Do NOT invent legal provisions. Only cite what exists in the context.
9. Note jurisdictional differences when relevant.
10. ALWAYS end your response with:
    "⚖️ This is for informational purposes only, not legal advice. 
    For specific legal matters, consult a qualified lawyer."

RESPONSE FORMAT:
- Use clear headings and bullet points
- Group analysis by topic (e.g., "Rent", "Eviction", "Security Deposit")
- Lead with the most important findings
```

### 10.2 Citation Extraction

The LLM outputs inline citations in two formats:
- `[Act Name, §Section]` for KB references
- `[Your Document, Clause X]` for user doc references

**Post-processing (future enhancement):**
We can parse these from the streamed output and render them as interactive tags in the UI. For MVP, they display as styled inline text.

---

## 11. Security & Compliance

### 11.1 Data Isolation

| Data Type | Isolation Level | How |
|-----------|----------------|-----|
| **KB vectors** | Shared (read-only) | All users query the same KB. No user can modify it. |
| **User document vectors** | Per-user, per-chat | Filtered by `user_id` AND `chat_id` in every Vectorize query |
| **User files in R2** | Per-user | Key prefix: `{user_id}/{chat_id}/{doc_id}/` |
| **Chat messages** | Per-user | All D1 queries include `user_id = ?` |
| **Sessions** | Per-user | BetterAuth httpOnly cookies |

### 11.2 Security Measures

- CORS restricted to known origins
- Session-based auth via BetterAuth (secure httpOnly cookies, no JWTs in localStorage)
- Security headers on all responses (CSP, X-Frame-Options, HSTS)
- File type and size validation on both client and server (extension + MIME)
- All user data queries scoped by `user_id` at the SQL level
- D1 prepared statements (prevents SQL injection)
- React's default XSS escaping
- Legal disclaimer on every AI response

### 11.3 Legal Compliance

- **Not legal advice.** Every response includes a disclaimer. The landing page, footer, and login page all state this clearly.
- **Public domain legal texts.** All KB content is sourced from official government publications, which are in the public domain under Indian copyright law.
- **No personal data retention beyond sessions.** We store user files for their active chats. Deleting a chat deletes all associated data (messages, documents, vectors).

---

## 12. Infrastructure & Deployment

### 12.1 Technology Stack

| Layer | Technology | Free Tier |
|-------|------------|-----------|
| Frontend | Next.js 16, React 19, Framer Motion | ✅ |
| Backend | Hono on Cloudflare Workers | ✅ 100K req/day |
| Database | Cloudflare D1 (SQLite) | ✅ 5GB, 5M reads/day |
| Vector Search | Cloudflare Vectorize | ✅ Free tier |
| File Storage | Cloudflare R2 | ✅ 10GB, 0 egress |
| Auth | BetterAuth (OSS) + Google OAuth | ✅ Free |
| LLM | Groq (Llama 3.3 70B) | ✅ 14.4K req/day |
| Embeddings | CF Workers AI (bge-base-en-v1.5) | ✅ Free |
| Monorepo | Turborepo | ✅ Free |
| CI/CD | GitHub Actions | ✅ Free |

### 12.2 Environments

| Environment | Purpose | Infrastructure |
|-------------|---------|---------------|
| **Local dev** | Development | Wrangler local D1/R2 + local Next.js |
| **Staging** | Pre-production testing | CF Workers (separate worker names) |
| **Production** | Live | CF Workers + Pages |

---

## 13. Phased Roadmap

### Phase 0: Planning & Data Sourcing (Before coding)

```
├── [ ] Finalize the list of legal texts for Rental/Tenancy KB
├── [ ] Source and download all texts from India Code
├── [ ] Clean and format into plain text files (UTF-8)
├── [ ] Place in packages/ingest/sources/rental-tenancy/
├── [ ] Verify completeness — do we have all relevant sections?
├── [ ] Create category metadata (slug, name, description)
└── [ ] Review and approve this implementation plan
```

**Milestone: We have 5-7 clean, complete legal text files ready for ingestion.**

---

### Phase 1: Knowledge Base Infrastructure

```
├── [ ] Create packages/ingest/ package with CLI scaffolding
├── [ ] Update D1 schema.sql with kb_categories, kb_sources, kb_chunks tables
├── [ ] Add category_id to chats table
├── [ ] Build the ingest CLI pipeline:
│   ├── [ ] Source reader (read + clean txt files)
│   ├── [ ] Chunker integration (re-use apps/api/src/lib/chunking.ts)
│   ├── [ ] Embedder (call Workers AI bge-base-en-v1.5)
│   └── [ ] Uploader (write to D1 + Vectorize, with metadata)
├── [ ] Run first ingestion of all Rental/Tenancy sources
├── [ ] Verify: query Vectorize manually, confirm chunks are correct
└── [ ] Add GET /api/categories endpoint
```

**Milestone: The KB is populated in D1 + Vectorize. We can query it.**

---

### Phase 2: Dual-RAG Query Engine

```
├── [ ] Update POST /api/chats to require category_id
├── [ ] Refactor streamRagResponse in messages.ts:
│   ├── [ ] Dual Vectorize search (KB + User)
│   ├── [ ] Context assembly with labeled sections
│   ├── [ ] New system prompt with analysis instructions
│   └── [ ] Preserve SSE streaming
├── [ ] Handle edge cases:
│   ├── [ ] No user document → KB-only mode
│   ├── [ ] No KB results → user-doc-only mode
│   └── [ ] Neither → honest "I don't know"
├── [ ] Test with real rental agreements vs KB
└── [ ] Verify citation quality in responses
```

**Milestone: Ask a question about a rental agreement and get a response citing both the Act and the doc.**

---

### Phase 3: User Document Processing

```
├── [ ] Enable R2 in wrangler.toml
├── [ ] Implement inline document processing (no queue):
│   ├── [ ] Text extraction (PDF text → Workers AI for scanned)
│   ├── [ ] Chunking
│   ├── [ ] Embedding + Vectorize upsert (type: 'user')
│   └── [ ] Update document status
├── [ ] Remove URL upload logic (simplify)
├── [ ] Remove/simplify queue consumer code
├── [ ] Frontend: loading state during inline processing
└── [ ] Test full flow: upload PDF → process → ask question → get dual-cited answer
```

**Milestone: Complete working pipeline — upload → ask → cited answer.**

---

### Phase 4: Frontend Polish

```
├── [ ] Rewrite landing page copy for dual-RAG value proposition
├── [ ] Update "How It Works" section with new steps
├── [ ] Build category selection UI (card-based, before chat creation)
├── [ ] Add category badge to chats in sidebar
├── [ ] Style KB citations differently from doc citations in chat
├── [ ] Update the new-chat view to show selected category context
├── [ ] Mobile responsive polish (320px → 2560px)
└── [ ] Update all legal disclaimers for consistency
```

**Milestone: The frontend reflects the new vision end-to-end.**

---

### Phase 5: Hardening & Launch

```
├── [ ] Error handling throughout API (graceful failures)
├── [ ] Input sanitization review
├── [ ] Rate limiting (basic per-user counts)
├── [ ] Chat deletion cascade (D1 messages + documents + chunks, R2 files, Vectorize vectors)
├── [ ] Update README.md (final version)
├── [ ] Update CI/CD workflows if needed
├── [ ] Deploy to production Cloudflare
├── [ ] Smoke test production deployment
├── [ ] Test with 3-5 real rental agreements from different states
└── [ ] Launch V1 🚀
```

**Milestone: V1 is live. Users can analyze rental agreements against Indian law.**

---

## 14. Risk Analysis & Mitigations

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Vectorize free tier limits hit** | Service degradation | Low (for <500 users) | Monitor usage. Paid tier is cheap if needed. |
| **Groq rate limits** | Users get errors | Medium | Implement retry with backoff. Add OpenRouter as fallback LLM. |
| **Workers AI embedding quality** | Poor retrieval | Low | bge-base-en-v1.5 is well-tested for English text. Monitor retrieval quality manually. |
| **Legal text extraction issues** | Garbled KB content | Low (texts are plain text) | Manual verification of all ingested chunks. |
| **Inline processing timeout** | Large docs fail to process | Medium | Set reasonable limits (10MB, 100 pages). Workers have 30s CPU time — should be enough. |

### Product Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **LLM hallucinating legal provisions** | User misled | Medium | Low temperature (0.3), strict system prompt ("cite only what's in context"), post-hoc verification. |
| **Jurisdiction mismatches** | Wrong law applied | Medium | System prompt instructs LLM to note jurisdictional differences. Future: explicit jurisdiction selection. |
| **Users treating output as legal advice** | Liability | Medium | Disclaimers everywhere. Clear "NOT legal advice" messaging. |
| **KB going stale (law amended)** | Outdated information | Low (laws change slowly) | Track `ingested_at`. Periodic manual review of amendments. |

### Data Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Incorrect legal text sourced** | Fundamentally wrong answers | Low | Source only from India Code (official). Cross-verify key sections. |
| **Cross-user data leakage** | Privacy violation | Very Low | All queries scoped by user_id. Vectorize metadata filtering enforced. |
| **R2 data loss** | User loses uploaded docs | Very Low | Cloudflare R2 has built-in redundancy. Not mission-critical (user has original). |

---

## 15. Future Vision & Expansion

### V2: More Categories
- Add Consumer Protection Law (Consumer Protection Act, 2019)
- Add Employment Law (Industrial Disputes Act, PF Act, Gratuity Act)
- Admin dashboard for KB management

### V3: Smart Analysis
- Automatic clause-by-clause analysis without user asking questions
- Risk scoring: "This agreement has 3 potentially unfair clauses"
- "Missing clauses" detection: "Your agreement doesn't mention security deposit return timelines, which is required under..."

### V4: Multilingual Support
- Hindi / Hinglish responses
- Regional language document upload support
- Translation layer for non-English legal texts

### V5: Deeper Legal Intelligence
- Landmark judgment citations (case law)
- Comparative analysis ("In Maharashtra vs Delhi, here's how this differs...")
- Template generation ("Here's what a fair version of this clause looks like")
- Community-contributed legal commentary

---

*Document Version: 3.0*
*Last Updated: 2026-04-08*
*Vision: Dual-RAG Legal Document Analysis — Starting with Rental & Tenancy Law*
