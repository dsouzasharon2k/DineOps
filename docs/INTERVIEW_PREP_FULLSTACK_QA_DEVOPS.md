# Interview Prep — Full-Stack, QA Automation, DevOps

This pack gives concise, practical answers based on what is implemented in DineOps.

---

## Full-Stack Round (Sample Q&A)

### Q1) How did you implement multi-tenancy safely?
**Answer:**  
I used shared tables with `tenant_id` partitioning and enforced tenant scope at multiple layers: JWT carries tenant context, a tenant authorization filter validates access, and service/repository calls are tenant-scoped. This prevents cross-tenant data access without operational overhead of one DB per tenant.

### Q2) Why did you choose WebSocket + Redis pub/sub instead of polling?
**Answer:**  
Polling increases DB/API load and adds latency. WebSocket gives push-based realtime UX, while Redis pub/sub decouples event producers from websocket sessions. When order status changes, backend publishes once and relevant clients receive updates quickly.

### Q3) How did you make the app production-safe?
**Answer:**  
I added fail-fast startup validation, security headers, strict environment checks, provider validation, Sentry error tracking, uptime monitoring, and deployment preflight scripts. The objective was to shift failures left and avoid silent misconfiguration in production.

### Q4) How do you handle schema evolution?
**Answer:**  
I use Flyway migrations versioned in git. Every schema change is explicit, reproducible, and applied in deployment order. This keeps environments consistent and avoids ad-hoc SQL drift.

### Q5) What was a complex frontend issue you solved?
**Answer:**  
Path-based deployment under `/dineops` broke static assets, router paths, and service worker behavior. I updated Vite base path, router basename, manifest/service worker URLs, and reverse-proxy routing so app, API, and websocket all work under subpath hosting.

---

## QA Automation Round (Sample Q&A)

### Q1) What does your test pyramid look like?
**Answer:**  
Backend unit + integration tests for business rules, frontend unit tests for UI logic/components, Playwright e2e for critical flows, and k6 for performance thresholds. CI enforces these checks before merge.

### Q2) How did you improve flaky tests?
**Answer:**  
I replaced brittle exact-text selectors with resilient queries, updated mocks to match real multi-API page dependencies, and avoided assertions that fail on repeated text instances in dynamic UIs.

### Q3) What do you gate in CI?
**Answer:**  
Lint, TypeScript typecheck, unit tests, coverage, e2e tests, secret scan, vulnerability scan, and load/performance checks. CI is configured to fail fast on quality or security issues.

### Q4) How do you validate non-functional behavior?
**Answer:**  
I use k6 scripts with thresholds (latency + error rate) and run authenticated dashboard scenarios to emulate real user behavior, not just synthetic anonymous endpoint hits.

---

## DevOps Round (Sample Q&A)

### Q1) What did you do for observability?
**Answer:**  
Integrated Sentry for frontend/backend exceptions, exposed Prometheus metrics via Actuator, provisioned Grafana dashboards, and added active uptime monitoring with email/Slack/WhatsApp alert channels.

### Q2) How do you prevent bad deploys?
**Answer:**  
Preflight scripts validate production env before deploy (secrets, provider mode, URLs, TLS certs, monitoring files, alert channels). Backend also fails startup in prod if critical config is unsafe.

### Q3) How would you roll back safely?
**Answer:**  
I documented rollback runbook: freeze rollout, capture logs, redeploy last known good version, verify health/smoke flows, and restore DB from backup if migration/data issue requires it.

### Q4) How do you secure containers and edge traffic?
**Answer:**  
I hardened Dockerfiles with health checks and runtime settings, configured Nginx security headers/CSP/HSTS, and added image vulnerability scanning in CI via Trivy.

---

## Strong STAR Stories (Use in behavioral rounds)

### Story 1 — "Production blocker reduction"
- **Situation:** Local success didn’t guarantee production safety due to env/provider drift.
- **Task:** Reduce avoidable deploy/runtime failures.
- **Action:** Added preflight validators + backend fail-fast production config checks + runbooks.
- **Result:** Misconfiguration is now caught before or at startup, dramatically reducing silent runtime breakage.

### Story 2 — "Realtime and scale"
- **Situation:** Polling-based order updates would not scale and hurt UX.
- **Task:** Build low-latency realtime order updates.
- **Action:** Implemented STOMP/SockJS + Redis pub/sub with reconnect handling.
- **Result:** Kitchen/customer views receive faster updates with reduced backend polling load.

### Story 3 — "Test reliability under rapid feature growth"
- **Situation:** New dashboard features broke existing unit tests due to stale mocks and brittle selectors.
- **Task:** Stabilize test suite and restore CI confidence.
- **Action:** Reworked test mocks to align with real dependencies and improved selector robustness.
- **Result:** Tests returned to green and became more resilient to UI iteration.

---

## Questions you should ask interviewers
- How do you separate product analytics tracking from core transactional logic?
- What is your current deployment preflight/rollback maturity level?
- Which test layers are mandatory in your CI pipeline and why?
- How do you detect and triage regressions after release?
