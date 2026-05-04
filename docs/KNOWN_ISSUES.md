# Known Issues (v1.0)

This page is for support triage and on-call handover.

## 1) Docker daemon not running on Windows
- **Symptom:** `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`
- **Impact:** `docker compose` commands fail; local full-stack preview unavailable.
- **Workaround:** Start Docker Desktop, then re-run `docker compose up -d --build`.

## 2) Path-based deploy requires proxy rewrite for WebSocket
- **Symptom:** Kitchen live updates do not appear in real time.
- **Impact:** Orders still work, but realtime status feed is delayed/absent.
- **Root cause:** `/dineops/ws/*` not forwarded to backend `/ws/*`.
- **Fix:** Apply the reverse-proxy rules in `docs/DEPLOY_SHARONDSOUZA.md`.

## 3) OTP/Email/Payment in mock mode
- **Symptom:** OTP or payment appears to complete locally but no external delivery/charge happens.
- **Impact:** Production-grade flows are not actually exercised.
- **Fix:** Set real providers and credentials:
  - `SMS_PROVIDER=msg91|twilio`
  - `EMAIL_PROVIDER=smtp`
  - `PAYMENT_PROVIDER=razorpay`

## 4) Uptime monitor enabled but no alert channels configured
- **Symptom:** No notifications despite monitor checks running.
- **Impact:** Silent downtime.
- **Fix:** Configure at least one channel:
  - `UPTIME_ALERT_EMAIL_RECIPIENTS`
  - `UPTIME_ALERT_SLACK_WEBHOOK_URL`
  - `UPTIME_ALERT_WHATSAPP_RECIPIENTS` (Twilio-backed)

## 5) Sentry DSN missing
- **Symptom:** Errors visible in logs only; absent in Sentry dashboard.
- **Impact:** No centralized error tracking.
- **Fix:** Set:
  - Backend: `SENTRY_DSN`
  - Frontend: `VITE_SENTRY_DSN`

## 6) Funnel data appears low immediately after deploy
- **Symptom:** Conversion funnel numbers are near zero.
- **Impact:** Dashboard funnel looks empty for first sessions.
- **Root cause:** Event table starts empty; metrics need live traffic.
- **Fix:** Perform smoke-flow traffic (menu view -> checkout -> order -> payment) and re-check.

---

If an issue is not listed here, capture:
1. Timestamp and tenant ID
2. Endpoint + payload
3. Browser/network error
4. Backend logs around the same timestamp
