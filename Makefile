.PHONY: dev dev-api dev-web test test-api test-e2e test-watch lint lint-fix typecheck build clean install deploy-api-staging deploy-api-prod deploy-web-prod db-migrate db-migrate-prod db-new-migration

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

## Run e2e tests with UI (headed mode)
test-e2e-ui:
	cd apps/web && pnpm playwright test --ui

## Show last e2e test report
test-e2e-report:
	cd apps/web && pnpm playwright show-report

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
