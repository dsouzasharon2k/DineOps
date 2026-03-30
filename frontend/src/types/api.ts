export interface LoginResponse {
  token?: string
  requires2fa?: boolean
  tempToken?: string
}

export interface ApiError {
  status: number
  errorCode?: string
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
