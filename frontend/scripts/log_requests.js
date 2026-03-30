import { chromium } from 'playwright'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  page.on('request', (req) => {
    console.log('REQ:', req.method(), req.url())
  })
  page.on('response', async (res) => {
    try {
      console.log('RES:', res.status(), res.url())
    } catch (e) {
      console.log('RES-ERR', e.message)
    }
  })

  const tenantId = 'a085284e-ca00-4f64-a2c7-42fc0572bb97'
  try {
    console.log('Navigating to menu page')
    await page.goto(`http://localhost:5173/menu/${tenantId}`, { waitUntil: 'networkidle', timeout: 15000 })
    // Let any client XHRs run
    await page.waitForTimeout(3000)
  } catch (e) {
    console.error('Navigation error:', e.message)
  } finally {
    await browser.close()
  }
})()
