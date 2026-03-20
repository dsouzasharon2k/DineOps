import type { User } from './user'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'

export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'ONLINE'

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
  tableNumber: string | null
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  estimatedReadyMinutes?: number
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
