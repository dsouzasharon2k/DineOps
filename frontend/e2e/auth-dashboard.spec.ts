import { expect, test } from '@playwright/test'

test('login with wrong credentials shows error', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid credentials' }),
    })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('bad@dineops.com')
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Login' }).click()

  await expect(page.getByText('Invalid credentials')).toBeVisible()
})

test('login success then navigate dashboard sidebar', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'fake.jwt.token' }),
    })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@dineops.com')
  await page.getByLabel('Password').fill('PasswordA1')
  await page.getByRole('button', { name: 'Login' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('link', { name: /Restaurants/ }).click()
  await expect(page).toHaveURL(/\/dashboard\/restaurants$/)
  await page.getByRole('link', { name: /Kitchen/ }).click()
  await expect(page).toHaveURL(/\/dashboard\/kitchen$/)
})
