# PatraSaar Development Makefile

.PHONY: help install run test clean build dev-setup db-migrate db-reset

# Default target
help:
	@echo "PatraSaar Development Commands:"
	@echo "  install     - Install all dependencies"
	@echo "  run         - Start all services with hot reloading"
	@echo "  test        - Run all test suites"
	@echo "  clean       - Clean build artifacts and dependencies"
	@echo "  build       - Build all components"
	@echo "  dev-setup   - Set up development environment"
	@echo "  db-migrate  - Run database migrations"
	@echo "  db-reset    - Reset database and run migrations"

# Install dependencies
install:
	@echo "Installing dependencies..."
	@pnpm install
	@cd backend && go mod download
	@echo "Dependencies installed successfully!"

# Development setup
dev-setup: install
	@echo "Setting up development environment..."
	@mkdir -p logs tmp
	@echo "Development environment ready!"

# Run all services with hot reloading
run:
	@echo "Starting PatraSaar development environment..."
	@echo "Starting services in parallel..."
	@make -j3 run-frontend run-backend run-worker

run-frontend:
	@echo "Starting frontend with hot reloading..."
	@cd frontend && pnpm run dev

run-backend:
	@echo "Starting backend with hot reloading..."
	@cd backend && go run cmd/api/main.go

run-worker:
	@echo "Starting worker with hot reloading..."
	@cd backend && go run cmd/worker/main.go

# Run tests
test:
	@echo "Running all test suites..."
	@make test-frontend test-backend

test-frontend:
	@echo "Running frontend tests..."
	@cd frontend && pnpm run test

test-backend:
	@echo "Running backend tests..."
	@cd backend && go test ./...

test-coverage:
	@echo "Running tests with coverage..."
	@cd frontend && pnpm run test:coverage
	@cd backend && go test -coverprofile=coverage.out ./...
	@cd backend && go tool cover -html=coverage.out -o coverage.html

# Build all components
build:
	@echo "Building all components..."
	@make build-frontend build-backend

build-frontend:
	@echo "Building frontend..."
	@cd frontend && pnpm run build

build-backend:
	@echo "Building backend..."
	@cd backend && go build -o ../bin/api ./cmd/api
	@cd backend && go build -o ../bin/worker ./cmd/worker

# Database operations
db-migrate:
	@echo "Running database migrations..."
	@cd backend && go run -tags migrate cmd/migrate/main.go up

db-reset:
	@echo "Resetting database..."
	@cd backend && go run -tags migrate cmd/migrate/main.go down
	@cd backend && go run -tags migrate cmd/migrate/main.go up

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf frontend/.next
	@rm -rf frontend/dist
	@rm -rf frontend/node_modules/.cache
	@rm -rf backend/tmp
	@rm -rf bin
	@rm -rf logs/*.log
	@echo "Clean completed!"

clean-all: clean
	@echo "Cleaning all dependencies..."
	@rm -rf frontend/node_modules
	@rm -rf .pnpm-store
	@cd backend && go clean -modcache
	@echo "All dependencies cleaned!"

# Linting and formatting
lint:
	@echo "Running linters..."
	@cd frontend && pnpm run lint
	@cd backend && go vet ./...
	@cd backend && go fmt ./...

# Development utilities
logs:
	@echo "Showing recent logs..."
	@tail -f logs/*.log 2>/dev/null || echo "No log files found"

ps:
	@echo "Showing running processes..."
	@ps aux | grep -E "(next|go run|node)" | grep -v grep

kill:
	@echo "Stopping all development processes..."
	@pkill -f "next dev" || true
	@pkill -f "go run" || true
	@echo "All processes stopped!"

# Quick development commands
dev: dev-setup run

restart: kill run

status:
	@echo "Development environment status:"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:8080"
	@echo "Backend Health: http://localhost:8080/health"