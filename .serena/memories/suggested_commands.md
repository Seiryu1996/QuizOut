# Development Commands

## Main Commands (via Makefile)

### Application Management
- `make help` - Show all available commands
- `make build` - Build all Docker images
- `make up` - Start all services in background
- `make dev` - Start services in development mode with logs
- `make down` - Stop all services
- `make clean` - Remove all containers, networks, and volumes

### Development
- `make setup` - Initial setup (copy .env.example to .env)
- `make logs` - Show logs for all services
- `make logs-backend` - Show backend logs only
- `make logs-frontend` - Show frontend logs only

### Testing
- `make test-backend` - Run backend tests
- `make test-frontend` - Run frontend tests

### Code Quality
- `make lint-backend` - Run backend linter (go vet + go fmt)
- `make lint-frontend` - Run frontend linter (next lint)

## Backend-Specific Commands (Go)
- `go test ./...` - Run all tests
- `go vet ./...` - Static analysis
- `go fmt ./...` - Format code
- `go build ./cmd/server` - Build main application
- `go run ./cmd/server/main.go` - Run development server

## Frontend-Specific Commands (npm)
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Firebase Commands
- `make firebase-start` - Start Firebase emulators
- `make firebase-data-export` - Export emulator data
- `make firebase-data-import` - Import emulator data

## Docker Direct Commands
- `docker compose up -d` - Start services in background
- `docker compose logs -f [service]` - Follow logs for specific service
- `docker compose exec [service] [command]` - Execute command in running container

## System Utilities
- Standard Linux commands available: `ls`, `find`, `grep`, `git`, etc.
- All utilities located in `/usr/bin/`