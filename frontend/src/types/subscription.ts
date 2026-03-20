export type SubscriptionPlan = 'STARTER' | 'GROWTH' | 'ENTERPRISE'
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface Subscription {
  id: string
  tenantId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  startsAt: string
  expiresAt: string
  inGracePeriod: boolean
  monthlyOrderLimit: number
  providerSubscriptionRef: string | null
  checkoutUrl: string | null
}
