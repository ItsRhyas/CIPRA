.PHONY: help install lint test build clean format

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

clean: ## Remove generated cache directories
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .ruff_cache build dist *.egg-info
