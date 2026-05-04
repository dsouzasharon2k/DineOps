# Launch Checklist (v1.0)

## 0) Final code readiness
- [ ] Backend compiles: `./mvnw -q -DskipTests compile`
- [ ] Frontend type-check passes: `npm run typecheck` (inside `frontend`)
- [ ] Unit tests green (`backend` + `frontend`)

## 1) Environment and secrets
- [ ] Copy env template:
  - `cp .env.production.sharondsouza.example .env`
- [ ] Fill all `replace_with_*` placeholders
- [ ] Set secure values for:
  - `JWT_SECRET`
  - `POSTGRES_PASSWORD`, `DB_PASSWORD`, `REDIS_PASSWORD`
  - `GF_SECURITY_ADMIN_PASSWORD`
- [ ] Configure providers (non-mock):
  - `SMS_PROVIDER`
  - `EMAIL_PROVIDER`
  - `PAYMENT_PROVIDER`

## 2) Observability
- [ ] Backend Sentry configured:
  - `SENTRY_DSN`
  - `SENTRY_ENVIRONMENT=production`
  - `SENTRY_RELEASE`
- [ ] Frontend Sentry configured:
  - `VITE_SENTRY_DSN`
  - `VITE_SENTRY_ENVIRONMENT=production`
  - `VITE_RELEASE`
- [ ] Uptime monitor enabled:
  - `UPTIME_MONITOR_ENABLED=true`
  - target URLs configured
  - at least one alert channel configured (email/slack/whatsapp)

## 3) Deployment preflight
- [ ] Run preflight:
  - PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/preflight-deploy.ps1 -EnvFile .env`
  - or Bash: `bash scripts/preflight-deploy.sh .env`
- [ ] Resolve all reported errors/warnings

## 4) Infrastructure and proxy
- [ ] PostgreSQL healthy
- [ ] Redis healthy
- [ ] Reverse proxy configured for path routing:
  - `/dineops/` -> frontend
  - `/dineops/api/` -> backend `/api/`
  - `/dineops/ws/` -> backend `/ws/`
- [ ] TLS certificate valid for `projects.sharondsouza.in`

## 5) Deploy
- [ ] `docker compose up -d --build`
- [ ] Verify container health: `docker compose ps`

## 6) Post-deploy smoke test
- [ ] App loads: `https://projects.sharondsouza.in/dineops/`
- [ ] Health endpoint UP: `/dineops/api/actuator/health`
- [ ] Register/login works
- [ ] OTP delivery works on real phone
- [ ] Menu browse -> checkout -> order place works
- [ ] Online payment path works
- [ ] Kitchen realtime updates work (websocket)
- [ ] Conversion funnel updates after test flow
- [ ] Daily closing report renders

## 7) Support readiness
- [ ] `docs/KNOWN_ISSUES.md` reviewed with support team
- [ ] `docs/ROLLBACK_RUNBOOK.md` reviewed and accessible
- [ ] Admin credentials stored in password manager
- [ ] Backup and restore test completed

## 8) Go-live signoff
- [ ] Technical signoff
- [ ] Product signoff
- [ ] Monitoring signoff
- [ ] Public launch approved
