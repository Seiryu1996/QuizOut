.PHONY: help build up down logs clean test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

up-prod: ## Start services in production mode
	docker-compose -f docker-compose.prod.yml up -d

dev: ## Start services in development mode with logs
	docker-compose up

prod: ## Start services in production mode with logs
	docker-compose -f docker-compose.prod.yml up

down: ## Stop all services
	docker-compose down

logs: ## Show logs for all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

clean: ## Remove all containers, networks, and volumes
	docker-compose down -v --remove-orphans
	docker system prune -f

test-backend: ## Run backend tests
	docker-compose exec backend go test ./...

test-frontend: ## Run frontend tests
	docker-compose exec frontend npm test

lint-backend: ## Run backend linter
	docker-compose exec backend go vet ./...
	docker-compose exec backend go fmt ./...

lint-frontend: ## Run frontend linter
	docker-compose exec frontend npm run lint

setup: ## Initial setup (copy env file)
	cp .env.example .env
	@echo "Please edit .env file with your configuration"

# Firebase Emulator commands
firebase-start: ## Start Firebase emulators
	cd infra/firebase && firebase emulators:start

firebase-data-export: ## Export emulator data
	cd infra/firebase && firebase emulators:export ./emulator-data

firebase-data-import: ## Import emulator data
	cd infra/firebase && firebase emulators:start --import=./emulator-data