import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const BASE = 'http://localhost:5173'
const TENANT = 'a085284e-ca00-4f64-a2c7-42fc0572bb97'

async function shot(page, name) {
  await page.screenshot({ path: `audit-shots/${name}.png`, fullPage: true })
  console.log(`saved audit-shots/${name}.png`)
}

const run = async () => {
  await mkdir('audit-shots', { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await shot(page, '1-login')

  await page.fill('#email', 'owner@dineops.com')
  await page.fill('#password', 'password')
  await page.click('button:has-text("Sign in"), button:has-text("Login")')
  await page.waitForURL('**/dashboard**', { timeout: 15000 })
  await page.waitForTimeout(1000)
  await shot(page, '2-dashboard')

  await page.goto(`${BASE}/dashboard/kitchen`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await shot(page, '3-kitchen')

  await page.goto(`${BASE}/dashboard/inventory`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '4-inventory')

  await page.goto(`${BASE}/dashboard/onboarding`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '5-onboarding')

  await page.goto(`${BASE}/menu/${TENANT}?table=4`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await shot(page, '6-public-menu')

  await browser.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
