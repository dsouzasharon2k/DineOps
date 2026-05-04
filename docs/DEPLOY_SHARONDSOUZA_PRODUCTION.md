# DineOps Deployment — `sharondsouza.in`

This guide is prefilled for:
- App: `https://projects.sharondsouza.in/dineops`
- API: `https://projects.sharondsouza.in/dineops/api`
- Mode: managed platform with automatic TLS

## 1) Create your production env

```bash
cp .env.production.sharondsouza.example .env
```

Fill all `replace_with_*` fields.

Generate secrets:

```bash
openssl rand -hex 32    # JWT_SECRET
openssl rand -base64 24 # DB/Redis/Grafana passwords
```

## 2) Run preflight checks

Managed TLS means TLS cert files are not required in repo, so skip cert check:

```bash
# Linux/macOS
SKIP_TLS_CHECK=true bash scripts/preflight-deploy.sh .env

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/preflight-deploy.ps1 -EnvFile .env -SkipTlsCertCheck
```

Preflight must say:

`Preflight passed. Production deployment checks are satisfied.`

## 3) Deploy

```bash
docker compose up -d --build
```

## 4) Verify

1. Health:
   - `GET https://projects.sharondsouza.in/dineops/api/actuator/health`
2. Frontend:
   - Open `https://projects.sharondsouza.in/dineops`
3. Auth:
   - Register/login, OTP delivered via configured SMS provider.
4. QR:
   - Generate QR and confirm it redirects to `/dineops/menu/scan/...` route correctly.
5. Payments:
   - Run Razorpay test payment and verify webhook handling.

## 5) Important routing note (path-based hosting)

Because you are hosting under `/dineops`, your reverse proxy must:

- route `/dineops/api/*` -> backend
- route `/dineops/*` -> frontend
- preserve SPA fallback for frontend routes

If your platform cannot do clean path-based rewrites for both frontend and backend, switch to subdomains:
- App: `https://dineops.sharondsouza.in`
- API: `https://api.sharondsouza.in`

That setup is simpler and less error-prone.
