export interface DailyDigest {
  date: string
  todaysRevenue: number
  todaysProfit: number
  todaysWastage: number
  todaysExpenses: number
  openTickets: number
  activeAlerts: number
  topActions: string[]
}
