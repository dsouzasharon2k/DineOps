# Deploy on `projects.sharondsouza.in/dineops`

## 1) Create production env

```bash
cp .env.production.sharondsouza.example .env
```

Fill every `replace_with_*` value in `.env`.

## 2) Preflight checks

```bash
# Linux/macOS
bash scripts/preflight-deploy.sh .env

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/preflight-deploy.ps1 -EnvFile .env
```

If you are terminating TLS outside this repo (existing host nginx/caddy), skip cert-file checks:

```bash
# Linux/macOS
SKIP_TLS_CHECK=true bash scripts/preflight-deploy.sh .env

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/preflight-deploy.ps1 -EnvFile .env -SkipTlsCertCheck
```

### Required observability keys (recommended before go-live)
- `SENTRY_DSN` and `VITE_SENTRY_DSN`
- `UPTIME_MONITOR_ENABLED=true`
- At least one alert channel:
  - `UPTIME_ALERT_EMAIL_RECIPIENTS`
  - `UPTIME_ALERT_SLACK_WEBHOOK_URL`
  - `UPTIME_ALERT_WHATSAPP_RECIPIENTS` (Twilio-backed)

## 3) Build and run

```bash
docker compose up -d --build
```

## 4) Verify app and API

```bash
# Health check through your path-based API route
curl -I "https://projects.sharondsouza.in/dineops/api/actuator/health"

# App
curl -I "https://projects.sharondsouza.in/dineops/"
```

Expected:
- `200`/`302` on app URL
- `200` and JSON `{"status":"UP"}` for health endpoint

## 5) Reverse-proxy requirements (critical for path deployment)

Your host proxy must forward:
- `/dineops/` -> frontend container (`http://localhost:5173/`)
- `/dineops/api/` -> backend container (`http://localhost:8080/api/`)
- `/dineops/ws/` -> backend container (`http://localhost:8080/ws/`) for realtime SockJS

## 6) Copy-paste Nginx config

Use this inside your TLS server block for `projects.sharondsouza.in`:

```nginx
# Keep this if you use WebSocket/SockJS
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 443 ssl http2;
  server_name projects.sharondsouza.in;

  # ... your ssl_certificate / ssl_certificate_key ...

  # API: /dineops/api/* -> backend /api/*
  location /dineops/api/ {
    proxy_pass http://127.0.0.1:8080/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # Realtime SockJS/STOMP: /dineops/ws/* -> backend /ws/*
  location /dineops/ws/ {
    proxy_pass http://127.0.0.1:8080/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # SPA static app: /dineops/* -> frontend /*
  location /dineops/ {
    proxy_pass http://127.0.0.1:5173/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 7) Copy-paste Caddy config

```caddy
projects.sharondsouza.in {
  # API first (more specific path)
  handle /dineops/api/* {
    uri strip_prefix /dineops
    reverse_proxy 127.0.0.1:8080
  }

  # Realtime websocket/sockjs
  handle /dineops/ws/* {
    uri strip_prefix /dineops
    reverse_proxy 127.0.0.1:8080
  }

  # Frontend SPA
  handle /dineops/* {
    uri strip_prefix /dineops
    reverse_proxy 127.0.0.1:5173
  }
}
```

This repo is now configured for that path deployment:
- `VITE_BASE_PATH=/dineops/`
- `VITE_API_URL=https://projects.sharondsouza.in/dineops`
- Router basename auto-uses Vite base path
- PWA manifest/service-worker paths are base-path aware
