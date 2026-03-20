import axiosInstance from './axiosInstance'
import type { Subscription, SubscriptionPlan } from '../types/subscription'

export const getCurrentSubscriptionApi = async (tenantId: string): Promise<Subscription | null> => {
  try {
    const res = await axiosInstance.get<Subscription>(`/api/v1/subscriptions?tenantId=${tenantId}`)
    if (res.status === 204 || !res.data) return null
    return res.data
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 204 || status === 404) return null
    throw err
  }
}

export const startSubscriptionApi = async (
  tenantId: string,
  plan: SubscriptionPlan
): Promise<Subscription> => {
  const res = await axiosInstance.post<Subscription>('/api/v1/subscriptions/checkout', { tenantId, plan })
  return res.data
}
