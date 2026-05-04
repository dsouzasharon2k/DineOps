import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardHome from '../pages/dashboard/DashboardHome'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../api/analytics', () => ({
  getAnalyticsSummaryApi: vi.fn(),
  getActionsTodayApi: vi.fn(),
  getCustomerProfilesApi: vi.fn(),
  getConversionFunnelApi: vi.fn(),
}))

vi.mock('../api/alerts', () => ({
  getAlertsSummaryApi: vi.fn(),
  getUnreadAlertsCountApi: vi.fn(),
}))

vi.mock('../api/menuInsights', () => ({
  getMenuInsightsApi: vi.fn(),
}))

vi.mock('../api/finance', () => ({
  getFinanceSummaryApi: vi.fn(),
}))

vi.mock('../api/menu', () => ({
  getActiveOrdersApi: vi.fn(),
}))

vi.mock('../api/inventory', () => ({
  getInventoryByTenantApi: vi.fn(),
}))

import { getAnalyticsSummaryApi, getActionsTodayApi, getConversionFunnelApi } from '../api/analytics'
import { getAlertsSummaryApi } from '../api/alerts'
import { getMenuInsightsApi } from '../api/menuInsights'
import { getFinanceSummaryApi } from '../api/finance'
import { getActiveOrdersApi } from '../api/menu'
import { getInventoryByTenantApi } from '../api/inventory'

const MOCK_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvd25lckBkaW5lb3BzLmNvbSIsInJvbGUiOiJURU5BTlRfQURNSU4iLCJ0ZW5hbnRJZCI6ImEwODUyODRlLWNhMDAtNGY2NC1hMmM3LTQyZmMwNTc2YmI5NyJ9.signature'

const MOCK_SUMMARY = {
  todaysOrderCount: 12,
  todaysRevenue: 245000,
  averageOrderValue: 20416,
  todaysProfit: 44000,
  todaysWastage: 3800,
  averagePreparationMinutes: 14.2,
  ordersByStatus: [
    { status: 'PENDING', count: 3 },
    { status: 'CONFIRMED', count: 4 },
    { status: 'PREPARING', count: 2 },
  ],
  revenueTrend: [
    { date: '2026-04-15', revenue: 180000 },
    { date: '2026-04-16', revenue: 245000 },
  ],
  wastageTrend: [
    { date: '2026-04-15', revenue: 1600 },
    { date: '2026-04-16', revenue: 3800 },
  ],
  topMenuItems: [
    { name: 'Butter Chicken', count: 11 },
    { name: 'Naan', count: 8 },
  ],
}

function setupMocks() {
  vi.mocked(getAnalyticsSummaryApi).mockResolvedValue(MOCK_SUMMARY)
  vi.mocked(getActionsTodayApi).mockResolvedValue([])
  vi.mocked(getAlertsSummaryApi).mockResolvedValue([])
  vi.mocked(getMenuInsightsApi).mockResolvedValue({ recommendations: [], items: [] })
  vi.mocked(getFinanceSummaryApi).mockResolvedValue(null as never)
  vi.mocked(getActiveOrdersApi).mockResolvedValue([])
  vi.mocked(getInventoryByTenantApi).mockResolvedValue([])
  vi.mocked(getConversionFunnelApi).mockResolvedValue({
    windowDays: 7,
    menuViews: 100,
    checkoutStarts: 45,
    ordersPlaced: 20,
    paymentsInitiated: 12,
    paymentsSucceeded: 10,
    menuToCheckoutRatePct: 45,
    checkoutToOrderRatePct: 44.4,
    orderToPaymentSuccessRatePct: 50,
  })
}

function renderDashboard() {
  return render(
    <AuthProvider skipBootstrap initialToken={MOCK_TOKEN}>
      <MemoryRouter>
        <DashboardHome />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('DashboardHome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('renders dashboard heading', async () => {
    renderDashboard()
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })

  test('shows today\'s revenue card', async () => {
    renderDashboard()
    expect(await screen.findByText("Today's revenue")).toBeInTheDocument()
  })

  test('shows today\'s orders count', async () => {
    renderDashboard()
    expect(await screen.findByText("Today's orders")).toBeInTheDocument()
    const values = await screen.findAllByText('12')
    expect(values.length).toBeGreaterThanOrEqual(1)
  })

  test('shows commission savings banner', async () => {
    renderDashboard()
    expect(await screen.findByText('Commission Saved This Month')).toBeInTheDocument()
  })

  test('shows prime cost meter', async () => {
    renderDashboard()
    expect(await screen.findByText('Prime Cost Meter')).toBeInTheDocument()
  })

  test('shows live order stream section', async () => {
    renderDashboard()
    expect(await screen.findByText('Live Order Stream')).toBeInTheDocument()
  })

  test('shows top menu items chart', async () => {
    renderDashboard()
    expect(await screen.findByText('Top 5 menu items')).toBeInTheDocument()
    const allButter = await screen.findAllByText('Butter Chicken')
    expect(allButter.length).toBeGreaterThanOrEqual(1)
  })

  test('shows daily closing report link', async () => {
    renderDashboard()
    const link = await screen.findByRole('link', { name: /daily closing report/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/dashboard/closing-report')
  })

  test('shows Quick Insights top seller when top items available', async () => {
    renderDashboard()
    expect(await screen.findByText(/Top Seller/i)).toBeInTheDocument()
    const allButter = await screen.findAllByText('Butter Chicken')
    expect(allButter.length).toBeGreaterThanOrEqual(1)
  })

  test('shows empty live order stream when no active orders', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([])
    renderDashboard()
    expect(await screen.findByText('No active orders right now.')).toBeInTheDocument()
  })

  test('shows live order card when active orders exist', async () => {
    vi.mocked(getActiveOrdersApi).mockResolvedValue([
      {
        id: 'order-abc-123-xyz',
        tenantId: 'a085284e-ca00-4f64-a2c7-42fc0572bb97',
        customer: null,
        tableNumber: '5',
        status: 'PREPARING',
        paymentStatus: 'UNPAID',
        paymentMethod: 'CASH',
        totalAmount: 35000,
        notes: null,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        items: [{ id: 'i1', menuItemId: 'm1', name: 'Butter Chicken', price: 25000, quantity: 1, createdAt: '', updatedAt: '' }],
      },
    ])
    renderDashboard()
    expect(await screen.findByText(/123-XYZ|XYZ/i)).toBeInTheDocument()
    expect(await screen.findByText(/Table 5/i)).toBeInTheDocument()
  })

  test('shows low stock alert when RED inventory items exist', async () => {
    vi.mocked(getInventoryByTenantApi).mockResolvedValue([
      {
        id: 'inv-1',
        menuItemId: 'mi-1',
        menuItemName: 'Tomatoes',
        tenantId: 'a085284e-ca00-4f64-a2c7-42fc0572bb97',
        menuItemAvailable: true,
        quantity: 1,
        lowStockThreshold: 5,
        lowStock: true,
        unit: 'kg',
        vendorPhone: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    renderDashboard()
    expect(await screen.findByText('🔴 Low Stock')).toBeInTheDocument()
    expect(await screen.findByText('Tomatoes')).toBeInTheDocument()
  })

  test('shows status breakdown from summary', async () => {
    renderDashboard()
    expect(await screen.findByText('Status Breakdown')).toBeInTheDocument()
  })

  test('renders without crash when all APIs return empty', async () => {
    vi.mocked(getAnalyticsSummaryApi).mockResolvedValue({
      ...MOCK_SUMMARY,
      topMenuItems: [],
      ordersByStatus: [],
      todaysRevenue: 0,
      todaysOrderCount: 0,
    })
    renderDashboard()
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })
})
