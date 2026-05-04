# DineOps - Developer README

- **Purpose:** Quick start for contributors and maintainers working on the DineOps codebase.

- **Overview:** DineOps is a restaurant management and ordering platform with a Java/Spring Boot backend and a React + Vite frontend. The repo contains `backend/` (Maven) and `frontend/` (Vite/React + TypeScript).

- **Tech stack (high level):**
  - Backend: Java 21, Spring Boot, JPA/Hibernate, Flyway, Maven
  - Frontend: React 19, Vite, TypeScript, Vitest for unit tests
  - DB: PostgreSQL in production, H2 for tests
  - Infra: Docker / docker-compose, k8s manifests under `k8s/`

- **Local setup (quick):**
  - Backend: run `cd backend` then `./mvnw test` (Windows: `mvnw.cmd test`).
  - Frontend: run `cd frontend` then `npm install` then `npm run dev`.
  - Docker Compose (HTTP): `docker compose up -d --build`.
  - Docker Compose (HTTPS): place certs in `docker/certs/` then run `docker compose --profile tls up -d --build`.

- **Common developer commands:**
  - Build backend: `./mvnw package`
  - Run backend tests: `./mvnw test`
  - Run frontend tests: `cd frontend && npm run test`
  - Lint frontend: `cd frontend && npm run lint`

- **Git hooks (recommended):**
  - This repo includes a pre-commit hook at `.githooks/pre-commit` that runs frontend type-checking.
  - Enable it once per clone with: `git config core.hooksPath .githooks`
  - Test manually with: `.githooks/pre-commit` (or commit normally after enabling).

- **Environment & config:**
  - Backend config files: `backend/src/main/resources/application*.yml` and `backend/target/classes/*.yml` for built profiles.
  - Frontend env: uses `import.meta.env` and `VITE_*` variables.

- **Project layout:**
  - `backend/` — Java source, tests, Dockerfile, Maven wrapper.
  - `frontend/` — React app, tests, Vite config, Playwright e2e.
  - `k8s/` and `docker-compose.yml` — deployment manifests.

- **Testing:** Use `mvnw test` for backend and `npm run test` (Vitest) for frontend. Integration tests may require DB or Docker Compose.

- **Where to look first:** `docs/CODEBASE_EXPLAINED.md` for higher-level architecture notes.

- **Env templates now available:**
  - Local: `.env.local.example`
  - Production baseline: `.env.production.example`
  - Domain preset: `.env.production.sharondsouza.example`

- **Preflight before deployment:**
  - PowerShell: `scripts/preflight-deploy.ps1`
  - Bash: `scripts/preflight-deploy.sh`

- **Runbooks:**
  - Launch checklist: `docs/LAUNCH_CHECKLIST.md`
  - Rollback runbook: `docs/ROLLBACK_RUNBOOK.md`
  - Known issues: `docs/KNOWN_ISSUES.md`
