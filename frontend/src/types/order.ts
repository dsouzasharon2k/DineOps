import type { User } from './user'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'

export interface OrderItem {
  id: string
  menuItemId: string | null
  name: string
  price: number
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  tenantId: string
  customer: User | null
  status: OrderStatus
  totalAmount: number
  notes: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface OrderStatusHistoryEntry {
  id: string
  oldStatus: OrderStatus
  newStatus: OrderStatus
  changedBy: string | null
  changedAt: string
}
