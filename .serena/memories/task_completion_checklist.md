# Task Completion Checklist

## When completing coding tasks, ensure you run the following:

### Backend Tasks (Go)
1. **Code Quality Checks**:
   - `make lint-backend` or `docker compose exec backend go vet ./...`
   - `docker compose exec backend go fmt ./...`

2. **Testing**:
   - `make test-backend` or `docker compose exec backend go test ./...`

3. **Build Verification**:
   - `make build` to ensure Docker images build successfully
   - Or `go build ./cmd/server` for quick build check

### Frontend Tasks (TypeScript/React)
1. **Code Quality Checks**:
   - `make lint-frontend` or `docker compose exec frontend npm run lint`
   - `docker compose exec frontend npm run type-check`

2. **Testing**:
   - `make test-frontend` or `docker compose exec frontend npm test`

3. **Build Verification**:
   - `docker compose exec frontend npm run build`

### Full Application Tasks
1. **Integration Testing**:
   - `make up` - Start all services
   - Verify services are running correctly
   - Check logs with `make logs` if issues occur

2. **Final Verification**:
   - Ensure both frontend (http://localhost:3000) and backend (http://localhost:8080) are accessible
   - Run both test suites: `make test-backend` and `make test-frontend`

## Important Notes
- Always run linting and type checking before committing
- Ensure all tests pass before considering task complete
- For Docker-based development, prefer Make commands over direct npm/go commands
- If modifying Docker configurations, always run `make build` to verify changes