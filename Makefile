.PHONY: help install lint test build clean format docker-build docker-up docker-down frontend-install frontend-dev frontend-build frontend-lint

help: ## Show available commands
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install Python dependencies in editable mode
	pip install -e ./backend[dev]

lint: ## Run the linter
	ruff check backend

format: ## Format code and auto-fix safe lint issues
	ruff format backend
	ruff check --fix backend

test: ## Run the test suite
	pytest backend

build: ## Build the backend Docker image
	docker compose build

docker-build: build  ## Build the backend Docker image (alias for build)

docker-up: ## Start the backend with Docker Compose
	docker compose up -d

docker-down: ## Stop and remove Docker Compose containers
	docker compose down

frontend-install: ## Install frontend dependencies
	cd frontend && npm ci

frontend-dev: ## Start the Next.js development server
	cd frontend && npm run dev

frontend-build: ## Build the Next.js production bundle
	cd frontend && npm run build

frontend-lint: ## Lint the frontend source
	cd frontend && npm run lint

clean: ## Remove generated cache directories
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .ruff_cache build dist *.egg-info
