param(
  [string]$EnvFile = ".env",
  [switch]$SkipTlsCertCheck
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $repoRoot $EnvFile

if (-not (Test-Path $envPath)) {
  Write-Error "Missing env file: $envPath"
}

function Parse-EnvFile {
  param([string]$Path)
  $map = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    $map[$key] = $value
  }
  return $map
}

function Is-Placeholder {
  param([string]$Value)
  if (-not $Value) { return $true }
  $v = $Value.ToLowerInvariant()
  return $v.Contains("replace_with") -or $v.Contains("change-me") -or $v.Contains("your_")
}

function Require-Value {
  param([hashtable]$Vars, [string]$Key, [System.Collections.Generic.List[string]]$Errors)
  if (-not $Vars.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Vars[$Key]) -or (Is-Placeholder $Vars[$Key])) {
    $Errors.Add("Missing or placeholder value: $Key")
  }
}

$vars = Parse-EnvFile $envPath
$errors = New-Object 'System.Collections.Generic.List[string]'
$warnings = New-Object 'System.Collections.Generic.List[string]'

# 1) JWT secret
Require-Value $vars "JWT_SECRET" $errors
if ($vars.ContainsKey("JWT_SECRET") -and $vars["JWT_SECRET"].Length -lt 32) {
  $errors.Add("JWT_SECRET must be at least 32 characters (64 hex chars recommended).")
}

# 2) CORS
Require-Value $vars "CORS_ALLOWED_ORIGINS" $errors
if ($vars.ContainsKey("CORS_ALLOWED_ORIGINS")) {
  $origins = $vars["CORS_ALLOWED_ORIGINS"].Split(",") | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ }
  foreach ($origin in $origins) {
    if ($origin.Contains("localhost") -or $origin.Contains("127.0.0.1")) {
      $errors.Add("CORS_ALLOWED_ORIGINS must not contain localhost/127.0.0.1.")
      break
    }
    if (-not $origin.StartsWith("https://")) {
      $errors.Add("CORS origin must use HTTPS: $origin")
      break
    }
  }
}

# 3) Frontend/API URLs
foreach ($key in @("VITE_API_URL", "FRONTEND_BASE_URL", "PAYMENT_FRONTEND_BASE_URL")) {
  Require-Value $vars $key $errors
  if ($vars.ContainsKey($key)) {
    $val = $vars[$key].Trim().ToLowerInvariant()
    if ($val.Contains("localhost") -or $val.Contains("127.0.0.1")) {
      $errors.Add("$key must not point to localhost.")
    }
    if (-not $val.StartsWith("https://")) {
      $errors.Add("$key must use HTTPS.")
    }
  }
}

# 4) Providers
Require-Value $vars "SMS_PROVIDER" $errors
Require-Value $vars "EMAIL_PROVIDER" $errors
Require-Value $vars "PAYMENT_PROVIDER" $errors

if ($vars.ContainsKey("SMS_PROVIDER") -and $vars["SMS_PROVIDER"].Trim().ToLowerInvariant() -eq "mock") {
  $errors.Add("SMS_PROVIDER cannot be mock in production.")
}
if ($vars.ContainsKey("EMAIL_PROVIDER") -and $vars["EMAIL_PROVIDER"].Trim().ToLowerInvariant() -eq "mock") {
  $errors.Add("EMAIL_PROVIDER cannot be mock in production.")
}
if ($vars.ContainsKey("PAYMENT_PROVIDER") -and $vars["PAYMENT_PROVIDER"].Trim().ToLowerInvariant() -eq "mock") {
  $errors.Add("PAYMENT_PROVIDER cannot be mock in production.")
}

if ($vars.ContainsKey("SMS_PROVIDER")) {
  $sms = $vars["SMS_PROVIDER"].Trim().ToLowerInvariant()
  if ($sms -eq "msg91") {
    Require-Value $vars "MSG91_AUTH_KEY" $errors
    Require-Value $vars "MSG91_TEMPLATE_ID" $errors
  } elseif ($sms -eq "twilio") {
    Require-Value $vars "TWILIO_ACCOUNT_SID" $errors
    Require-Value $vars "TWILIO_AUTH_TOKEN" $errors
    Require-Value $vars "TWILIO_FROM_NUMBER" $errors
  }
}

if ($vars.ContainsKey("EMAIL_PROVIDER") -and $vars["EMAIL_PROVIDER"].Trim().ToLowerInvariant() -eq "smtp") {
  Require-Value $vars "MAIL_HOST" $errors
  Require-Value $vars "MAIL_USERNAME" $errors
  Require-Value $vars "MAIL_PASSWORD" $errors
}

if ($vars.ContainsKey("PAYMENT_PROVIDER") -and $vars["PAYMENT_PROVIDER"].Trim().ToLowerInvariant() -eq "razorpay") {
  Require-Value $vars "RAZORPAY_KEY_ID" $errors
  Require-Value $vars "RAZORPAY_KEY_SECRET" $errors
  Require-Value $vars "PAYMENT_WEBHOOK_SHARED_SECRET" $errors
}

# 5) TLS certs (for compose --profile tls)
if (-not $SkipTlsCertCheck) {
  $fullchain = Join-Path $repoRoot "docker/certs/fullchain.pem"
  $privkey = Join-Path $repoRoot "docker/certs/privkey.pem"
  if (-not (Test-Path $fullchain)) { $errors.Add("Missing TLS certificate: docker/certs/fullchain.pem") }
  if (-not (Test-Path $privkey)) { $errors.Add("Missing TLS private key: docker/certs/privkey.pem") }
} else {
  $warnings.Add("TLS certificate check skipped.")
}

# 6) Monitoring files
$requiredFiles = @(
  "monitoring/prometheus.yml",
  "monitoring/alerts.yml",
  "monitoring/grafana/provisioning/datasources/datasource.yml",
  "monitoring/grafana/provisioning/dashboards/dashboards.yml"
)
foreach ($rel in $requiredFiles) {
  $full = Join-Path $repoRoot $rel
  if (-not (Test-Path $full)) {
    $errors.Add("Missing monitoring file: $rel")
  }
}

# 7) Uptime monitor + alert channels
$uptimeEnabled = $vars.ContainsKey("UPTIME_MONITOR_ENABLED") -and $vars["UPTIME_MONITOR_ENABLED"].Trim().ToLowerInvariant() -eq "true"
if ($uptimeEnabled) {
  Require-Value $vars "UPTIME_BACKEND_HEALTH_URL" $errors
  Require-Value $vars "UPTIME_FRONTEND_URL" $errors

  $hasEmailRecipients = $vars.ContainsKey("UPTIME_ALERT_EMAIL_RECIPIENTS") -and -not [string]::IsNullOrWhiteSpace($vars["UPTIME_ALERT_EMAIL_RECIPIENTS"])
  $hasSlackWebhook = $vars.ContainsKey("UPTIME_ALERT_SLACK_WEBHOOK_URL") -and -not [string]::IsNullOrWhiteSpace($vars["UPTIME_ALERT_SLACK_WEBHOOK_URL"])
  $hasWhatsAppRecipients = $vars.ContainsKey("UPTIME_ALERT_WHATSAPP_RECIPIENTS") -and -not [string]::IsNullOrWhiteSpace($vars["UPTIME_ALERT_WHATSAPP_RECIPIENTS"])

  if (-not ($hasEmailRecipients -or $hasSlackWebhook -or $hasWhatsAppRecipients)) {
    $errors.Add("UPTIME_MONITOR_ENABLED=true requires at least one alert channel (email/slack/whatsapp recipients).")
  }

  if ($hasWhatsAppRecipients) {
    if (-not $vars.ContainsKey("SMS_PROVIDER") -or $vars["SMS_PROVIDER"].Trim().ToLowerInvariant() -ne "twilio") {
      $warnings.Add("WhatsApp recipients are set, but SMS_PROVIDER is not twilio. WhatsApp alerts will log in mock mode.")
    }
  }
}

if ($warnings.Count -gt 0) {
  Write-Host "Preflight warnings:" -ForegroundColor Yellow
  $warnings | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
}

if ($errors.Count -gt 0) {
  Write-Host "Preflight failed with $($errors.Count) issue(s):" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "Preflight passed. Production deployment checks are satisfied." -ForegroundColor Green
