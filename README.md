# DineOps

Multi-tenant Restaurant Management & Food Ordering SaaS platform.

## Tech Stack
- **Backend:** Spring Boot 3, Java 21, Spring Security, Spring Data JPA
- **Frontend:** React 18, Vite, Tailwind CSS
- **Database:** PostgreSQL 16 (Flyway migrations)
- **Cache:** Redis 7
- **DevOps:** Docker, Kubernetes (Kind), GitHub Actions, Prometheus, Grafana
- **Testing:** Selenium, k6

## Local Development

### Prerequisites
- Docker Desktop with WSL2 integration
- Java 21, Node.js, Kind, kubectl

### Start local environment
```bash
docker compose up -d
```

### Run database migrations
Migrations run automatically on Spring Boot startup via Flyway.

## Architecture
See `docs/architecture.md` for full system design.

## Branch Strategy
- `main` → production-ready only
- `develop` → integration branch
- `feature/*` → one branch per feature
