import { chromium } from 'playwright'

;(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  const tenantId = 'a085284e-ca00-4f64-a2c7-42fc0572bb97'
  try {
    console.log('Visiting /login')
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
    const hasWelcome = await page.locator('text=Welcome back').count()
    console.log('/login has Welcome back:', !!hasWelcome)

    console.log('Visiting /menu/' + tenantId)
    await page.goto(`http://localhost:5173/menu/${tenantId}`, { waitUntil: 'networkidle', timeout: 10000 })
    // Wait briefly for client fetches
    await page.waitForTimeout(1000)
    const fallback = await page.locator('text=Public page unavailable').count()
    console.log('/menu fallback present:', !!fallback)
    const addBtn = await page.locator('role=button[name="ADD"]').count()
    console.log('/menu ADD button present:', !!addBtn)
  } catch (e) {
    console.error('Script error:', e)
  } finally {
    await browser.close()
  }
})()
