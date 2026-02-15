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

## Deployment

Push to `main` triggers the GitHub Actions deploy workflow which:
1. Deploys the API to Cloudflare Workers
2. Builds and deploys the frontend to Cloudflare Pages

You will need to set these secrets in your GitHub repo:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `API_URL` (the deployed API URL)

## File limits

- Maximum file size: 10MB
- Maximum page count: 100 pages
- Supported formats: PDF, TXT, DOC, DOCX

## License

This project is private and not licensed for redistribution.
