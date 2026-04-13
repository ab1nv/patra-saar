# PatraSaar — Deployment Guide (No OAuth)

This guide reflects the current setup where Google OAuth has been removed from the product flow.

## Overview

PatraSaar is a monorepo with two deployable applications:

| Unit       | Platform           | Staging Trigger  | Production Trigger |
| ---------- | ------------------ | ---------------- | ------------------ |
| `apps/api` | Cloudflare Workers | push to `master` | push to `prod`     |
| `apps/web` | Vercel             | push to `master` | push to `prod`     |

## Prerequisites

Install required tooling:

```bash
# Node.js 20+
node --version

# pnpm
npm install -g pnpm@9

# Cloudflare Wrangler CLI
pnpm add -g wrangler

# Vercel CLI
pnpm add -g vercel
```

Authenticate CLIs:

```bash
wrangler login
vercel login
```

## 1. Cloudflare Setup (API)

### 1.1 Create resources (one-time)

Run once per Cloudflare account/project:

```bash
# KV for uploaded documents
wrangler kv namespace create patrasaar-documents

# D1 database
wrangler d1 create patrasaar-db

# Vectorize index for user documents
wrangler vectorize create patrasaar-chunks --dimensions=768 --metric=cosine

# Vectorize index for legal corpus
wrangler vectorize create patrasaar-legal-corpus --dimensions=768 --metric=cosine

# Cache KV
wrangler kv namespace create CACHE
wrangler kv namespace create CACHE --preview
```

Copy returned IDs into `apps/api/wrangler.toml`.

### 1.2 Required API secrets

Only these secrets are required for runtime:

```bash
cd apps/api

# Default environment (used by staging deploy in this repo)
wrangler secret put OPENROUTER_API_KEY
wrangler secret put FRONTEND_URL

# Production environment (used by --env production)
wrangler secret put OPENROUTER_API_KEY --env production
wrangler secret put FRONTEND_URL --env production
```

Recommended values:

- `FRONTEND_URL` (staging/default): your staging web URL (for example `https://staging.patrasaar.in`)
- `FRONTEND_URL` (production): your production web URL (for example `https://patrasaar.in`)

### 1.3 Run D1 migrations

```bash
# Local migration verification
make db-migrate

# Remote D1 migration (production database)
make db-migrate-prod
```

Important: Ensure the conversation persistence migration is applied (`apps/api/migrations/0002_add_case_to_inquiries.sql`).

### 1.4 Deploy API

```bash
# Staging/default worker
make deploy-api-staging

# Production worker
make deploy-api-prod
```

Then add custom domain in Cloudflare:

- Workers & Pages -> `patrasaar-api` -> Settings -> Triggers -> Add Custom Domain
- Example: `api.patrasaar.in`

## 2. Vercel Setup (Web)

### 2.1 Link web project

```bash
cd apps/web
vercel link
```

Use `apps/web` as root directory.

### 2.2 Required web environment variables

In Vercel Project Settings -> Environment Variables:

Production:

```text
PUBLIC_API_URL=https://api.patrasaar.in
```

Preview/Staging:

```text
PUBLIC_API_URL=https://<your-staging-worker>.workers.dev
```

No Google OAuth variables are required.

### 2.3 Domains

Add domains in Vercel:

- `patrasaar.in` -> Production
- `staging.patrasaar.in` -> Preview

Cloudflare DNS examples:

- `patrasaar.in` CNAME `cname.vercel-dns.com`
- `staging.patrasaar.in` CNAME `cname.vercel-dns.com`

### 2.4 Deploy web

```bash
make deploy-web-prod
```

## 3. OpenRouter Setup

1. Create account at `openrouter.ai`.
2. Generate API key.
3. Set `OPENROUTER_API_KEY` secrets in Cloudflare as shown above.

## 4. CI/CD Setup

### 4.1 GitHub repository secrets

Set in GitHub -> Settings -> Secrets and variables -> Actions:

```text
CLOUDFLARE_API_TOKEN
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
OPENROUTER_API_KEY_TEST
CODECOV_TOKEN
```

### 4.2 Workflow behavior

From `.github/workflows`:

- `ci.yml`: runs on PRs to `master`/`prod`, and on pushes to `master`.
- `deploy-staging.yml`: deploys API + web on push to `master`.
- `deploy-prod.yml`: deploys API + web on push to `prod`.

## 5. Release Process (master -> prod)

Recommended:

1. Merge feature PRs into `master`.
2. Validate staging deployment.
3. Open PR from `master` to `prod`.
4. Merge PR after checks pass.
5. Verify production.

Hotfix path (when needed): merge `master` into `prod` directly and push.

## 6. Post-Deploy Checklist

- `curl https://api.patrasaar.in/health` returns status OK.
- Web app loads at `https://patrasaar.in`.
- Chat streaming works end-to-end.
- Case history creates, opens, and deletes correctly.
- Cloudflare worker error rate remains normal.
- Vercel deployment and runtime logs are clean.

## 7. Rollback

API rollback:

```bash
wrangler deployments list
wrangler rollback <DEPLOYMENT_ID>
```

Web rollback:

- Vercel Dashboard -> Deployments -> select last good deploy -> Promote to Production.

## 8. Local Development Setup

```bash
git clone git@github.com:your-org/patrasaar.git
cd patrasaar

make install

cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.env.example apps/web/.env

make db-migrate
make dev
```

Local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:8787`

## 9. Monitoring

- Cloudflare Workers: requests, errors, CPU time.
- Vercel: build/runtime logs, analytics.
- Optional: Sentry + uptime monitors.

## 10. Cost Snapshot

Typical early-stage deployment costs remain low on Cloudflare + Vercel free tiers, with OpenRouter costs depending on model and request volume.
