Here's the full execution plan renumbered to match the Master DOPS Checklist (Jira) IDs from lines 1784-1853:

---

### Phase 1 — Compile & Boot (Day 1, ~1 hr)

| # | Ticket | What | Why first |
|---|--------|------|-----------|
| 1 | DOPS-049 | Fix RestaurantService constructor | App won't compile |
| 2 | DOPS-050 | Fix MenuItemController return var | App won't compile |
| 3 | DOPS-051 | Fix Restaurant status default + enum | Data corruption on every insert |

**Gate**: App compiles and starts.

---

### Phase 2 — Stop the Bleeding: Critical Security (Day 1-2, ~3 hrs)

| # | Ticket | What | Why now |
|---|--------|------|---------|
| 4 | DOPS-052 | Hide password hash (@JsonIgnore) | BCrypt hashes in every response with a User |
| 5 | DOPS-053 | Externalize secrets to .env | Hardcoded DB/JWT secrets in source control |

**Gate**: No secrets in code, no password hashes in responses.

---

### Phase 3 — Backend Foundation (Week 1, ~12 hrs)

| # | Ticket | What | Dependency reason |
|---|--------|------|-------------------|
| 6 | DOPS-059 | Global exception handler (@ControllerAdvice) | All future error handling routes through this |
| 7 | DOPS-060 | Bean Validation on all DTOs | Works with exception handler for 422s |
| 8 | DOPS-063 | JPA auditing (AuditableEntity) | All entities get consistent timestamps |
| 9 | DOPS-066 | Order status transition validation | Core business logic — prevents invalid state changes |
| 10 | DOPS-064 | Response DTOs | Decouples entities from API; every future endpoint benefits |
| 11 | DOPS-065 | Structured logging | Observability needed before heavier changes |

**Gate**: Clean errors, validated inputs, proper DTOs, consistent timestamps, structured logs.

---

### Phase 4 — Auth & Tenant Security (Week 2, ~11 hrs)

| # | Ticket | What | Dependency reason |
|---|--------|------|-------------------|
| 12 | DOPS-113 | Block inactive logins | Backend-only, low risk |
| 13 | DOPS-114 | BCryptPasswordEncoder as Spring bean | Refactor-only, no behavior change |
| 14 | DOPS-054 | Tenant isolation (fix IDOR) | **Most critical auth bug** — any user can access any tenant |
| 15 | DOPS-055 | Restrict actuator/swagger | Leaks DB status, disk info to anonymous users |
| 16 | DOPS-057 | Security response headers | Quick win, defense in depth |
| 17 | DOPS-067 | User registration endpoint | Unlocks self-service; needed before frontend auth work |

**Gate**: Tenant isolation enforced, actuator locked down, users can register.

---

### Phase 5 — Frontend Foundation (Week 2-3, ~14 hrs)

| # | Ticket | What | Dependency reason |
|---|--------|------|-------------------|
| 18 | DOPS-073 | Remove boilerplate CSS, fix layouts | Clean canvas for all future UI work |
| 19 | DOPS-075 | API base URL env variable | 30 min, unblocks Docker/prod deployment |
| 20 | DOPS-074 | TypeScript interfaces for all entities | Every future component benefits from types |
| 21 | DOPS-070 | AuthContext + remove hardcoded tenant IDs | Dashboard currently only works for one restaurant |
| 22 | DOPS-076 | Axios 401 interceptor + toast errors | Global error handling before building more pages |
| 23 | DOPS-079 | React error boundaries | Prevents white-screen crashes |
| 24 | DOPS-078 | Lucide icons + 404 page | Replace emoji nav, catch bad routes |
| 25 | DOPS-077 | Loading skeletons + empty states | Polish that makes everything feel complete |

**Gate**: Frontend has types, auth context, error handling, polished UX patterns.

---

### Phase 6 — Advanced Security (Week 3, ~11 hrs)

| # | Ticket | What | Dependency reason |
|---|--------|------|-------------------|
| 26 | DOPS-056 | Rate limiting (Redis-backed) | Prevents brute-force and order flooding |
| 27 | DOPS-058 | Account lockout on failed logins | Complement to rate limiting, both use Redis |
| 28 | DOPS-068 | JWT refresh tokens | Must exist before token storage hardening |
| 29 | DOPS-115 | Token storage hardening (localStorage -> httpOnly) | **Depends on DOPS-068** — biggest auth UX change |

**Gate**: Login abuse mitigated, tokens properly managed and stored.

---

### Phase 7 — Caching, Pagination, DevOps (Week 3-4, ~14 hrs)

| # | Ticket | What |
|---|--------|------|
| 30 | DOPS-062 | Redis caching for menu/restaurant data |
| 31 | DOPS-061 | Pagination on all list endpoints |
| 32 | DOPS-089 | Configurable CORS for production |
| 33 | DOPS-090 | HikariCP connection pool config |
| 34 | DOPS-085 | Frontend in Docker Compose + K8s manifests |
| 35 | DOPS-086 | Resource limits + JVM flags |
| 36 | DOPS-088 | Frontend CI pipeline (lint, test, build) |

**Gate**: System handles load, full Docker stack works, CI covers frontend.

---

### Phase 8 — Testing Foundation (Week 4-5, ~17 hrs)

| # | Ticket | What | Dependency reason |
|---|--------|------|-------------------|
| 37 | DOPS-116 | Isolate test DB from dev | Must exist before integration tests |
| 38 | DOPS-092 | Service unit tests (Order, Menu, Auth, JWT) | Fast feedback loop |
| 39 | DOPS-091 | Integration tests with Testcontainers | Real DB/Redis validation |
| 40 | DOPS-094 | Frontend component tests (MSW) | Covers dashboard, menu, cart |
| 41 | DOPS-095 | Coverage thresholds in CI | Enforces quality going forward |

**Gate**: Solid test coverage, CI enforces minimums.

---

### Phase 9 — Restaurant Onboarding & Core Features (Week 5-6, ~17 hrs)

| # | Ticket | What |
|---|--------|------|
| 42 | DOPS-100 | FSSAI & GST fields on restaurant |
| 43 | DOPS-069 | Restaurant onboarding wizard |
| 44 | DOPS-082 | Order status history tracking |
| 45 | DOPS-101 | Table management + QR codes |
| 46 | DOPS-102 | Customer order cancellation |
| 47 | DOPS-103 | Restaurant contact info on public pages |

---

### Phase 10 — Payment & Financial (Week 6-7, ~14 hrs)

| # | Ticket | What |
|---|--------|------|
| 48 | DOPS-071 | Payment integration (Razorpay/Stripe) |
| 49 | DOPS-072 | GST/tax calculation + PDF invoicing |

---

### Phase 11 — Data & Analytics (Week 7-8, ~13 hrs)

| # | Ticket | What |
|---|--------|------|
| 50 | DOPS-083 | Audit log (AOP-based) |
| 51 | DOPS-084 | Analytics dashboard (Recharts) |
| 52 | DOPS-104 | Phone-based order lookup |

---

### Phase 12 — Real-time & Polish (Week 8-9, ~19 hrs)

| # | Ticket | What |
|---|--------|------|
| 53 | DOPS-080 | WebSocket for real-time order updates |
| 54 | DOPS-081 | Notification system (email/SMS) |
| 55 | DOPS-096 | DB indexes + CHECK constraints |
| 56 | DOPS-097 | updated_at PostgreSQL trigger |
| 57 | DOPS-093 | E2E tests with Playwright |

---

### Phase 13 — Compliance & Legal (Week 9-10, ~14 hrs)

| # | Ticket | What |
|---|--------|------|
| 58 | DOPS-098 | Privacy policy + Terms of Service |
| 59 | DOPS-099 | Data deletion / account anonymization |
| 60 | DOPS-087 | Database backup strategy |
| 61 | DOPS-109 | Accessibility (ARIA, keyboard, contrast) |

---

### Phase 14 — Growth Features (Week 10+, ~21 hrs)

| # | Ticket | What |
|---|--------|------|
| 62 | DOPS-105 | Customer ratings & reviews |
| 63 | DOPS-106 | Estimated prep time |
| 64 | DOPS-107 | Inventory management |
| 65 | DOPS-108 | Subscription/billing for tenants |

---

## Key Dependency Chain (Jira IDs)

```
DOPS-049/050/051 (compiles)
  → DOPS-052/053 (secure)
    → DOPS-059/060 (error handling + validation)
      → DOPS-064 (DTOs)
        → DOPS-054 (tenant isolation)
          → DOPS-067 (registration)
            → DOPS-070 (frontend auth context)
              → DOPS-068 (refresh tokens)
                → DOPS-115 (token storage hardening)
```

---

## Suggested New Tickets

| Ticket | What | Phase |
|--------|------|-------|
| DOPS-117 | Remove legacy Selenium setup (after Playwright in DOPS-093) | 12 |
| DOPS-118 | Soft delete strategy for entities (deleted_at column) | 3 |
| DOPS-119 | API documentation alignment with DTOs (@Schema annotations) | 7 |

---

## Already Done (skip these)

| Ticket | What |
|--------|------|
| DOPS-110 | k6 base URL cleanup |
| DOPS-111 | Backend non-root container |
| DOPS-112 | Nginx hardening |

Want me to update `TICKETS.md` with this revised plan baked in, or shall we start executing Phase 1?