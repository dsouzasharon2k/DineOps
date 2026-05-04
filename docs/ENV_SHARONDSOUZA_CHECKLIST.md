# `.env` Fill Checklist for `projects.sharondsouza.in/dineops`

Use this to prepare your production `.env` quickly and safely.

## 1) Create the file

```bash
cp .env.production.sharondsouza.example .env
```

## 2) Paste/verify this exact content in `.env`

```env
POSTGRES_DB=dineops
POSTGRES_USER=dineops
POSTGRES_PASSWORD=TODO_STRONG_DB_PASSWORD
SPRING_PROFILES_ACTIVE=prod

DB_URL=jdbc:postgresql://postgres:5432/dineops
DB_USERNAME=dineops
DB_PASSWORD=TODO_STRONG_DB_PASSWORD
DB_POOL_NAME=dineops-prod-hikari
DB_MAX_POOL_SIZE=30
DB_MIN_IDLE=10
DB_IDLE_TIMEOUT_MS=300000
DB_MAX_LIFETIME_MS=1800000
DB_CONNECTION_TIMEOUT_MS=30000
DB_VALIDATION_TIMEOUT_MS=5000

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=TODO_STRONG_REDIS_PASSWORD

# CORS uses origin only (no path)
CORS_ALLOWED_ORIGINS=https://projects.sharondsouza.in
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS,PATCH
CORS_ALLOWED_HEADERS=*
CORS_MAX_AGE_SECONDS=3600

JWT_SECRET=TODO_64_CHAR_HEX_SECRET
JWT_EXPIRATION_MS=900000
JWT_REFRESH_EXPIRATION_MS=604800000

# Frontend/App URLs
# IMPORTANT: VITE_API_URL is the app base; code appends /api/v1
VITE_API_URL=https://projects.sharondsouza.in/dineops
VITE_BASE_PATH=/dineops/
VITE_SENTRY_DSN=TODO_FRONTEND_SENTRY_DSN
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_RELEASE=dineops-frontend-v1
FRONTEND_BASE_URL=https://projects.sharondsouza.in/dineops
PAYMENT_FRONTEND_BASE_URL=https://projects.sharondsouza.in/dineops

# SMS OTP (MSG91)
SMS_PROVIDER=msg91
SMS_SENDER_ID=DINEOP
MSG91_AUTH_KEY=TODO_MSG91_AUTH_KEY
MSG91_TEMPLATE_ID=TODO_MSG91_TEMPLATE_ID
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Email (SMTP)
EMAIL_PROVIDER=smtp
EMAIL_FROM=no-reply@sharondsouza.in
MAIL_HOST=TODO_SMTP_HOST
MAIL_PORT=587
MAIL_USERNAME=TODO_SMTP_USERNAME
MAIL_PASSWORD=TODO_SMTP_PASSWORD
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS_ENABLE=true

# Payments (Razorpay)
PAYMENT_PROVIDER=razorpay
PAYMENT_WEBHOOK_SHARED_SECRET=TODO_PAYMENT_WEBHOOK_SECRET
RAZORPAY_KEY_ID=TODO_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=TODO_RAZORPAY_KEY_SECRET

# Ops
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=TODO_STRONG_GRAFANA_PASSWORD

# Optional digest job
DIGEST_SCHEDULE_ENABLED=true
DIGEST_CRON=0 30 23 * * *
DIGEST_FALLBACK_RECIPIENTS=owner@sharondsouza.in

# Backend Sentry
SENTRY_DSN=TODO_BACKEND_SENTRY_DSN
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.2
SENTRY_RELEASE=dineops-backend-v1

# Uptime monitor + alert channels
UPTIME_MONITOR_ENABLED=true
UPTIME_CHECK_CRON=0 */5 * * * *
UPTIME_BACKEND_HEALTH_URL=https://projects.sharondsouza.in/dineops/api/actuator/health
UPTIME_FRONTEND_URL=https://projects.sharondsouza.in/dineops/
UPTIME_ALERT_COOLDOWN_MINUTES=30
UPTIME_ALERT_EMAIL_RECIPIENTS=owner@sharondsouza.in
UPTIME_ALERT_WHATSAPP_RECIPIENTS=
UPTIME_ALERT_SLACK_WEBHOOK_URL=TODO_SLACK_WEBHOOK_URL
```

## 3) Generate secure values (recommended)

```bash
# JWT secret (64 hex chars)
openssl rand -hex 32

# DB / Redis / Grafana strong passwords
openssl rand -base64 24
```

## 4) Run preflight validation

```bash
# Linux/macOS
SKIP_TLS_CHECK=true bash scripts/preflight-deploy.sh .env

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/preflight-deploy.ps1 -EnvFile .env -SkipTlsCertCheck
```

If preflight passes, deploy:

```bash
docker compose up -d --build
```
