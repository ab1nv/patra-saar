.PHONY: install dev test test-coverage build lint typecheck format clean docker-up docker-down db-migrate help

# Default target
help:
	@echo "PatraSaar Development Commands"
	@echo ""
	@echo "  make install        Install all dependencies"
	@echo "  make dev            Start dev servers (API + Web)"
	@echo "  make test           Run all tests"
	@echo "  make test-coverage  Run tests with coverage"
	@echo "  make build          Build all packages"
	@echo "  make lint           Run linters"
	@echo "  make typecheck      Run TypeScript type checking"
	@echo "  make format         Format code with Prettier"
	@echo "  make db-migrate     Run D1 migrations locally"
	@echo "  make docker-up      Start Docker dev environment"
	@echo "  make docker-down    Stop Docker dev environment"
	@echo "  make clean          Remove node_modules and build artifacts"

install:
	npm install

dev:
	npx turbo dev

test:
	npx turbo test

test-coverage:
	npx turbo test:coverage

build:
	npx turbo build

lint:
	npx turbo lint

typecheck:
	npx turbo typecheck

format:
	npx prettier --write "**/*.{ts,tsx,js,jsx,json,md,css}"

db-migrate:
	cd apps/api && npx wrangler d1 execute patrasaar-db --local --file=./src/db/schema.sql

docker-up:
	docker compose up --build

docker-down:
	docker compose down

clean:
	npx turbo clean
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
