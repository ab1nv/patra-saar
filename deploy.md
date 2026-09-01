# PatraSaar — Deployment Guide

## Overview

PatraSaar is a monorepo with two deployable units:

| Unit | Platform | Branch trigger |
|---|---|---|
| `apps/api` | Cloudflare Workers | `prod` branch push |
| `apps/web` | Vercel | `prod` branch push |

Staging deployments happen automatically on every push to `master`.

---

## Prerequisites

Install these tools before proceeding:

```bash
# Node.js 20+
node --version  # v20.x.x

# pnpm
npm install -g pnpm@9

# Wrangler CLI (Cloudflare)
pnpm add -g wrangler

# Vercel CLI
pnpm add -g vercel
```

Authenticate both CLIs:

```bash
wrangler login      # Opens browser → Cloudflare dashboard
vercel login        # Opens browser → Vercel dashboard
```

---

## 1. First-Time Cloudflare Setup

### 1a. Create Cloudflare Resources

Run these commands once to create all required Cloudflare resources:

```bash
# Create R2 bucket for document storage
wrangler r2 bucket create patrasaar-documents

# Create D1 database
wrangler d1 create patrasaar-db
# → Copy the database_id from the output into apps/api/wrangler.toml

# Create Vectorize index (768 dims = bge-base-en-v1.5 output size)
wrangler vectorize create patrasaar-chunks \
  --dimensions=768 \
  --metric=cosine

# Create KV namespace for caching
wrangler kv namespace create CACHE
# → Copy the id from output into apps/api/wrangler.toml

# Create KV namespace for staging
wrangler kv namespace create CACHE --preview
```

### 1b. Update `wrangler.toml`

After running the above, open `apps/api/wrangler.toml` and fill in the IDs:

```toml
[[d1_databases]]
binding = "DB"
database_name = "patrasaar-db"
database_id = "PASTE_YOUR_D1_ID_HERE"

[[kv_namespaces]]
binding = "CACHE"
id = "PASTE_YOUR_KV_ID_HERE"
preview_id = "PASTE_YOUR_KV_PREVIEW_ID_HERE"
```

### 1c. Run Database Migrations

```bash
# Apply migrations locally first to verify
make db-migrate

# Apply to production D1
make db-migrate-prod
```

### 1d. Set Cloudflare Worker Secrets

These are sensitive values — never commit them to git:

```bash
cd apps/api

wrangler secret put JWT_SECRET
# → Paste your secret (minimum 32 characters)

wrangler secret put GOOGLE_CLIENT_ID
# → Paste from Google Cloud Console

wrangler secret put GOOGLE_CLIENT_SECRET
# → Paste from Google Cloud Console

wrangler secret put OPENROUTER_API_KEY
# → Paste from openrouter.ai/keys

wrangler secret put FRONTEND_URL
# → https://patrasaar.in (your production Vercel URL)
```

For staging, repeat with `--env staging`:

```bash
wrangler secret put FRONTEND_URL --env staging
# → https://staging.patrasaar.in
```

### 1e. Deploy API to Staging

```bash
make deploy-api-staging
# Output: https://patrasaar-api.YOUR_SUBDOMAIN.workers.dev
```

### 1f. Deploy API to Production

```bash
make deploy-api-prod
# Output: https://patrasaar-api.YOUR_SUBDOMAIN.workers.dev
```

Then add a custom domain in the Cloudflare dashboard:
- Workers & Pages → patrasaar-api → Settings → Triggers → Add Custom Domain
- Add: `api.patrasaar.in`

---

## 2. First-Time Vercel Setup

### 2a. Link the Project

```bash
cd apps/web
vercel link
# → Follow prompts: link to existing project or create new
# → Framework: SvelteKit (auto-detected)
# → Root directory: apps/web
```

### 2b. Set Environment Variables in Vercel Dashboard

Go to Vercel Dashboard → patrasaar-web → Settings → Environment Variables:

**Production variables:**

```
PUBLIC_API_URL            = https://api.patrasaar.in
PUBLIC_GOOGLE_CLIENT_ID   = your_google_client_id
GOOGLE_CLIENT_SECRET      = your_google_client_secret
JWT_SECRET                = your_jwt_secret (same as Cloudflare)
```

**Preview (staging) variables:**

```
PUBLIC_API_URL            = https://patrasaar-api.YOUR_SUBDOMAIN.workers.dev
PUBLIC_GOOGLE_CLIENT_ID   = your_google_client_id
GOOGLE_CLIENT_SECRET      = your_google_client_secret
JWT_SECRET                = your_jwt_secret
```

### 2c. Set Custom Domains in Vercel

Go to Vercel Dashboard → patrasaar-web → Settings → Domains:

- Add `patrasaar.in` → assign to **Production** (prod branch)
- Add `staging.patrasaar.in` → assign to **Preview** (master branch)

Update your DNS (in Cloudflare DNS since your domain is likely on Cloudflare):
- `patrasaar.in` → CNAME → `cname.vercel-dns.com`
- `staging.patrasaar.in` → CNAME → `cname.vercel-dns.com`

### 2d. Deploy Web to Production

```bash
make deploy-web-prod
```

---

## 3. Google OAuth Setup

Go to [console.cloud.google.com](https://console.cloud.google.com):

1. Create a new project: `PatraSaar`
2. APIs & Services → OAuth consent screen → External → Fill in app info
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorised JavaScript origins:
     - `https://patrasaar.in`
     - `https://staging.patrasaar.in`
     - `http://localhost:5173`
   - Authorised redirect URIs:
     - `https://patrasaar.in/auth/callback`
     - `https://staging.patrasaar.in/auth/callback`
     - `http://localhost:5173/auth/callback`
4. Copy Client ID and Client Secret → use in all environment variable steps above

---

## 4. OpenRouter Setup

1. Go to [openrouter.ai](https://openrouter.ai) → Sign up
2. Keys → Create API Key → name it `patrasaar-production`
3. The free models (Qwen3, Gemma 4, gpt-oss-120b) require no credits
4. Add the key to Cloudflare secrets as shown in step 1d

---

## 5. Automatic Deployment Setup (prod branch)

This is the most important part. Once configured, pushing to `prod` automatically deploys both services.

### 5a. Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

```
CLOUDFLARE_API_TOKEN        # From Cloudflare → My Profile → API Tokens → Create Token (use "Edit Cloudflare Workers" template)
VERCEL_TOKEN                # From Vercel → Settings → Tokens → Create
VERCEL_ORG_ID               # From Vercel → Settings → General → Team ID (or personal account ID)
VERCEL_PROJECT_ID           # From apps/web/.vercel/project.json after running vercel link
OPENROUTER_API_KEY_TEST     # A separate OpenRouter key for CI tests (can be same key)
CODECOV_TOKEN               # From codecov.io after linking your repo (free for private repos)
OPENAI_API_KEY              # For CodeRabbit AI PR reviews (free tier available without this)
```

### 5b. How the Auto-Deploy Works

The GitHub Actions workflows (already in `.github/workflows/`) handle everything:

**On PR opened/updated:**
1. Lint runs on all packages
2. TypeScript typecheck runs
3. All tests run with coverage
4. CodeRabbit posts AI review comments on the PR
5. Codecov posts coverage diff comment

**On push to `master`:**
1. All CI checks run
2. API deploys to Cloudflare staging
3. Web deploys to Vercel preview (staging URL)

**On push to `prod`:**
1. All CI checks run
2. API deploys to Cloudflare Workers production (`api.patrasaar.in`)
3. Web deploys to Vercel production (`patrasaar.in`)

### 5c. Deploying to Production

To release to production:

```bash
# Option 1: Merge master into prod via GitHub PR (recommended)
# → Open a PR from master → prod on GitHub
# → Review + merge → auto-deploy triggers

# Option 2: Direct push (use only for hotfixes)
git checkout prod
git merge master
git push origin prod
# → Triggers deploy-prod.yml automatically
```

---

## 6. Local Development Setup

Full setup from scratch for a new engineer:

```bash
# Clone the repo
git clone git@github.com:your-org/patrasaar.git
cd patrasaar

# Install dependencies
make install

# Copy environment files
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.env.example apps/web/.env
# → Fill in values from your team's secrets manager

# Run DB migrations locally
make db-migrate

# Start everything (frontend + backend with live reload)
make dev
# → Frontend: http://localhost:5173
# → API:      http://localhost:8787
```

---

## 7. Rollback

### Rollback API (Cloudflare Workers)

```bash
# List recent deployments
wrangler deployments list

# Rollback to a previous deployment
wrangler rollback [DEPLOYMENT_ID]
```

### Rollback Frontend (Vercel)

Go to Vercel Dashboard → patrasaar-web → Deployments → find the last good deployment → click `...` → **Promote to Production**

---

## 8. Monitoring

- **Cloudflare Workers:** Dashboard → Workers & Pages → patrasaar-api → Metrics (requests, errors, CPU time)
- **Vercel:** Dashboard → patrasaar-web → Analytics
- **Error tracking:** Add [Sentry](https://sentry.io) free tier — recommended before going live
- **Uptime:** Add [Better Uptime](https://betteruptime.com) free tier — monitors `api.patrasaar.in/health` and `patrasaar.in`

---

## 9. Cost Estimation at Scale

| Service | Free Limit | Paid Upgrade Trigger |
|---|---|---|
| Cloudflare Workers | 100k req/day | >100k req/day → $5/mo |
| Cloudflare R2 | 10GB storage | >10GB → $0.015/GB |
| Cloudflare Vectorize | 30M dimensions queried/mo | >30M → $0.01/1M |
| Cloudflare D1 | 5M rows | >5M rows → $0.75/M rows |
| Vercel | 100GB bandwidth | >100GB → $20/mo Pro |
| OpenRouter (free models) | Rate-limited | Add credits when hitting limits |

**Estimated cost at 1,000 users/month: ₹0 – ₹500**
