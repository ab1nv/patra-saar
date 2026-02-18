# PatraSaar

Legal clarity, distilled.

PatraSaar is an AI-powered platform that simplifies Indian legal documents. Upload a contract, FIR, court order, or legal notice, ask questions about it, and get plain-language explanations with source citations.

## What it does

- **Upload legal documents** in PDF, DOCX, TXT format, or provide a web link
- **Ask questions** in natural language, like chatting with a knowledgeable assistant
- **Get cited answers** where every claim references the exact section, clause, or page
- **Stream responses** in real-time so you can start reading immediately

PatraSaar does not provide legal advice. It is a research and comprehension tool.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Framer Motion |
| Backend | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Vector search | Cloudflare Vectorize |
| File storage | Cloudflare R2 |
| Auth | BetterAuth with Google OAuth |
| LLM | Groq (Llama 3.3 70B) with OpenRouter fallback |
| Document AI | Cloudflare Workers AI for embeddings |
| Monorepo | Turborepo |

## Project structure

```
patrasaar/
  apps/
    api/          Hono API worker (auth, chat, file processing, RAG)
    web/          Next.js frontend
  packages/
    shared/       Zod schemas, types, validation helpers
```

## Getting started

### Prerequisites

- Node.js 20+
- A Cloudflare account
- Google Cloud OAuth credentials
- A Groq API key

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/patra-saar.git
   cd patra-saar
   ```

2. Install dependencies:
   ```
   make install
   ```

3. Copy the env template and fill in your values:
   ```
   cp .env.example .env
   ```

4. Run database migrations locally:
   ```
   make db-migrate
   ```

5. Start the dev servers:
   ```
   make dev
   ```

   The API runs on `http://localhost:8787` and the web app on `http://localhost:3000`.

### Docker

If you prefer Docker:

```
make docker-up
```

This builds and starts both the API and web services with hot reloading.

## Available commands

```
make install        Install all dependencies
make dev            Start dev servers (API + Web)
make test           Run all tests
make test-coverage  Run tests with coverage
make build          Build all packages
make lint           Run linters
make typecheck      Run TypeScript type checking
make format         Format code with Prettier
make db-migrate     Run D1 migrations locally
make docker-up      Start Docker dev environment
make docker-down    Stop Docker dev environment
make clean          Remove node_modules and build artifacts
```

## Running tests

```
make test
```

Tests cover:
- Shared schemas and validation logic
- Legal text chunking and section extraction
- Landing page rendering and content
- Login page and OAuth flow

## Security

- CORS restricted to known origins
- Session-based auth via BetterAuth (no JWTs in localStorage)
- Security headers on all responses (CSP, X-Frame-Options, HSTS)
- File type and size validation on both client and server
- All user data is scoped by user ID at the query level

## Deployment — Cloudflare Setup Guide

PatraSaar runs entirely on Cloudflare's platform. Here is everything you need to set up.

### Prerequisites

| Service | Purpose |
|---------|---------|
| [Cloudflare account](https://dash.cloudflare.com/sign-up) | Hosts everything |
| [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) | `npm i -g wrangler` — deploys and manages Workers |
| [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | OAuth credentials for login |
| [Groq](https://console.groq.com/) | LLM API key for AI responses |

### Current state of the app

> **Note:** The RAG pipeline and fine-tuned model are **not yet active**. Users can upload documents and ask questions, but AI responses come from **Groq's Llama 3.3 70B with general knowledge** — not document-specific answers. Once the embedding and vectorize pipeline is wired up, responses will be grounded in uploaded documents.

### Step 1 — Authenticate Wrangler

```bash
wrangler login
```

This opens a browser to authorize Wrangler with your Cloudflare account.

### Step 2 — Create Cloudflare resources

Run these from the repo root:

```bash
# 1. Create the D1 database
wrangler d1 create patrasaar-db

# 2. Create the R2 bucket for file uploads
wrangler r2 bucket create patrasaar-uploads

# 3. Create the Queue for document processing
wrangler queues create document-processing

# 4. Create the Vectorize index (768 dimensions for bge-base-en-v1.5)
wrangler vectorize create patrasaar-docs --dimensions=768 --metric=cosine
```

After creating the D1 database, Wrangler prints a `database_id`. Update `apps/api/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "patrasaar-db"
database_id = "<paste-your-database-id-here>"
```

### Step 3 — Run database migrations

```bash
# For remote (production) database
cd apps/api
npm run db:migrate:remote
```

### Step 4 — Set secrets

These are stored securely in Cloudflare and never committed to git:

```bash
cd apps/api

wrangler secret put BETTER_AUTH_SECRET
# Paste a random 32+ character string

wrangler secret put BETTER_AUTH_URL
# Your deployed API URL, e.g. https://patrasaar-api.<your-subdomain>.workers.dev

wrangler secret put GOOGLE_CLIENT_ID
# From Google Cloud Console (see Step 5)

wrangler secret put GOOGLE_CLIENT_SECRET
# From Google Cloud Console (see Step 5)

wrangler secret put GROQ_API_KEY
# From https://console.groq.com/
```

### Step 5 — Set up Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Add these **Authorized redirect URIs**:
   - `http://localhost:8787/api/auth/callback/google` (for local dev)
   - `https://patrasaar-api.<your-subdomain>.workers.dev/api/auth/callback/google` (for production)
4. Copy the Client ID and Client Secret into your `.dev.vars` (local) and Wrangler secrets (production)

### Step 6 — Deploy the API

```bash
cd apps/api
npx wrangler deploy
```

After deploying, your API will be live at `https://patrasaar-api.<your-subdomain>.workers.dev`.

### Step 7 — Deploy the web frontend

The web frontend is built as a static export and deployed to Cloudflare Pages.

```bash
# Build the static site
cd apps/web
npx next build
# Deploy to Cloudflare Pages
npx wrangler pages deploy out --project-name=patrasaar
```

This also runs automatically via GitHub Actions on push to `master`.

### Step 8 — Set up GitHub Actions (CI/CD)

The repo includes two workflows:
- **CI** (`.github/workflows/ci.yml`) — runs typecheck, format check, tests, and build on every push/PR
- **Deploy** (`.github/workflows/deploy.yml`) — deploys API to Workers and web to Cloudflare Pages on push to `master`

Add these **secrets** in your GitHub repo (Settings → Secrets → Actions):

| Secret | Where to get it |
|--------|----------------|
| `CLOUDFLARE_API_TOKEN` | [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens) — create a token with **Edit Cloudflare Workers** permissions |
| `CLOUDFLARE_ACCOUNT_ID` | [Cloudflare Dashboard](https://dash.cloudflare.com/) → click your account → copy the Account ID from the URL or overview page |
| `API_URL` | Your deployed API URL, e.g. `https://patrasaar-api.<your-subdomain>.workers.dev` |

> **Important:** The deploy workflow will fail without `CLOUDFLARE_API_TOKEN`. This is the cause of the `non-interactive environment` error — the secret must be configured in GitHub.

### How the app works (current flow)

```
User uploads document → R2 storage + Queue
User asks question → Groq LLM → streamed response (SSE)
```

1. **Authentication**: User signs in with Google OAuth via BetterAuth
2. **Chat creation**: User creates a new chat session
3. **Document upload** (optional): Files are uploaded to R2, a processing job is queued
4. **Question**: User sends a text message
5. **Response**: The API calls Groq's Llama 3.3 70B with the user's question and chat history, streaming the response back via Server-Sent Events
6. **Legal disclaimer**: Every response ends with a legal disclaimer that this is not legal advice

Once RAG is enabled, Step 5 will also:
- Embed the query using Cloudflare Workers AI (bge-base-en-v1.5)
- Search Vectorize for relevant document chunks
- Include the matching chunks as context in the LLM prompt

## File limits

- Maximum file size: 10MB
- Maximum page count: 100 pages
- Supported formats: PDF, TXT, DOC, DOCX

## License

This project is private and not licensed for redistribution.

