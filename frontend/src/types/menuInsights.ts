export type MenuQuadrant = 'STAR' | 'CASH_COW' | 'TRAP' | 'DOG'

export interface MenuInsightItem {
  itemName: string
  unitsSold: number
  revenue: number
  cogs: number
  profit: number
  marginPct: number
  quadrant: MenuQuadrant
}

export interface MenuInsightsResponse {
  items: MenuInsightItem[]
  recommendations: string[]
}
