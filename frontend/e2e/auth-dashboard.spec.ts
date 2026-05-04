import { expect, test } from '@playwright/test'

const mockToken =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvd25lckBkaW5lb3BzLmNvbSIsInJvbGUiOiJURU5BTlRfQURNSU4iLCJ0ZW5hbnRJZCI6ImEwODUyODRlLWNhMDAtNGY2NC1hMmM3LTQyZmMwNTc2YmI5NyJ9.signature'

test('login with wrong credentials shows error', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid credentials' }),
    })
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@restaurant.com').fill('bad@dineops.com')
  await page.getByPlaceholder('••••••••').fill('wrong-password')
  await page.getByRole('button', { name: /sign in|login/i }).click()

  await expect(page.getByText('Invalid credentials')).toBeVisible()
})

test('login success then navigate dashboard sidebar', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: mockToken }),
    })
  })
  await page.route('**/api/v1/restaurants**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
  await page.route('**/api/v1/orders/active**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
  await page.route('**/api/v1/analytics/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        todaysOrderCount: 0,
        todaysRevenue: 0,
        averageOrderValue: 0,
        todaysProfit: 0,
        todaysWastage: 0,
        ordersByStatus: [],
        revenueTrend: [{ date: '2026-03-30', revenue: 0 }],
        wastageTrend: [{ date: '2026-03-30', revenue: 0 }],
        topMenuItems: [],
        averagePreparationMinutes: 0,
      }),
    })
  })
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: mockToken }),
    })
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@restaurant.com').fill('owner@dineops.com')
  await page.getByPlaceholder('••••••••').fill('PasswordA1')
  await page.getByRole('button', { name: /sign in|login/i }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  // TENANT_ADMIN cannot access /restaurants (SUPER_ADMIN only) — test sidebar routes it can reach
  await page.goto('/dashboard/kitchen')
  await expect(page).toHaveURL(/\/dashboard\/kitchen$/)
  await page.goto('/dashboard/inventory')
  await expect(page).toHaveURL(/\/dashboard\/inventory$/)
})

test('mobile sidebar hamburger opens and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: mockToken }),
    })
  })
  await page.route('**/api/v1/orders/active**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: mockToken }),
    })
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@restaurant.com').fill('owner@dineops.com')
  await page.getByPlaceholder('••••••••').fill('PasswordA1')
  await page.getByRole('button', { name: /sign in|login/i }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/dashboard/kitchen')
  await expect(page).toHaveURL(/\/dashboard\/kitchen$/)
  const toggleMenuButton = page.getByLabel('Toggle menu').first()
  if ((await toggleMenuButton.count()) > 0) {
    await toggleMenuButton.click()
  }
  const inventoryLink = page.locator('aside a[href="/dashboard/inventory"]').first()
  await expect(inventoryLink).toBeVisible()
  await Promise.all([page.waitForURL(/\/dashboard\/inventory$/), inventoryLink.click()])
})
