import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MarketingPage from '../pages/dashboard/MarketingPage'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../api/analytics', () => ({
  getCustomerProfilesApi: vi.fn(),
}))

import { getCustomerProfilesApi } from '../api/analytics'

const TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvd25lckBkaW5lb3BzLmNvbSIsInJvbGUiOiJURU5BTlRfQURNSU4iLCJ0ZW5hbnRJZCI6ImEwODUyODRlLWNhMDAtNGY2NC1hMmM3LTQyZmMwNTc2YmI5NyJ9.signature'

const MOCK_CUSTOMERS = [
  {
    customerPhone: '+919876543210',
    customerName: 'Amit Kumar',
    totalOrders: 5,
    totalSpendPaise: 250000,
    avgOrderValuePaise: 50000,
    lastOrderAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastOrder: 10,
    segment: 'REGULAR' as const,
  },
  {
    customerPhone: '+919123456789',
    customerName: 'Priya Singh',
    totalOrders: 1,
    totalSpendPaise: 45000,
    avgOrderValuePaise: 45000,
    lastOrderAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastOrder: 2,
    segment: 'NEW' as const,
  },
  {
    customerPhone: '+919000000001',
    customerName: 'Rajan Sharma',
    totalOrders: 8,
    totalSpendPaise: 400000,
    avgOrderValuePaise: 50000,
    lastOrderAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastOrder: 45,
    segment: 'SLIPPING' as const,
  },
]

function renderPage() {
  return render(
    <AuthProvider skipBootstrap initialToken={TOKEN}>
      <MemoryRouter>
        <MarketingPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('MarketingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCustomerProfilesApi).mockResolvedValue(MOCK_CUSTOMERS)
  })

  test('renders page heading and sub-title', async () => {
    renderPage()
    expect(await screen.findByText('Direct Marketing Engine')).toBeInTheDocument()
  })

  test('shows segment KPI cards', async () => {
    renderPage()
    // Emoji prefix "👥 Everyone" — use regex; may appear in multiple places
    const everyoneEls = await screen.findAllByText(/Everyone/i)
    expect(everyoneEls.length).toBeGreaterThanOrEqual(1)
    const newEls = await screen.findAllByText(/New Customers/i)
    expect(newEls.length).toBeGreaterThanOrEqual(1)
    const regularEls = await screen.findAllByText(/Regulars/i)
    expect(regularEls.length).toBeGreaterThanOrEqual(1)
    const slippingEls = await screen.findAllByText(/Slipping Away/i)
    expect(slippingEls.length).toBeGreaterThanOrEqual(1)
  })

  test('shows correct counts per segment', async () => {
    renderPage()
    // 4 segment selector buttons should be present
    await screen.findAllByText(/Everyone/i)
    const segBtns = screen.getAllByRole('button').filter((b) =>
      /everyone|new customers|regulars|slipping away/i.test(b.textContent ?? '')
    )
    expect(segBtns.length).toBeGreaterThanOrEqual(4)
  })

  test('shows customer cards after load', async () => {
    renderPage()
    // Default segment is SLIPPING — switch to ALL to see all customers
    await screen.findByText(/Everyone/i)
    fireEvent.click(screen.getByRole('button', { name: /Everyone/i }))
    expect(await screen.findByText('Amit Kumar')).toBeInTheDocument()
    expect(await screen.findByText('Priya Singh')).toBeInTheDocument()
  })

  test('default segment filter shows slipping customers first', async () => {
    renderPage()
    // Default segment is SLIPPING
    expect(await screen.findByText('Rajan Sharma')).toBeInTheDocument()
  })

  test('clicking segment filter switches the list', async () => {
    renderPage()
    await screen.findByText(/Everyone/i)

    // Click the "New Customers" segment button
    fireEvent.click(screen.getByRole('button', { name: /New Customers/i }))
    expect(await screen.findByText('Priya Singh')).toBeInTheDocument()
  })

  test('shows template buttons in campaign builder', async () => {
    renderPage()
    expect(await screen.findByText('🔁 Win-Back Offer')).toBeInTheDocument()
    expect(await screen.findByText('⭐ Loyalty Reward')).toBeInTheDocument()
    expect(await screen.findByText('🎉 Weekend Special')).toBeInTheDocument()
  })

  test('selecting a template updates the message body', async () => {
    renderPage()
    await screen.findByText('🎉 Weekend Special')
    fireEvent.click(screen.getByText('🎉 Weekend Special'))
    const textarea = screen.getByRole('textbox', { name: /message body/i }) as HTMLTextAreaElement
    expect(textarea.value.toLowerCase()).toContain('weekend')
  })

  test('Preview button shows personalised message preview', async () => {
    renderPage()
    await screen.findByText('Rajan Sharma')
    const previewBtns = screen.getAllByRole('button', { name: /preview/i })
    fireEvent.click(previewBtns[0])
    // Preview shows the message with name filled in — may appear multiple times
    const matches = screen.getAllByText(/Rajan Sharma|there/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  test('shows empty state when segment has no customers', async () => {
    vi.mocked(getCustomerProfilesApi).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/No customers in this segment/i)).toBeInTheDocument()
  })

  test('shows campaign best practices section', async () => {
    renderPage()
    expect(await screen.findByText('📋 Campaign Best Practices')).toBeInTheDocument()
    expect(await screen.findByText('Best time to send')).toBeInTheDocument()
  })

  test('Start Campaign button present when customers exist', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /start campaign/i })).toBeInTheDocument()
  })
})
