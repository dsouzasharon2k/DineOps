import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WastagePage from '../pages/dashboard/WastagePage'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../api/wastage', () => ({
  getWastageApi: vi.fn(),
  logWastageApi: vi.fn(),
}))

vi.mock('../api/menu', () => ({
  getCategoriesApi: vi.fn(),
  getItemsApi: vi.fn(),
}))

vi.mock('../api/analytics', () => ({
  getAnalyticsSummaryApi: vi.fn(),
}))

import { getWastageApi, logWastageApi } from '../api/wastage'
import { getCategoriesApi, getItemsApi } from '../api/menu'
import { getAnalyticsSummaryApi } from '../api/analytics'

const TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvd25lckBkaW5lb3BzLmNvbSIsInJvbGUiOiJURU5BTlRfQURNSU4iLCJ0ZW5hbnRJZCI6ImEwODUyODRlLWNhMDAtNGY2NC1hMmM3LTQyZmMwNTc2YmI5NyJ9.signature'

const EVENTS = [
  {
    id: 'e1',
    tenantId: 't1',
    menuItemId: 'mi1',
    menuItemName: 'Paneer',
    quantity: 2,
    unitCost: 5000,
    reason: 'Expired',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'e2',
    tenantId: 't1',
    menuItemId: 'mi2',
    menuItemName: 'Tomatoes',
    quantity: 3,
    unitCost: 800,
    reason: 'Spoiled',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

function setupMocks(events = EVENTS) {
  vi.mocked(getCategoriesApi).mockResolvedValue([
    {
      id: 'cat1',
      tenantId: 't1',
      name: 'Main',
      description: '',
      displayOrder: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ])
  vi.mocked(getItemsApi).mockResolvedValue([
    {
      id: 'mi1',
      tenantId: 't1',
      categoryId: 'cat1',
      name: 'Paneer',
      description: '',
      price: 15000,
      imageUrl: null,
      isVegetarian: true,
      isAvailable: true,
      displayOrder: 0,
      prepTimeMinutes: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ])
  vi.mocked(getWastageApi).mockResolvedValue(events)
  vi.mocked(getAnalyticsSummaryApi).mockResolvedValue({
    todaysRevenue: 200000,
    todaysOrderCount: 10,
    averageOrderValue: 20000,
    todaysProfit: 40000,
    todaysWastage: 5000,
    averagePreparationMinutes: 15,
    ordersByStatus: [],
    revenueTrend: [{ date: '2026-04-16', revenue: 200000 }],
    wastageTrend: [],
    topMenuItems: [],
  })
}

function renderPage() {
  return render(
    <AuthProvider skipBootstrap initialToken={TOKEN}>
      <MemoryRouter>
        <WastagePage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('WastagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('renders page heading', async () => {
    renderPage()
    expect(await screen.findByText('Waste Analytics')).toBeInTheDocument()
  })

  test('shows KPI cards after load', async () => {
    renderPage()
    expect(await screen.findByText('Total Waste (30d)')).toBeInTheDocument()
    expect(await screen.findByText('Avg Daily Waste')).toBeInTheDocument()
    expect(await screen.findByText('Waste % of Revenue')).toBeInTheDocument()
  })

  test('shows top wasted items section', async () => {
    renderPage()
    expect(await screen.findByText('Top wasted items (30d)')).toBeInTheDocument()
    // Paneer may appear in multiple sections (top items + recent log)
    const paneerEls = await screen.findAllByText('Paneer')
    expect(paneerEls.length).toBeGreaterThanOrEqual(1)
  })

  test('shows recent waste log with event data', async () => {
    renderPage()
    expect(await screen.findByText('Recent Waste Log')).toBeInTheDocument()
    const paneerEls = await screen.findAllByText(/Paneer/)
    expect(paneerEls.length).toBeGreaterThanOrEqual(1)
    const expiredEls = await screen.findAllByText(/Expired/)
    expect(expiredEls.length).toBeGreaterThanOrEqual(1)
  })

  test('shows waste by reason breakdown', async () => {
    renderPage()
    expect(await screen.findByText('Waste by reason (30d)')).toBeInTheDocument()
    expect(await screen.findByText('Expired')).toBeInTheDocument()
    expect(await screen.findByText('Spoiled')).toBeInTheDocument()
  })

  test('shows empty state for top items when no wastage', async () => {
    vi.mocked(getWastageApi).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('No waste recorded yet — great!')).toBeInTheDocument()
  })

  test('Log Waste button reveals the form', async () => {
    renderPage()
    await screen.findByText('Waste Analytics')
    const btn = screen.getByRole('button', { name: /log waste/i })
    fireEvent.click(btn)
    expect(await screen.findByText('Log wastage event')).toBeInTheDocument()
  })

  test('submitting waste form calls logWastageApi', async () => {
    vi.mocked(logWastageApi).mockResolvedValue({
      id: 'new-e',
      tenantId: 't1',
      menuItemId: 'mi1',
      menuItemName: 'Paneer',
      quantity: 1,
      unitCost: 5000,
      reason: 'Expired',
      createdAt: new Date().toISOString(),
    })
    renderPage()
    await screen.findByText('Waste Analytics')

    // Open the form
    fireEvent.click(screen.getByRole('button', { name: /log waste/i }))
    await screen.findByText('Log wastage event')

    // Select item — uses aria-label="Menu item"
    const select = screen.getByRole('combobox', { name: /menu item/i })
    fireEvent.change(select, { target: { value: 'mi1' } })

    // After form is open there are two "Log Waste" buttons — use the last (submit)
    const logWasteBtns = screen.getAllByRole('button', { name: /log waste/i })
    fireEvent.click(logWasteBtns[logWasteBtns.length - 1])

    await waitFor(() => {
      expect(logWastageApi).toHaveBeenCalled()
    })
  })

  test('shows 7-day trend chart section', async () => {
    renderPage()
    expect(await screen.findByText('Waste trend — 7 days')).toBeInTheDocument()
  })

  test('shows reduction playbook when waste % is high', async () => {
    // 13% waste (26000 of 200000 revenue)
    vi.mocked(getWastageApi).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        id: `e${i}`,
        tenantId: 't1',
        menuItemId: 'mi1',
        menuItemName: 'Paneer',
        quantity: 10,
        unitCost: 5000,
        reason: 'Expired',
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      }))
    )
    renderPage()
    expect(await screen.findByText('🎯 Waste Reduction Playbook')).toBeInTheDocument()
  })
})
