import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import KitchenPage from '../pages/dashboard/KitchenPage'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../api/menu', () => ({
  getActiveOrdersApi: vi.fn(),
  updateOrderStatusApi: vi.fn(),
}))

vi.mock('../realtime/ordersSocket', () => ({
  subscribeTenantOrders: vi.fn(() => () => undefined),
}))

import { getActiveOrdersApi, updateOrderStatusApi } from '../api/menu'
import type { Order, OrderStatus } from '../types/order'

const TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzdGFmZkBkaW5lb3BzLmNvbSIsInJvbGUiOiJTVEFGRiIsInRlbmFudElkIjoiYTA4NTI4NGUtY2EwMC00ZjY0LWEyYzctNDJmYzA1NzZiYjk3In0.signature'

const makeOrder = (id: string, status: OrderStatus = 'PENDING', minutesAgo = 2): Order => ({
  id,
  tenantId: 'a085284e-ca00-4f64-a2c7-42fc0572bb97',
  customer: null,
  tableNumber: '3',
  status,
  paymentStatus: 'UNPAID',
  paymentMethod: 'CASH',
  totalAmount: 25000,
  notes: null,
  createdAt: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  items: [
    { id: 'i1', menuItemId: 'm1', name: 'Butter Chicken', price: 25000, quantity: 1, createdAt: '', updatedAt: '' },
  ],
})

function renderPage() {
  return render(
    <AuthProvider skipBootstrap initialToken={TOKEN}>
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('KitchenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('shows empty state when there are no active orders', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('Kitchen View')).toBeInTheDocument()
    expect(await screen.findByText('No active orders')).toBeInTheDocument()
  })

  test('renders active order card with item name', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([makeOrder('ord-1')])
    renderPage()
    expect(await screen.findByText('Butter Chicken')).toBeInTheDocument()
  })

  test('shows table number on order card', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([makeOrder('ord-1')])
    renderPage()
    expect(await screen.findByText('T3')).toBeInTheDocument()
  })

  // ─── Smart Queue Throttling ─────────────────────────────────────────────────

  test('shows Queue Pressure bar', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('Queue Pressure')).toBeInTheDocument()
  })

  test('queue pressure shows LOW when no orders', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([])
    renderPage()
    await screen.findByText('Queue Pressure')
    expect(screen.getByText(/✓ LOW/i)).toBeInTheDocument()
  })

  test('queue pressure shows CRITICAL and warning banner when queue full', async () => {
    // Default limit is 10; create 10 active orders
    const orders = Array.from({ length: 10 }, (_, i) => makeOrder(`ord-${i}`, 'PENDING'))
    vi.mocked(getActiveOrdersApi).mockResolvedValue(orders)
    renderPage()
    await screen.findByText('Queue Pressure')
    expect(await screen.findByText(/🔴 PAUSING NEW ORDERS/i)).toBeInTheDocument()
    expect(await screen.findByText(/Kitchen at full capacity/i)).toBeInTheDocument()
  })

  test('queue pressure shows HIGH between 75% and 100%', async () => {
    // 8 orders with default limit 10 = 80%
    const orders = Array.from({ length: 8 }, (_, i) => makeOrder(`ord-${i}`, 'PREPARING'))
    vi.mocked(getActiveOrdersApi).mockResolvedValue(orders)
    renderPage()
    expect(await screen.findByText(/⚠ HIGH/i)).toBeInTheDocument()
  })

  test('can edit and save queue limit', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([])
    renderPage()
    await screen.findByText('Queue Pressure')

    // Click "change" to open editor
    fireEvent.click(screen.getByText(/Max queue: 10 — change/i))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(localStorage.getItem('platterops_queue_limit')).toBe('5')
    })
    expect(screen.getByText(/Max queue: 5 — change/i)).toBeInTheDocument()
  })

  test('queue limit persists across re-renders via localStorage', async () => {
    localStorage.setItem('platterops_queue_limit', '15')
    vi.mocked(getActiveOrdersApi).mockResolvedValue([])
    renderPage()
    await screen.findByText('Queue Pressure')
    expect(screen.getByText(/Max queue: 15 — change/i)).toBeInTheDocument()
  })

  // ─── Status update ──────────────────────────────────────────────────────────

  test('clicking Confirm updates order status', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([makeOrder('ord-1', 'PENDING')])
    vi.mocked(updateOrderStatusApi).mockResolvedValue(makeOrder('ord-1', 'CONFIRMED'))
    renderPage()
    await screen.findByText('Butter Chicken')
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => {
      expect(updateOrderStatusApi).toHaveBeenCalledWith('ord-1', 'CONFIRMED', expect.any(String))
    })
  })

  test('shows late-order warning for orders > 30 min old', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([makeOrder('ord-1', 'PREPARING', 35)])
    renderPage()
    await screen.findByText('Butter Chicken')
    // The order card should indicate lateness
    expect(screen.getByText(/35m ago|late/i)).toBeInTheDocument()
  })
})
