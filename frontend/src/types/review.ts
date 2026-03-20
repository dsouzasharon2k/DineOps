export interface Review {
  id: string
  orderId: string
  tenantId: string
  rating: number
  comment: string | null
  createdAt: string
}
