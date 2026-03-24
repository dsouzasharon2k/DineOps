# DineOps

[![CI](https://github.com/dsouzasharon2k/DineOps/actions/workflows/ci.yml/badge.svg)](https://github.com/dsouzasharon2k/DineOps/actions/workflows/ci.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=dsouzasharon2k_DineOps&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=dsouzasharon2k_DineOps)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=dsouzasharon2k_DineOps&metric=coverage)](https://sonarcloud.io/summary/new_code?id=dsouzasharon2k_DineOps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Java 21](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk)](https://openjdk.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?logo=springboot)](https://spring.io/projects/spring-boot)

> Multi-tenant Restaurant Management & Food Ordering SaaS. Built with Spring Boot, React, PostgreSQL, Redis, Kubernetes, and GitHub Actions.

---

## What Is DineOps?

Restaurants typically operate across three disconnected audiences at once: a **customer** browsing a menu on their phone, a **kitchen team** watching for new orders, and an **admin** managing menus, staff, and billing — often with no single system tying it together.

DineOps is a multi-tenant SaaS platform that covers all three. Each restaurant (tenant) gets isolated data, role-based access, and a public ordering URL. Orders placed by customers appear on the kitchen Kanban board in real time over WebSocket. Admins control menus, operating hours, and staff accounts from a single dashboard. A subscription layer enforces per-plan monthly order limits so the platform can be offered on multiple tiers.

The project was built to explore what it takes to go from a working CRUD app to something production-shaped: multi-tenancy, real-time infrastructure, CI quality gates, observability, and compliance (DPDP right-to-erasure).

---

## Screenshots

| Public Menu | Dashboard | Kitchen View |
|:---:|:---:|:---:|
| [![Public Menu](https://placehold.co/600x350/0f172a/f97316?text=Public+Menu)](docs/screenshots/public-menu.png) | [![Dashboard](https://placehold.co/600x350/0f172a/f97316?text=Dashboard)](docs/screenshots/dashboard.png) | [![Kitchen](https://placehold.co/600x350/0f172a/f97316?text=Kitchen+View)](docs/screenshots/kitchen.png) |
| Customer ordering flow | Tenant metrics & management | Real-time order queue |

---

## Architecture

<img width="1408" height="768" alt="DineOps Architecture" src="https://github.com/user-attachments/assets/3df624ee-c5dc-419f-8707-20b9dd1c66e9" />

**React SPA (frontend)** — Vite-bundled React 19 app served as a static build. Communicates with the backend over REST for data mutations and a STOMP WebSocket connection for real-time order events. Zustand manages cart state reactively with `localStorage` persistence.

**Spring Boot API (backend)** — Stateless REST API behind a JWT auth filter. A `TenantAuthorizationFilter` validates the tenant claim on every authenticated request to prevent cross-tenant data access. Business logic is layered: controllers handle HTTP, services own the rules, repositories own persistence. Operating hours validation, subscription enforcement, and PII deletion scheduling all live in the service layer — not the controller.

**PostgreSQL + Flyway** — Single database, all tenants in shared tables differentiated by `tenant_id`. Flyway runs migrations automatically on startup, so schema history is committed alongside code. No manual SQL, no drift between environments.

**Redis (two roles)** — Acts as a cache for hot reads (menu items, restaurant details) and as a pub/sub broker for WebSocket fan-out. When an order status changes, the backend publishes to a Redis channel; a subscriber pushes the event over WebSocket to the relevant kitchen and customer connections without any polling.

**Kubernetes (Kind)** — Full k8s locally using Kind. Backend and frontend run as Deployments with readiness/liveness probes, resource requests and limits, and a `LimitRange` + `ResourceQuota` on the namespace. The same manifests run in any standard k8s cluster — Kind is just the local runtime.

**GitHub Actions (CI)** — Three parallel jobs: frontend lint/test/build, Playwright E2E, and backend verify + SonarCloud scan. JaCoCo and SonarCloud quality gates must pass before a PR can merge.

---

## Performance Highlights

| Metric | Result |
|--------|--------|
| k6 p(95) latency — all endpoints | < 500ms |
| k6 p(95) latency — order placement | < 1000ms |
| k6 error rate threshold | < 5% |
| CI pipeline (lint → test → coverage → E2E → SonarCloud) | ✅ Passing |
| Backend test files | 17 (unit + integration) |
| E2E test specs (Chromium + Firefox) | 4 scenarios |
| Kubernetes namespace pod quota | Up to 20 pods |
| Backend replicas (baseline) | 2 |

---

## Engineering Decisions

| Decision | Why |
|----------|-----|
| **Redis for caching + pub/sub** | Menu and order reads served from cache; WebSocket messages pushed via Redis pub/sub — no polling, sub-100ms fan-out to kitchen and customer clients |
| **Flyway for DB migrations** | Schema changes are versioned, auditable, and applied automatically on deploy — no manual SQL or human error |
| **Tenant isolation via JWT + filter** | `TenantAuthorizationFilter` validates tenant claim on every request post-auth — avoids shared-data leaks without separate schemas at this scale |
| **httpOnly refresh cookie** | Access token in memory; refresh token in httpOnly cookie — XSS cannot steal a long-lived token |
| **Zustand for cart state** | Plain ES module cart had no reactivity — cart icon wouldn't update across components. Zustand with `persist` gives reactive + localStorage-backed state in one call |
| **Kind for local Kubernetes** | Full k8s API locally (namespace quotas, resource limits, probes) without a cloud bill — manifests deploy identically to production |
| **JaCoCo coverage gate in CI** | Failing coverage blocks merge (45% line / 25% branch) — enforces tests before code hits `main`, not as an afterthought |
| **SonarCloud quality gate in CI** | Failing quality gate blocks merge — code smells and security hotspots caught before review |
| **Operating hours enforced on backend** | Validation in `OrderService.placeOrder()` not just the UI — closing the restaurant in the frontend doesn't stop a direct API call |
| **Scheduled PII deletion (DPDP)** | `DELETE /users/me` schedules a 7-day grace period; a `@Scheduled` job at 2 AM anonymizes name, email, phone, and password hash — DPDP right-to-erasure compliant |

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Spring Boot | 3.5.11 |
| Language | Java | 21 (LTS) |
| Frontend | React + Vite | 19.2 / 7.3 |
| State | Zustand | 5.x |
| CSS | Tailwind CSS | 4.2 |
| Database | PostgreSQL | 16 |
| Migrations | Flyway | 10.x |
| Cache / Pub-Sub | Redis | 7 |
| Real-time | WebSocket (STOMP) | - |
| Containerisation | Docker | 29.x |
| Orchestration | Kubernetes (Kind) | 1.29 |
| CI/CD | GitHub Actions | - |
| Code Quality | SonarCloud | Free tier |
| Monitoring | Prometheus + Grafana | - |
| Load Testing | k6 | 0.50.x |
| E2E Testing | Playwright | 1.55 |

---

## CI/CD Pipeline

```
push / PR → main or develop
│
├── frontend-ci   → lint → unit tests + coverage → build
│
├── frontend-e2e  → Playwright (Chromium + Firefox)
│
└── build-and-test
        ├── ./mvnw clean verify   (unit + integration + JaCoCo gate)
        └── SonarCloud scan       (quality + coverage gate blocks merge)
```

---

## Quick Start

### Prerequisites

- **Docker Desktop** (with WSL2 on Windows)
- **Java 21** (OpenJDK)
- **Node.js 20+**

### 1. Clone and configure

```bash
git clone https://github.com/dsouzasharon2k/DineOps.git
cd DineOps

cp .env.example .env
# Set: POSTGRES_PASSWORD, DB_PASSWORD, JWT_SECRET, GF_SECURITY_ADMIN_PASSWORD
```

### 2. Start infrastructure

```bash
docker compose up -d
# Starts: PostgreSQL, Redis, Grafana
```

### 3. Run backend

```bash
cd backend
./mvnw spring-boot:run
# Flyway migrations run automatically
# API: http://localhost:8080
```

### 4. Run frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

---

## Key Features

- **Multi-tenant** — Restaurant data isolation, role-based access (SUPER_ADMIN, TENANT_ADMIN, STAFF)
- **Public ordering** — Customer menu, reactive cart (Zustand), checkout, real-time order tracking
- **Real-time kitchen** — WebSocket (STOMP) pushes order updates to kitchen and customer simultaneously
- **Operating hours** — Enforced at the API level, not just the UI; returns 400 when restaurant is closed
- **DPDP compliance** — Scheduled PII anonymization with 7-day grace period on user deletion request
- **Subscriptions** — Per-plan monthly order limits enforced before order placement
- **Security hardening** — Rate limiting, account lockout, httpOnly refresh cookies, CSP, HSTS
- **Observability** — Prometheus metrics, Grafana dashboards, structured JSON logging with MDC correlation

---

## API Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@dineops.com",
  "password": "yourpassword"
}
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

`Authorization: Bearer <token>` — Access tokens are short-lived (24h); use `POST /api/v1/auth/refresh` with the httpOnly cookie for rotation.

---

## Load Testing (k6)

```bash
# Smoke test — 1 VU, sanity check
K6_BASE_URL=http://localhost:8080/api/v1 k6 run k6/smoke-test.js

# Load test — 10 VUs, 2 min, p(95)<500ms threshold
K6_BASE_URL=http://localhost:8080/api/v1 k6 run k6/load-test.js
```

Thresholds enforced: `p(95) < 500ms` (all), `p(95) < 1000ms` (order placement), `error_rate < 5%`.

---

## Project Structure

```
├── backend/          # Spring Boot API (Java 21)
├── frontend/         # React 19 + Vite SPA
├── db/migrations/    # Flyway SQL (canonical schema history)
├── k6/               # Load and smoke tests
├── k8s/              # Kubernetes manifests (Kind-tested)
├── monitoring/       # Prometheus + Grafana config
└── docs/             # Architecture, runbooks, design docs
```

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready, protected |
| `develop` | Integration branch |
| `feat/*` | Features (e.g. `feat/DOPS-125-operating-hours`) |
| `fix/*` | Bug fixes |
| `chore/*` | Config, infra, tooling |

---

## Challenges and What I Learned

**Multi-tenancy without separate databases.** The obvious approach is one database per tenant — clean isolation, simple queries. But it doesn't scale operationally. The harder thing was enforcing isolation in a shared schema: every repository query must be scoped to a tenant ID, and the auth filter has to validate that the JWT's tenant claim matches the resource being accessed. Getting this wrong at any layer leaks one tenant's data to another. Adding a `TenantAuthorizationFilter` that runs before every protected endpoint and centralises that check was the clean solution.

**WebSocket with Redis pub/sub.** Naive real-time: poll every 2 seconds. It works, it hammers the database, and it doesn't scale. The production pattern is pub/sub — the backend publishes an event when order state changes, a subscriber delivers it over WebSocket to the right client. The tricky part was authentication: WebSocket connections don't carry HTTP headers the same way, so JWT validation had to happen at the STOMP connection handshake, not per-message.

**Cart state reactivity.** The original cart was a plain ES module with a `Map` — it worked, but updating the cart on one component didn't re-render the cart icon on the navbar. The root cause was that React's render cycle doesn't know about mutations to a plain object. Migrating to Zustand with `persist` middleware gave reactive state (components subscribe to slices), `localStorage` persistence, and per-tenant cart isolation without rewiring every component.

**JaCoCo coverage as a gate, not a report.** Setting a coverage threshold that fails the build changes the relationship with testing. When coverage is just a number in a report, it drifts. When it blocks the pipeline, every new feature needs tests to ship. The challenge was picking a threshold that was honest (not aspirational) — 45% line / 25% branch reflects the actual current state, not a target that breaks CI on day one.

**DPDP right-to-erasure without immediate deletion.** A user requesting account deletion can't be immediately wiped — there's a grace period, potential dispute resolution, and audit requirements. The solution was to split deletion into two stages: `DELETE /users/me` schedules deletion (sets `deletion_scheduled_for = now + 7 days`, marks account inactive), and a `@Scheduled` job at 2 AM finds users past their scheduled date and anonymises name, email, phone, and password hash. This is the pattern real compliance-aware systems use — I learned it's not just about running a DELETE query.

---

## Author

**Sharon D'Souza** · [github.com/dsouzasharon2k](https://github.com/dsouzasharon2k)
