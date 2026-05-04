/**
 * K6 Authenticated Dashboard Flow
 *
 * Simulates a TENANT_ADMIN owner session:
 *   Login → Analytics Summary → Inventory → Alerts → Finance → Wastage → Vendors
 *
 * Run:
 *   k6 run k6/dashboard-test.js -e K6_BASE_URL=http://localhost:8080/api/v1 \
 *       -e K6_EMAIL=owner@dineops.com -e K6_PASSWORD=PasswordA1 \
 *       -e K6_TENANT_ID=<uuid>
 */

import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js'

// Custom metrics
const errorRate   = new Rate('error_rate')
const apiDuration = new Trend('api_duration_ms')

export const options = {
  stages: [
    { duration: '20s', target: 5  },  // ramp up to 5 owners
    { duration: '1m',  target: 5  },  // hold
    { duration: '20s', target: 0  },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],    // 95% under 800ms (authenticated calls are heavier)
    error_rate:        ['rate<0.02'],    // < 2% errors
    api_duration_ms:   ['p(95)<800'],
  },
}

const DEFAULT_BASE  = 'http://localhost:8080/api/v1'
const BASE_URL      = (__ENV.K6_BASE_URL  || DEFAULT_BASE).replace(/\/$/, '')
const API_ORIGIN    = BASE_URL.endsWith('/api/v1')
  ? BASE_URL.slice(0, -'/api/v1'.length)
  : BASE_URL.replace(/\/api\/v\d+$/, '')

const EMAIL     = __ENV.K6_EMAIL     || 'owner@dineops.com'
const PASSWORD  = __ENV.K6_PASSWORD  || 'PasswordA1'
const TENANT_ID = __ENV.K6_TENANT_ID || 'a085284e-ca00-4f64-a2c7-42fc0572bb97'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function checked(res, name) {
  const ok = check(res, {
    [`${name}: status 200`]: (r) => r.status === 200,
    [`${name}: < 800ms`]:    (r) => r.timings.duration < 800,
  })
  errorRate.add(!ok)
  apiDuration.add(res.timings.duration)
  return ok
}

// ─── Setup: authenticate once and share token ─────────────────────────────────
export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
    { headers: JSON_HEADERS }
  )
  const ok = check(res, { 'Login: 200': (r) => r.status === 200 })
  if (!ok) {
    console.error(`Login failed (${res.status}): ${res.body}`)
    return { token: null }
  }
  const token = JSON.parse(res.body).token
  console.log(`Authenticated as ${EMAIL}`)
  return { token }
}

// ─── Main VU function ─────────────────────────────────────────────────────────
export default function (data) {
  const { token } = data
  if (!token) return   // skip VU if auth failed in setup

  const headers = authHeaders(token)
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  group('Dashboard: analytics summary', () => {
    const res = http.get(`${BASE_URL}/analytics/summary?tenantId=${TENANT_ID}`, { headers })
    checked(res, 'Analytics summary')
    sleep(0.5)
  })

  group('Dashboard: active orders', () => {
    const res = http.get(`${BASE_URL}/orders/active?tenantId=${TENANT_ID}`, { headers })
    checked(res, 'Active orders')
    sleep(0.3)
  })

  group('Dashboard: inventory', () => {
    const res = http.get(`${BASE_URL}/inventory?tenantId=${TENANT_ID}`, { headers })
    checked(res, 'Inventory list')
    sleep(0.3)
  })

  group('Dashboard: alerts summary', () => {
    const res = http.get(`${BASE_URL}/alerts/summary?tenantId=${TENANT_ID}`, { headers })
    checked(res, 'Alerts summary')
    sleep(0.3)
  })

  group('Dashboard: finance', () => {
    const res = http.get(
      `${BASE_URL}/finance/summary?tenantId=${TENANT_ID}&from=${weekAgo}&to=${today}`,
      { headers }
    )
    checked(res, 'Finance summary')
    sleep(0.3)
  })

  group('Dashboard: wastage', () => {
    const res = http.get(`${BASE_URL}/wastage?tenantId=${TENANT_ID}`, { headers })
    checked(res, 'Wastage list')
    sleep(0.3)
  })

  group('Dashboard: menu insights', () => {
    const res = http.get(
      `${BASE_URL}/analytics/menu-insights?tenantId=${TENANT_ID}&from=${weekAgo}&to=${today}`,
      { headers }
    )
    checked(res, 'Menu insights')
    sleep(0.3)
  })

  group('Dashboard: customer profiles', () => {
    const res = http.get(
      `${BASE_URL}/analytics/customer-profiles?tenantId=${TENANT_ID}`,
      { headers }
    )
    checked(res, 'Customer profiles')
    sleep(0.3)
  })

  group('Dashboard: vendors', () => {
    const res = http.get(
      `${BASE_URL}/restaurants/${TENANT_ID}/vendors`,
      { headers }
    )
    checked(res, 'Vendors list')
    sleep(0.5)
  })

  // Health check on each iteration to detect backend degradation
  group('Health', () => {
    const res = http.get(`${API_ORIGIN}/actuator/health`)
    check(res, { 'Health: UP': (r) => r.status === 200 })
  })

  sleep(1)
}

// ─── Summary output ───────────────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'k6/dashboard-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}
