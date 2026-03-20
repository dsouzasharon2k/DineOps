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
  await page.getByPlaceholder('sharon@dineops.com').fill('bad@dineops.com')
  await page.getByPlaceholder('••••••••').fill('wrong-password')
  await page.getByRole('button', { name: 'Login' }).click()

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
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: mockToken }),
    })
  })

  await page.goto('/login')
  await page.getByPlaceholder('sharon@dineops.com').fill('owner@dineops.com')
  await page.getByPlaceholder('••••••••').fill('PasswordA1')
  await page.getByRole('button', { name: 'Login' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/dashboard/restaurants')
  await expect(page).toHaveURL(/\/dashboard\/restaurants$/)
  await page.goto('/dashboard/kitchen')
  await expect(page).toHaveURL(/\/dashboard\/kitchen$/)
})
