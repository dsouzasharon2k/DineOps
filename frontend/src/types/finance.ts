export interface ExpenseEntry {
  id: string
  tenantId: string
  expenseDate: string
  category: string
  amount: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface DailyExpenseTotal {
  date: string
  amount: number
}

export interface CategoryExpenseTotal {
  category: string
  amount: number
}

export interface FinanceSummary {
  totalExpense: number
  byDay: DailyExpenseTotal[]
  byCategory: CategoryExpenseTotal[]
}

export interface CreateExpenseEntryPayload {
  tenantId: string
  expenseDate: string
  category: string
  amount: number
  notes?: string
}

export interface UpdateExpenseEntryPayload {
  expenseDate: string
  category: string
  amount: number
  notes?: string
}
