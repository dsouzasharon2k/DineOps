export interface LoginResponse {
  token: string
}

export interface ApiError {
  status: number
  message: string
  timestamp: string
  path: string
  fieldErrors?: Record<string, string>
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}
