/**
 * E2E tests for SRS new features:
 *   - Waste Analytics Dashboard
 *   - Direct Marketing Engine
 *   - Kitchen Smart Queue Throttling
 *   - Performance Scorecards
 */

import { expect, test } from '@playwright/test'

const MOCK_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvd25lckBkaW5lb3BzLmNvbSIsInJvbGUiOiJURU5BTlRfQURNSU4iLCJ0ZW5hbnRJZCI6ImEwODUyODRlLWNhMDAtNGY2NC1hMmM3LTQyZmMwNTc2YmI5NyJ9.signature'
const TENANT_ID = 'a085284e-ca00-4f64-a2c7-42fc0572bb97'

const ANALYTICS_STUB = {
  todaysOrderCount: 8,
  todaysRevenue: 180000,
  averageOrderValue: 22500,
  todaysProfit: 36000,
  todaysWastage: 4500,
  averagePreparationMinutes: 18,
  ordersByStatus: [{ status: 'PENDING', count: 2 }, { status: 'PREPARING', count: 3 }],
  revenueTrend: [
    { date: '2026-04-15', revenue: 160000 },
    { date: '2026-04-16', revenue: 180000 },
  ],
  wastageTrend: [{ date: '2026-04-15', revenue: 3000 }, { date: '2026-04-16', revenue: 4500 }],
  topMenuItems: [{ name: 'Butter Chicken', count: 12 }, { name: 'Naan', count: 9 }],
}

const WASTAGE_STUB = [
  { id: 'w1', tenantId: TENANT_ID, menuItemId: 'm1', menuItemName: 'Paneer', quantity: 2, unitCost: 5000, reason: 'Expired', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: 'w2', tenantId: TENANT_ID, menuItemId: 'm2', menuItemName: 'Tomatoes', quantity: 1, unitCost: 800, reason: 'Spoiled', createdAt: new Date().toISOString() },
]

const CUSTOMER_PROFILES_STUB = [
  { customerPhone: '+919876543210', customerName: 'Amit Kumar', totalOrders: 5, totalSpendPaise: 250000, avgOrderValuePaise: 50000, lastOrderAt: new Date(Date.now() - 45 * 86400000).toISOString(), daysSinceLastOrder: 45, segment: 'SLIPPING' },
  { customerPhone: '+919123456789', customerName: 'Priya Singh', totalOrders: 1, totalSpendPaise: 45000, avgOrderValuePaise: 45000, lastOrderAt: new Date().toISOString(), daysSinceLastOrder: 0, segment: 'NEW' },
]

const ACTIVE_ORDERS_STUB = Array.from({ length: 3 }, (_, i) => ({
  id: `order-${i + 1}-test-uuid`,
  tenantId: TENANT_ID,
  customer: null,
  tableNumber: String(i + 1),
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  paymentMethod: 'CASH',
  totalAmount: 25000 + i * 5000,
  notes: null,
  createdAt: new Date(Date.now() - (i + 1) * 60000).toISOString(),
  updatedAt: new Date().toISOString(),
  items: [{ id: `i${i}`, menuItemId: 'm1', name: 'Butter Chicken', price: 25000, quantity: 1, createdAt: '', updatedAt: '' }],
}))

/**
 * Auth + stub helper — sets the JWT and stubs all standard API calls
 */
async function authenticateAndStubApis(page: Parameters<typeof test.fn>[0]['page']) {
  await page.addInitScript((token) => {
    localStorage.setItem('platterops_auth_token', token)
  }, MOCK_TOKEN)

  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: MOCK_TOKEN }) }))
  await page.route('**/api/v1/analytics/summary**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ANALYTICS_STUB) }))
  await page.route('**/api/v1/analytics/actions**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
  await page.route('**/api/v1/analytics/menu-insights**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ recommendations: [], items: [] }) }))
  await page.route('**/api/v1/analytics/customer-profiles**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CUSTOMER_PROFILES_STUB) }))
  await page.route('**/api/v1/alerts/summary**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
  await page.route('**/api/v1/alerts/unread-count**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) }))
  await page.route('**/api/v1/finance/summary**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) }))
  await page.route('**/api/v1/orders/active**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACTIVE_ORDERS_STUB) }))
  await page.route('**/api/v1/wastage**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(WASTAGE_STUB) }))
  await page.route('**/api/v1/inventory**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
  await page.route('**/api/v1/restaurants/*/categories**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
}

// ─── Waste Analytics Dashboard ────────────────────────────────────────────────

test('WastagePage: shows analytics KPIs and charts', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.goto('/dashboard/wastage')

  await expect(page.getByText('Waste Analytics')).toBeVisible()
  await expect(page.getByText('Total Waste (30d)')).toBeVisible()
  await expect(page.getByText('Avg Daily Waste')).toBeVisible()
  await expect(page.getByText('Top wasted items (30d)')).toBeVisible()
  await expect(page.getByText('Paneer')).toBeVisible()
  await expect(page.getByText('Waste trend — 7 days')).toBeVisible()
})

test('WastagePage: Log Waste button opens form', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.goto('/dashboard/wastage')

  await page.getByRole('button', { name: /log waste/i }).click()
  await expect(page.getByText('Log wastage event')).toBeVisible()
})

test('WastagePage: recent waste log shows event data', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.goto('/dashboard/wastage')

  await expect(page.getByText('Recent Waste Log')).toBeVisible()
  await expect(page.getByText(/Expired/)).toBeVisible()
})

// ─── Direct Marketing Engine ──────────────────────────────────────────────────

test('MarketingPage: loads page with segment cards', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.goto('/dashboard/marketing')

  await expect(page.getByText('Direct Marketing Engine')).toBeVisible()
  await expect(page.getByText('Everyone')).toBeVisible()
  await expect(page.getByText('New Customers')).toBeVisible()
  await expect(page.getByText('Slipping Away')).toBeVisible()
})

test('MarketingPage: shows customer from SLIPPING segment by default', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.goto('/dashboard/marketing')

  await expect(page.getByText('Amit Kumar')).toBeVisible()
})

test('MarketingPage: switching segment to New shows new customer', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.goto('/dashboard/marketing')

  await page.getByRole('button', { name: /new customers/i }).click()
  await expect(page.getByText('Priya Singh')).toBeVisible()
})

test('MarketingPage: template selection changes message body', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.goto('/dashboard/marketing')

  await page.getByText('🎉 Weekend Special').click()
  const textarea = page.getByRole('textbox', { name: /message body/i })
  await expect(textarea).toHaveValue(/weekend/i)
})

test('MarketingPage: shows campaign best practices', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.goto('/dashboard/marketing')

  await expect(page.getByText('📋 Campaign Best Practices')).toBeVisible()
})

// ─── Kitchen Smart Queue Throttling ──────────────────────────────────────────

test('KitchenPage: shows Queue Pressure bar', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.route('**/api/v1/orders/active**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )

  await page.goto('/dashboard/kitchen')

  await expect(page.getByText('Queue Pressure')).toBeVisible()
  await expect(page.getByText(/✓ LOW/i)).toBeVisible()
})

test('KitchenPage: renders active order cards', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.route('**/api/v1/orders/active**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACTIVE_ORDERS_STUB) })
  )
  await page.route('**/wss/**', (r) => r.abort())

  await page.goto('/dashboard/kitchen')

  await expect(page.getByText('Butter Chicken').first()).toBeVisible()
})

test('KitchenPage: can change queue limit', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.route('**/api/v1/orders/active**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )

  await page.goto('/dashboard/kitchen')
  await page.getByText(/max queue: 10 — change/i).click()

  const input = page.getByRole('spinbutton')
  await input.fill('5')
  await page.getByRole('button', { name: /save/i }).click()

  await expect(page.getByText(/max queue: 5 — change/i)).toBeVisible()
})

// ─── Performance Scorecards ───────────────────────────────────────────────────

test('StaffInsightsPage: shows Performance Scorecards section', async ({ page }) => {
  await authenticateAndStubApis(page)
  await page.route('**/api/v1/finance/expenses**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )

  await page.goto('/dashboard/staff')

  await expect(page.getByText('Performance Scorecards')).toBeVisible()
  await expect(page.getByText('Overall Performance Grade')).toBeVisible()
  await expect(page.getByText('Kitchen Speed')).toBeVisible()
  await expect(page.getByText('Waste Control')).toBeVisible()
  await expect(page.getByText('Order Volume')).toBeVisible()
})
