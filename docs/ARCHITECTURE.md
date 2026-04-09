# PatraSaar Architecture

<!-- AUTO-GENERATED: 2026-03-11 -->

PatraSaar is a monorepo using Turborepo, combining a Cloudflare Workers backend with a Next.js frontend, unified by shared types and schemas.

## Monorepo Structure

```
patra-saar/
├── apps/
│   ├── api/           # Hono on Cloudflare Workers (backend)
│   └── web/           # Next.js 15 with React 19 (frontend)
├── packages/
│   └── shared/        # Zod schemas, types, utilities
├── Makefile           # Development commands
├── CLAUDE.md          # Project guidelines
└── docs/              # Documentation (this directory)
```

**Workspace Setup**: npm workspaces configured in `package.json` root:
```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

Each workspace is independently deployable and has its own `package.json`, `tsconfig.json`, and build configuration.

---

## Technology Stack

### Backend (apps/api)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Server** | Hono | Fast, minimal HTTP framework for Workers |
| **Runtime** | Cloudflare Workers | Serverless compute at edge |
| **Database** | Cloudflare D1 (SQLite) | SQL via Kysely ORM |
| **File Storage** | Cloudflare R2 | S3-compatible object storage |
| **Vector Search** | Cloudflare Vectorize | Semantic search with pgvector |
| **Embeddings** | Cloudflare Workers AI (bge-base-en-v1.5) | Generate embeddings locally |
| **Queue** | Cloudflare Queues | Async document processing |
| **LLM** | Groq (primary) / OpenRouter (fallback) | Text generation, streaming |
| **Auth** | BetterAuth | User sessions, OAuth integration |
| **Validation** | Zod | Runtime type validation |

### Frontend (apps/web)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 15 | App Router, server components |
| **UI Library** | React 19 | Component-based UI |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Animation** | Framer Motion | Smooth, declarative animations |
| **State** | React hooks, context | Local state management |
| **API Client** | Fetch API | HTTP requests with auth |
| **Deployment** | Vercel | Optimized Next.js hosting |

### Shared (packages/shared)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Validation** | Zod | Schema definitions, runtime checks |
| **Types** | TypeScript | Shared type definitions |
| **Utilities** | Plain TS | Helper functions, constants |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ↓
        ┌────────────────────────────┐
        │   Frontend (Next.js 15)    │
        │   - App Router             │
        │   - React 19 Components    │
        │   - Framer Motion          │
        │   - Tailwind CSS           │
        └────────────┬───────────────┘
                     │ REST + SSE
                     ↓
    ┌────────────────────────────────────────┐
    │  Backend (Hono on Cloudflare Workers)  │
    │  ┌──────────────────────────────────┐  │
    │  │  Routes                          │  │
    │  │  - POST /api/auth/*              │  │
    │  │  - GET/POST /api/chats           │  │
    │  │  - GET/POST /api/messages        │  │
    │  │  - POST /api/documents/upload    │  │
    │  │  - GET /api/documents/:id        │  │
    │  └──────────────────────────────────┘  │
    │                                        │
    │  ┌──────────────────────────────────┐  │
    │  │  RAG Pipeline                    │  │
    │  │  - Embedding generation          │  │
    │  │  - Vector search (Vectorize)     │  │
    │  │  - LLM streaming (Groq)          │  │
    │  │  - Citation parsing              │  │
    │  └──────────────────────────────────┘  │
    └────────────┬─────────┬─────────┬───────┘
                 │         │         │
        ┌────────↓──┐  ┌───↓──┐  ┌──↓────┐
        │  D1 DB    │  │ R2   │  │Vector │
        │ (SQLite)  │  │      │  │ize    │
        │           │  │      │  │       │
        │ Tables:   │  │PDF   │  │ Embeddings
        │ - users   │  │DOCX  │  │ Index
        │ - chats   │  │TXT   │  │
        │ - msgs    │  │      │  │
        │ - docs    │  │      │  │
        │ - chunks  │  │      │  │
        │ - jobs    │  └──────┘  └───────┘
        └───────────┘
              ↑
              │ Async
              ↓
    ┌────────────────────────┐
    │  Cloudflare Queues     │
    │  Document Processing   │
    │  Consumer              │
    │  - Parse (Workers AI)  │
    │  - Chunk (section-aware)
    │  - Embed               │
    │  - Store               │
    └────────────────────────┘
              │
              ↓
    ┌────────────────────────┐
    │  External APIs         │
    │  - Groq (LLM)          │
    │  - OpenRouter (LLM)    │
    │  - Google OAuth        │
    └────────────────────────┘
```

---

## Backend Architecture (apps/api)

### Project Structure

```
apps/api/
├── src/
│   ├── index.ts              # Entry point, middleware, queue consumer
│   ├── routes/
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── chats.ts          # Chat CRUD (create, list, delete)
│   │   ├── messages.ts       # Messages, RAG pipeline
│   │   └── documents.ts      # Document upload, processing
│   ├── lib/
│   │   ├── chunking.ts       # Legal text chunking logic
│   │   ├── embeddings.ts     # Vectorize integration
│   │   ├── llm.ts            # Groq/OpenRouter clients
│   │   └── auth.ts           # BetterAuth setup
│   ├── db/
│   │   ├── schema.sql        # D1 migrations
│   │   └── client.ts         # Kysely database client
│   └── types/
│       └── index.ts          # Internal types (Env, HonoContext)
├── wrangler.toml             # Cloudflare configuration
└── package.json
```

### Core Files

#### `src/index.ts` - Application Entry Point

- Hono app initialization
- Global middleware (auth, CORS, logging)
- Route registration (auth, chats, messages, documents)
- Queue consumer for document processing (on `document_upload` queue)
- Error handling and response formatting

**Key Middleware**:
```typescript
// Session validation
app.use(sessionMiddleware);

// User context injection
app.use(async (c, next) => {
  c.set('user', await validateSession(c));
  await next();
});

// Queue consumer
queue.consumers = [
  async (batch) => {
    for (const msg of batch.messages) {
      await processDocument(msg.body);
    }
  }
];
```

#### `src/routes/chats.ts` - Chat Management

**Endpoints**:
- `GET /api/chats` - List user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:chatId` - Get chat details
- `DELETE /api/chats/:chatId` - Delete chat
- `GET /api/chats/:chatId/documents` - List documents in chat

**Query Filtering**: All queries filter by `user_id` at database level.

#### `src/routes/messages.ts` - RAG Pipeline

**Endpoints**:
- `POST /api/messages` - Send message, stream response
- `GET /api/messages?chatId=X` - List messages (with pagination)

**RAG Pipeline Flow** (in `POST /api/messages`):

1. **Validation**: Validate message using Zod schema
2. **Embedding**: Generate query embedding via Workers AI
3. **Vector Search**: Query Vectorize for top-K similar chunks
4. **Retrieval**: Fetch full chunk details from D1
5. **Contextualization**: Build system prompt with retrieved chunks
6. **LLM Streaming**: Stream response from Groq via SSE
7. **Citation Parsing**: Extract [N] citations from streamed response
8. **Storage**: Save message, response, and citations to database
9. **Response Format**: SSE events (token, done, citations)

#### `src/routes/documents.ts` - Document Upload

**Endpoints**:
- `POST /api/documents/upload` - Upload file or URL
- `GET /api/documents/:id` - Get document metadata
- `DELETE /api/documents/:id` - Delete document

**Upload Flow**:
1. Validate file size (<10MB) and type (PDF, DOCX, TXT)
2. Store file in R2
3. Create document record in D1
4. Enqueue `document_upload` job for async processing

#### `src/lib/chunking.ts` - Legal Text Chunking

**Algorithm**:
- Section-aware: detect major sections (Chapter, Section, Article)
- Chunk size: ~500 characters with 50-character overlap
- Metadata: track page number and full section title per chunk
- Output: array of `{ content, page_number, section_title }`

**Input**: Raw text from parsed PDF/DOCX

**Output**: Array of chunks with metadata, ready for embedding

#### `src/lib/embeddings.ts` - Vector Search

**Model**: `bge-base-en-v1.5` (384-dimensional)

**Operations**:
- `generateEmbedding(text)` → vector
- `insertIntoVectorize(chunks, metadata)` → stores in Vectorize
- `queryVectorize(embedding, topK)` → returns top-K similar chunks

**Metadata**: document_filename, page, sectionTitle, chunk_id, document_id

#### `src/db/schema.sql` - Database Schema

**Core Tables**:

```sql
-- BetterAuth tables (users, sessions, accounts, verifications)

-- Custom tables
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  status TEXT, -- 'pending', 'ready', 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER DEFAULT 0,
  section_title TEXT,
  chunk_index INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  citations JSON DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id)
);

CREATE TABLE processing_jobs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  status TEXT, -- 'pending', 'completed', 'failed'
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- FTS5 virtual table for full-text search (Phase 2)
CREATE VIRTUAL TABLE document_chunks_fts USING fts5(
  content,
  chunk_id UNINDEXED,
  document_id UNINDEXED
);
```

---

## Frontend Architecture (apps/web)

### Project Structure

```
apps/web/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Landing page
│   │   ├── login/
│   │   │   └── page.tsx      # Login page
│   │   └── chat/
│   │       ├── layout.tsx    # Chat layout (sidebar, main, documents)
│   │       └── page.tsx      # Chat interface
│   ├── components/
│   │   ├── ChatInterface.tsx # Main chat UI
│   │   ├── Message.tsx       # Single message + source cards
│   │   ├── SourceCard.tsx    # Individual citation card
│   │   ├── SourceCardsPanel.tsx # Container for citations
│   │   ├── DocumentList.tsx  # Right sidebar documents
│   │   ├── Sidebar.tsx       # Left sidebar chats
│   │   ├── NavBar.tsx        # Top navigation
│   │   └── ...other components
│   ├── lib/
│   │   ├── api.ts            # Centralized API client with auth
│   │   ├── sseReader.ts      # SSE event parsing
│   │   └── constants.ts      # API URLs, limits
│   ├── styles/
│   │   └── globals.css       # Tailwind + custom styles
│   └── types/
│       └── index.ts          # Frontend type extensions
├── next.config.ts            # Next.js configuration
├── tailwind.config.ts        # Tailwind configuration
└── package.json
```

### Key Components

#### `src/app/chat/page.tsx` - Chat Interface

Main chat view with:
- Message list (scrollable)
- Input field with file upload
- SSE reader for streaming responses
- Real-time citation updates

#### `src/app/chat/layout.tsx` - Chat Layout

Three-panel layout:
- **Left**: Sidebar with chat history
- **Center**: Main chat interface
- **Right**: Collapsible documents panel

#### `src/components/ChatInterface.tsx`

Handles:
- Message state management
- SSE connection and parsing
- User input validation
- File upload handling
- Streaming message display

#### `src/lib/api.ts` - API Client

Centralized fetch wrapper with:
- Base URL configuration
- Authorization headers (session cookies)
- Error handling with retry logic
- SSE streaming setup
- Type-safe responses using Zod

**Key Functions**:
```typescript
// Chat operations
getChats()
createChat(title)
deleteChat(chatId)

// Message operations
getMessages(chatId)
sendMessage(chatId, content, files?)

// Document operations
getDocuments(chatId)
uploadDocument(file)
deleteDocument(docId)

// Auth
login(email, password)
logout()
getSession()
```

---

## Data Flow

### Document Upload Flow

```
User selects PDF
    ↓
Frontend validates: size < 10MB, type in [pdf, docx, txt]
    ↓
POST /api/documents/upload
    ↓
Backend stores file in R2 (hashed filename)
    ↓
Backend creates document record in D1 (status='pending')
    ↓
Backend enqueues document_upload job (Cloudflare Queues)
    ↓
[Async] Queue consumer picks up job
    ↓
Parse file: PDF/DOCX via Workers AI Vision or TXT directly
    ↓
Chunk text: section-aware, ~500 chars, with metadata
    ↓
Generate embeddings: bge-base-en-v1.5 (384 dims)
    ↓
Insert into Vectorize with metadata
    ↓
Insert into D1 document_chunks table
    ↓
Populate FTS5 virtual table
    ↓
Update document status to 'ready'
    ↓
Frontend polls for status change, updates UI
```

### Message / RAG Flow

```
User asks question
    ↓
Frontend validates message length and content
    ↓
POST /api/messages { chatId, content, documentIds }
    ↓
Backend generates embedding for query (Workers AI)
    ↓
Vector search: Vectorize.query(embedding, topK=20)
    ↓
FTS5 search: D1 BM25 search on content
    ↓
Merge results: Reciprocal Rank Fusion (RRF)
    ↓
Rerank: BGE reranker on top 15 (keep top 6)
    ↓
Compress: Groq extracts relevant sentences from each chunk (parallel)
    ↓
Build context: format chunks as numbered sources
    ↓
LLM stream: Groq chat.completions.create() with streaming
    ↓
SSE stream to frontend:
  - type: 'token' → user sees response appear
  - type: 'done' → stream complete
  - type: 'citations' → [N] references from response
    ↓
Frontend parses citations SSE event
    ↓
Save message, response, citations to D1
    ↓
Frontend displays response + source cards below message
```

---

## External Service Integration

### Groq LLM

**Model**: `mixtral-8x7b-32768` (default) or `llama-2-70b-chat`

**Streaming Setup**:
```typescript
const stream = await groq.chat.completions.create({
  model: 'mixtral-8x7b-32768',
  messages: [{
    role: 'system',
    content: 'You are a legal assistant...',
  }, ...chatHistory],
  stream: true,
  max_tokens: 1024,
});
```

**Response Handling**: Iterate `stream` generator, collect chunks, parse [N] citations.

### Cloudflare Workers AI

**Available Models**:
- `@cf/baai/bge-base-en-v1.5` - Embeddings (384 dims)
- `@cf/baai/bge-reranker-base` - Reranking
- Vision models for PDF text extraction

**Usage**:
```typescript
const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
  text: 'Query text here'
});
```

### Google OAuth (BetterAuth)

**Setup**: Configured in `src/lib/auth.ts`

**Flow**: Google → Callback → Session in D1 → Cookie-based auth

---

## Security Model

### Authentication
- **Method**: Session-based (cookie), no JWT
- **Provider**: BetterAuth with Google OAuth
- **Storage**: D1 `user`, `session`, `account` tables

### Authorization
- **User Isolation**: All queries filter by `user_id` in WHERE clause
- **Database Level**: No reliance on application-layer filtering
- **File Access**: R2 object keys include user_id prefix

### Data Protection
- **HTTPS**: Enforced via Cloudflare
- **Secrets**: Environment variables (GROQ_API_KEY, GOOGLE_CLIENT_SECRET)
- **Logging**: Error logs sanitized (no PII or API keys)

---

## Performance Considerations

### Caching Strategy

- **Database**: D1 results cached via Cloudflare's durable objects (for high-traffic endpoints)
- **Frontend**: React context + useState for client-side state
- **API**: Cache-Control headers set appropriately (e.g., 1-hour for document metadata)

### Latency Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Document upload | <500ms | R2 write only |
| Document processing | ~30s | Async via queue |
| Query embedding | <200ms | Workers AI (cached if duplicate query) |
| Vector search | <100ms | Vectorize, topK=20 |
| Reranking | <300ms | BGE reranker, 15 candidates |
| LLM first token | <1s | Groq streaming |
| Full response | <5s | Depends on length |

### Token Usage Optimization

- **Chunking**: 500 char chunks minimize context size
- **Compression**: Phase 4 extracts only relevant sentences
- **Limits**: System prompt + 6 chunks + chat history ≈ 2-3K tokens typical

---

## Deployment

### Backend Deployment
- **Platform**: Cloudflare Pages (via wrangler)
- **Trigger**: Git push to main branch
- **Environment**: `wrangler.toml` defines bindings (D1, R2, Vectorize, Queues, AI)
- **Secrets**: Stored in Cloudflare dashboard

### Frontend Deployment
- **Platform**: Vercel (native Next.js hosting)
- **Trigger**: Git push to main branch
- **Environment Variables**: NEXT_PUBLIC_API_URL points to backend
- **Secrets**: OAuth credentials in Vercel dashboard

### Database Migrations
- **Tool**: Wrangler D1
- **File**: `apps/api/src/db/schema.sql`
- **Local**: `make db-migrate` runs via wrangler locally
- **Production**: Automatic via deployment pipeline

---

## Related Documentation

- See [NEXT_STEPS.md](./NEXT_STEPS.md) for RAG v2 enhancement roadmap
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup
- See [../CLAUDE.md](../CLAUDE.md) for project guidelines

---

**Last Updated**: 2026-03-11
