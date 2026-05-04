# Rollback Runbook (v1.0)

Use this when production deployment introduces critical regressions.

## Severity trigger
Start rollback immediately if any of these happen for >5 minutes:
- Login/checkout outage
- Payment failures > 10%
- Backend health DOWN
- Data corruption risk

## 1) Freeze rollout
1. Stop new deploy attempts.
2. Notify team channel: "Rollback in progress."

## 2) Capture diagnostics (before rollback)
```bash
docker compose ps
docker compose logs --since=15m backend > rollback-backend.log
docker compose logs --since=15m frontend > rollback-frontend.log
```

## 3) Rollback application image/version

### Option A: Previous git tag/commit (recommended)
```bash
git fetch --all --tags
git checkout <last-known-good-tag-or-commit>
docker compose up -d --build
```

### Option B: Rebuild from previous branch ref
```bash
git checkout <release-branch-ref>
docker compose up -d --build
```

## 4) Database rollback strategy

Flyway migrations are forward-only in production by default.

- If the release had **no destructive migration**, rollback app code first and keep DB as-is.
- If release introduced **breaking schema/data change**, execute a recovery path:
  1. Stop writes (maintenance mode/restrict traffic)
  2. Restore latest known-good backup
  3. Bring app up on matching code version

### Backup restore example
```bash
# Restore from backup.sql to postgres container
docker exec -i dineops-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < backup.sql
```

## 5) Post-rollback verification
- [ ] `GET /actuator/health` returns UP
- [ ] Login works
- [ ] Place order works
- [ ] Payment flow works
- [ ] Realtime updates work
- [ ] Error rate back to baseline

## 6) Incident closure
1. Record root cause and timeline.
2. Open follow-up fix ticket.
3. Update `docs/KNOWN_ISSUES.md` if new pattern discovered.
4. Schedule a controlled re-release window.

## Fast commands reference
```bash
# current status
docker compose ps

# restart services on current code
docker compose up -d --build

# inspect backend logs
docker compose logs -f backend

# inspect frontend logs
docker compose logs -f frontend
```
