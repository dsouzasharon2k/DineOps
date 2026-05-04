#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"
SKIP_TLS_CHECK="${SKIP_TLS_CHECK:-false}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_PATH="${REPO_ROOT}/${ENV_FILE}"

if [[ ! -f "${ENV_PATH}" ]]; then
  echo "Missing env file: ${ENV_PATH}" >&2
  exit 1
fi

declare -A VARS
while IFS='=' read -r key value; do
  [[ -z "${key}" ]] && continue
  [[ "${key}" =~ ^[[:space:]]*# ]] && continue
  key="$(echo "${key}" | xargs)"
  value="$(echo "${value:-}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  VARS["$key"]="$value"
done < "${ENV_PATH}"

errors=()
warnings=()

is_placeholder() {
  local v="${1:-}"
  local lower="${v,,}"
  [[ -z "${v}" || "${lower}" == *"replace_with"* || "${lower}" == *"change-me"* || "${lower}" == *"your_"* ]]
}

require_value() {
  local key="$1"
  if [[ -z "${VARS[$key]:-}" || "$(is_placeholder "${VARS[$key]:-}" && echo yes || echo no)" == "yes" ]]; then
    errors+=("Missing or placeholder value: ${key}")
  fi
}

# 1) JWT
require_value "JWT_SECRET"
if [[ -n "${VARS[JWT_SECRET]:-}" && "${#VARS[JWT_SECRET]}" -lt 32 ]]; then
  errors+=("JWT_SECRET must be at least 32 characters (64 hex chars recommended).")
fi

# 2) CORS
require_value "CORS_ALLOWED_ORIGINS"
if [[ -n "${VARS[CORS_ALLOWED_ORIGINS]:-}" ]]; then
  IFS=',' read -ra origins <<< "${VARS[CORS_ALLOWED_ORIGINS]}"
  for origin in "${origins[@]}"; do
    origin="$(echo "$origin" | xargs)"
    lower="${origin,,}"
    [[ -z "${origin}" ]] && continue
    if [[ "${lower}" == *"localhost"* || "${lower}" == *"127.0.0.1"* ]]; then
      errors+=("CORS_ALLOWED_ORIGINS must not contain localhost/127.0.0.1.")
      break
    fi
    if [[ "${lower}" != https://* ]]; then
      errors+=("CORS origin must use HTTPS: ${origin}")
      break
    fi
  done
fi

# 3) Frontend/API URLs
for key in VITE_API_URL FRONTEND_BASE_URL PAYMENT_FRONTEND_BASE_URL; do
  require_value "$key"
  val="${VARS[$key]:-}"
  lower="${val,,}"
  if [[ -n "$val" ]]; then
    if [[ "${lower}" == *"localhost"* || "${lower}" == *"127.0.0.1"* ]]; then
      errors+=("${key} must not point to localhost.")
    fi
    if [[ "${lower}" != https://* ]]; then
      errors+=("${key} must use HTTPS.")
    fi
  fi
done

# 4) Providers
require_value "SMS_PROVIDER"
require_value "EMAIL_PROVIDER"
require_value "PAYMENT_PROVIDER"

sms="${VARS[SMS_PROVIDER]:-}"
email="${VARS[EMAIL_PROVIDER]:-}"
payment="${VARS[PAYMENT_PROVIDER]:-}"

[[ "${sms,,}" == "mock" ]] && errors+=("SMS_PROVIDER cannot be mock in production.")
[[ "${email,,}" == "mock" ]] && errors+=("EMAIL_PROVIDER cannot be mock in production.")
[[ "${payment,,}" == "mock" ]] && errors+=("PAYMENT_PROVIDER cannot be mock in production.")

if [[ "${sms,,}" == "msg91" ]]; then
  require_value "MSG91_AUTH_KEY"
  require_value "MSG91_TEMPLATE_ID"
elif [[ "${sms,,}" == "twilio" ]]; then
  require_value "TWILIO_ACCOUNT_SID"
  require_value "TWILIO_AUTH_TOKEN"
  require_value "TWILIO_FROM_NUMBER"
fi

if [[ "${email,,}" == "smtp" ]]; then
  require_value "MAIL_HOST"
  require_value "MAIL_USERNAME"
  require_value "MAIL_PASSWORD"
fi

if [[ "${payment,,}" == "razorpay" ]]; then
  require_value "RAZORPAY_KEY_ID"
  require_value "RAZORPAY_KEY_SECRET"
  require_value "PAYMENT_WEBHOOK_SHARED_SECRET"
fi

# 5) TLS certs (for compose --profile tls)
if [[ "${SKIP_TLS_CHECK}" != "true" ]]; then
  [[ ! -f "${REPO_ROOT}/docker/certs/fullchain.pem" ]] && errors+=("Missing TLS certificate: docker/certs/fullchain.pem")
  [[ ! -f "${REPO_ROOT}/docker/certs/privkey.pem" ]] && errors+=("Missing TLS private key: docker/certs/privkey.pem")
else
  warnings+=("TLS certificate check skipped.")
fi

# 6) Monitoring files
for f in \
  monitoring/prometheus.yml \
  monitoring/alerts.yml \
  monitoring/grafana/provisioning/datasources/datasource.yml \
  monitoring/grafana/provisioning/dashboards/dashboards.yml
do
  [[ ! -f "${REPO_ROOT}/${f}" ]] && errors+=("Missing monitoring file: ${f}")
done

# 7) Uptime monitor + alert channels
uptime_enabled="${VARS[UPTIME_MONITOR_ENABLED]:-false}"
if [[ "${uptime_enabled,,}" == "true" ]]; then
  require_value "UPTIME_BACKEND_HEALTH_URL"
  require_value "UPTIME_FRONTEND_URL"

  has_email="false"
  has_slack="false"
  has_whatsapp="false"
  [[ -n "${VARS[UPTIME_ALERT_EMAIL_RECIPIENTS]:-}" ]] && has_email="true"
  [[ -n "${VARS[UPTIME_ALERT_SLACK_WEBHOOK_URL]:-}" ]] && has_slack="true"
  [[ -n "${VARS[UPTIME_ALERT_WHATSAPP_RECIPIENTS]:-}" ]] && has_whatsapp="true"

  if [[ "${has_email}" != "true" && "${has_slack}" != "true" && "${has_whatsapp}" != "true" ]]; then
    errors+=("UPTIME_MONITOR_ENABLED=true requires at least one alert channel (email/slack/whatsapp recipients).")
  fi

  if [[ "${has_whatsapp}" == "true" && "${sms,,}" != "twilio" ]]; then
    warnings+=("WhatsApp recipients are set, but SMS_PROVIDER is not twilio. WhatsApp alerts will log in mock mode.")
  fi
fi

if (( ${#warnings[@]} > 0 )); then
  echo "Preflight warnings:"
  for w in "${warnings[@]}"; do
    echo " - ${w}"
  done
fi

if (( ${#errors[@]} > 0 )); then
  echo "Preflight failed with ${#errors[@]} issue(s):" >&2
  for e in "${errors[@]}"; do
    echo " - ${e}" >&2
  done
  exit 1
fi

echo "Preflight passed. Production deployment checks are satisfied."
