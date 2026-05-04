# Production Governance Checklist

## 1. Promotion Gates

- [ ] CI green on main branch: frontend lint/test/build + backend verify.
- [ ] Security checks reviewed (dependency updates, secret scans, vulnerability triage).
- [ ] Migration impact reviewed and approved.
- [ ] Release candidate images pinned by immutable SHA digest.

## 2. Rollback Readiness

- [ ] Previous stable image digests recorded for backend and frontend.
- [ ] Rollback command documented and tested in staging.
- [ ] Database rollback strategy documented (forward-fix preferred for Flyway).
- [ ] On-call owner assigned for release window.

## 3. Secret Lifecycle

- [ ] Secrets managed outside repository (.env not used in production).
- [ ] Rotation interval defined for JWT, webhook shared secrets, payment keys, DB credentials.
- [ ] Secret rotation playbook tested in non-prod.
- [ ] Access to secrets restricted to least privilege.

## 4. Runtime and Observability

- [ ] TLS active at edge/ingress for all public endpoints.
- [ ] Alert routing verified for backend down, 5xx spikes, DB pool saturation.
- [ ] Dashboard links and runbooks shared with on-call team.

## 5. Resilience Validation

- [ ] Rate-limit negative paths tested.
- [ ] Webhook replay/idempotency tests passing.
- [ ] Dependency outage behavior (DB/Redis/payment provider) validated in staging.

## Release Approval

- Approved by Product:
- Approved by Engineering:
- Approved by Security:
- Approved by Operations:
- Date:
