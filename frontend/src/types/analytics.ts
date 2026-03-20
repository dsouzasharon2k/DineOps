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
  ordersByStatus: StatusCount[]
  revenueTrend: RevenuePoint[]
  topMenuItems: ItemCount[]
  averagePreparationMinutes: number
}
