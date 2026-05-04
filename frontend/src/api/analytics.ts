import axiosInstance from './axiosInstance'
import type { ActionRecommendation, AnalyticsSummary, ConversionFunnel } from '../types/analytics'

export interface CustomerProfile {
  customerPhone: string
  customerName: string | null
  totalOrders: number
  totalSpendPaise: number
  avgOrderValuePaise: number
  lastOrderAt: string | null
  daysSinceLastOrder: number
  segment: 'NEW' | 'REGULAR' | 'SLIPPING'
}

export const getCustomerProfilesApi = async (tenantId: string): Promise<CustomerProfile[]> => {
  const res = await axiosInstance.get<CustomerProfile[]>(`/api/v1/analytics/customer-profiles?tenantId=${tenantId}`)
  return res.data
}

export const getAnalyticsSummaryApi = async (
  tenantId: string,
  fromDate?: string,
  toDate?: string
): Promise<AnalyticsSummary> => {
  const params = new URLSearchParams({ tenantId })
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const res = await axiosInstance.get<AnalyticsSummary>(`/api/v1/analytics/summary?${params.toString()}`)
  return res.data
}

export const getActionsTodayApi = async (
  tenantId: string,
  fromDate?: string,
  toDate?: string
): Promise<ActionRecommendation[]> => {
  const params = new URLSearchParams({ tenantId })
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const res = await axiosInstance.get<ActionRecommendation[]>(`/api/v1/analytics/actions-today?${params.toString()}`)
  return res.data
}

export type ProductEventType =
  | 'MENU_VIEW'
  | 'CHECKOUT_START'
  | 'ORDER_PLACED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_SUCCEEDED'

type TrackProductEventPayload = {
  tenantId: string
  eventType: ProductEventType
  sessionId?: string
  orderId?: string
  source?: string
  metadata?: string
}

const SESSION_KEY = 'dineops_product_session_id'

export const getOrCreateProductSessionId = (): string => {
  const existing = localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`
  localStorage.setItem(SESSION_KEY, generated)
  return generated
}

export const trackProductEventApi = async (payload: TrackProductEventPayload): Promise<void> => {
  await axiosInstance.post('/api/v1/analytics/events', payload)
}

export const getConversionFunnelApi = async (
  tenantId: string,
  days = 7
): Promise<ConversionFunnel> => {
  const params = new URLSearchParams({ tenantId, days: String(days) })
  const res = await axiosInstance.get<ConversionFunnel>(`/api/v1/analytics/funnel?${params.toString()}`)
  return res.data
}
