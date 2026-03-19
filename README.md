# DineOps
> Multi-tenant Restaurant Management & Food Ordering SaaS platform

## Architecture
<img width="1408" height="768" alt="DineOps Architecture" src="https://github.com/user-attachments/assets/3df624ee-c5dc-419f-8707-20b9dd1c66e9" />

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Spring Boot | 3.5.11 |
| Language | Java | 21 (LTS) |
| Frontend | React + Vite | 18.x / 5.x |
| CSS | Tailwind CSS | 3.x |
| Database | PostgreSQL | 16 |
| Migrations | Flyway | 10.x |
| Cache / PubSub | Redis | 7 |
| Containerisation | Docker | 29.x |
| Orchestration | Kubernetes (Kind) | 1.29 |
| CI/CD | GitHub Actions + Jenkins | - |
| Code Quality | SonarQube Cloud | Free tier |
| Monitoring | Prometheus + Grafana | - |
| Load Testing | k6 | 0.50.x |
| E2E Testing | Selenium | 4.x |

## Local Development

### Prerequisites
- Docker Desktop with WSL2 Ubuntu integration
- Java 21 (OpenJDK), Node.js 24.x
- Kind, kubectl

### Start local environment
```bash
docker compose up -d
```

### Run backend
```bash
cd backend
./mvnw spring-boot:run
```

Migrations run automatically on Spring Boot startup via Flyway.

## Documentation
See `docs/DineOps_SRS_v1_0.docx` for full Software Requirements Specification.

## Load Testing (k6)
Run the smoke test:
```bash
K6_BASE_URL=http://localhost:8080/api/v1 k6 run k6/smoke-test.js
```

Run the load test:
```bash
K6_BASE_URL=http://localhost:8080/api/v1 k6 run k6/load-test.js
```

More details: `docs/k6-runbook.md`.

## Branch Strategy
- `main` → production-ready only, protected branch
- `develop` → integration branch, all features merge here first
- `feature/*` → one branch per feature (e.g. feature/auth-api)

## Project Board
Tracked on Jira: DOPS Sprint board

## Authentication

Login by sending a POST request:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@dineops.com",
  "password": "yourpassword"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

Use the token in all subsequent requests:
```
Authorization: Bearer <token>
```

## Author
Sharon D'Souza | [github.com/dsouzasharon2k](https://github.com/dsouzasharon2k)
