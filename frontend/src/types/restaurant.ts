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
  defaultPrepTimeMinutes: number
  averageRating: number
  status: RestaurantStatus
  isOpenNow?: boolean
  createdAt: string
  updatedAt: string
}
