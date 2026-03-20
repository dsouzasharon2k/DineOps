export type RestaurantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export interface Restaurant {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  cuisineType: string | null
  logoUrl: string | null
  fssaiLicense: string | null
  gstNumber: string | null
  operatingHours: string | null
  averageRating: number
  status: RestaurantStatus
  createdAt: string
  updatedAt: string
}
