export interface StatusCount {
  status: string
  count: number
}

export interface RevenuePoint {
  date: string
  revenue: number
}

export interface ItemCount {
  name: string
  count: number
}

export interface AnalyticsSummary {
  todaysOrderCount: number
  todaysRevenue: number
  averageOrderValue: number
  todaysProfit: number
  todaysWastage: number
  ordersByStatus: StatusCount[]
  revenueTrend: RevenuePoint[]
  wastageTrend: RevenuePoint[]
  topMenuItems: ItemCount[]
  averagePreparationMinutes: number
}

export interface ActionRecommendation {
  title: string
  rationale: string
  estimatedImpactPaise: number
  impactWindow: string
}

export interface ConversionFunnel {
  windowDays: number
  menuViews: number
  checkoutStarts: number
  ordersPlaced: number
  paymentsInitiated: number
  paymentsSucceeded: number
  menuToCheckoutRatePct: number
  checkoutToOrderRatePct: number
  orderToPaymentSuccessRatePct: number
}
