import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PublicMenuPage from '../pages/menu/PublicMenuPage'

vi.mock('../api/menu', () => ({
  getCategoriesApi: vi.fn(),
  getItemsApi: vi.fn(),
}))

vi.mock('../api/restaurants', () => ({
  getRestaurantByIdApi: vi.fn(),
}))

vi.mock('../hooks/useCart', () => ({
  useCart: vi.fn(() => ({
    addItem: vi.fn(),
    removeItem: vi.fn(),
    getQuantity: vi.fn(() => 0),
    total: 0,
    itemCount: 0,
  })),
}))

import { getCategoriesApi, getItemsApi } from '../api/menu'
import { getRestaurantByIdApi } from '../api/restaurants'

describe('PublicMenuPage', () => {
  test('renders restaurant and menu item from APIs', async () => {
    vi.mocked(getCategoriesApi).mockResolvedValueOnce([
      {
        id: 'cat-1',
        tenantId: 'tenant-1',
        name: 'Main Course',
        description: null,
        displayOrder: 1,
        isActive: true,
        createdAt: '2026-03-30',
        updatedAt: '2026-03-30',
      },
    ])
    vi.mocked(getRestaurantByIdApi).mockResolvedValueOnce({
      id: 'tenant-1',
      name: 'DineOps Bistro',
      slug: 'dineops-bistro',
      address: 'Pune',
      phone: null,
      cuisineType: null,
      gstNumber: null,
      fssaiLicense: null,
      averageRating: 4.6,
      operatingHours: null,
      defaultPrepTimeMinutes: 20,
      status: 'ACTIVE',
      isOpenNow: true,
      logoUrl: null,
      createdAt: '2026-03-30',
      updatedAt: '2026-03-30',
    })
    vi.mocked(getItemsApi).mockResolvedValueOnce([
      {
        id: 'item-1',
        tenantId: 'tenant-1',
        categoryId: 'cat-1',
        name: 'Paneer Tikka',
        description: 'Smoky starter',
        price: 29900,
        isVegetarian: true,
        imageUrl: null,
        prepTimeMinutes: 15,
        isAvailable: true,
        displayOrder: 1,
        dietType: 'VEG',
        servingSize: null,
        flavourProfile: [],
        allergens: [],
        ingredients: null,
        nutrition: [],
        createdAt: '2026-03-30',
        updatedAt: '2026-03-30',
      },
    ])

    render(
      <MemoryRouter initialEntries={['/menu/tenant-1']}>
        <Routes>
          <Route path="/menu/:tenantId" element={<PublicMenuPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('DineOps Bistro')).toBeInTheDocument()
    expect(await screen.findByText('Paneer Tikka')).toBeInTheDocument()
  })
})
