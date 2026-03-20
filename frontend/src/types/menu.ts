export interface MenuCategory {
  id: string
  tenantId: string
  name: string
  description: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MenuItem {
  id: string
  tenantId: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isVegetarian: boolean
  isAvailable: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}
