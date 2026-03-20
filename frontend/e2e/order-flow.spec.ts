import { expect, test } from '@playwright/test'

const tenantId = 'a085284e-ca00-4f64-a2c7-42fc0572bb97'
const orderId = '11111111-1111-1111-1111-111111111111'

test('public menu to place order to track status', async ({ page }) => {
  await page.route(`**/api/v1/restaurants/${tenantId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: tenantId,
        name: 'DineOps Test Restaurant',
        slug: 'dineops-test',
        address: 'MG Road',
        phone: '9999999999',
        cuisineType: 'Indian',
        logoUrl: null,
        fssaiLicense: null,
        gstNumber: null,
        operatingHours: '10:00 - 22:00',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    })
  })
  await page.route(`**/api/v1/restaurants/${tenantId}/categories`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'cat-1', name: 'Starters', description: '' }]),
    })
  })
  await page.route(`**/api/v1/restaurants/${tenantId}/categories/cat-1/items`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'item-1',
          tenantId,
          categoryId: 'cat-1',
          name: 'Paneer Tikka',
          description: 'Test item',
          price: 25000,
          isVegetarian: true,
          isAvailable: true,
          imageUrl: null,
          displayOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    })
  })
  await page.route('**/api/v1/orders', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: orderId,
        tenantId,
        customer: null,
        tableNumber: null,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        paymentMethod: 'CASH',
        totalAmount: 25000,
        notes: '',
        items: [
          {
            id: 'oi-1',
            menuItemId: 'item-1',
            name: 'Paneer Tikka',
            price: 25000,
            quantity: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    })
  })
  await page.route(`**/api/v1/orders/${orderId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: orderId,
        tenantId,
        customer: null,
        tableNumber: null,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        paymentMethod: 'CASH',
        totalAmount: 25000,
        notes: '',
        items: [
          {
            id: 'oi-1',
            menuItemId: 'item-1',
            name: 'Paneer Tikka',
            price: 25000,
            quantity: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    })
  })
  await page.route(`**/api/v1/orders/${orderId}/history`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.goto(`/menu/${tenantId}`)
  await page.getByRole('button', { name: 'ADD' }).click()
  await page.getByRole('button', { name: 'View Order' }).click()
  await page.getByRole('button', { name: /Place Order/ }).click()
  await expect(page).toHaveURL(new RegExp(`/menu/${tenantId}/order/${orderId}`))
  await expect(page.getByText('Order Placed')).toBeVisible()
})

test('kitchen view updates order status', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'fake.jwt.token' }),
    })
  })

  let orderStatus = 'PENDING'

  await page.route(`**/api/v1/orders/active?tenantId=${tenantId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: orderId,
          tenantId,
          customer: null,
          tableNumber: null,
          status: orderStatus,
          paymentStatus: 'UNPAID',
          paymentMethod: 'CASH',
          totalAmount: 25000,
          notes: '',
          items: [
            {
              id: 'oi-1',
              menuItemId: 'item-1',
              name: 'Paneer Tikka',
              price: 25000,
              quantity: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    })
  })

  await page.route(`**/api/v1/orders/${orderId}/status`, async (route) => {
    orderStatus = 'CONFIRMED'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: orderId,
        tenantId,
        customer: null,
        tableNumber: null,
        status: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        paymentMethod: 'CASH',
        totalAmount: 25000,
        notes: '',
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    })
  })

  await page.goto('/login')
  await page.getByPlaceholder('sharon@dineops.com').fill('staff@dineops.com')
  await page.getByPlaceholder('••••••••').fill('PasswordA1')
  await page.getByRole('button', { name: 'Login' }).click()
  await page.goto('/dashboard/kitchen')
  await page.getByRole('button', { name: /Confirm/ }).click()
  await expect(page.getByText('Confirmed')).toBeVisible()
})
