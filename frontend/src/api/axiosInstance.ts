import axios from 'axios'
import { getApiErrorMessage } from './error'
import { tokenStore } from '../auth/tokenStore'

type RetryableAxiosRequest = {
  _retry?: boolean
  headers?: Record<string, string>
  url?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
let refreshRequest: Promise<string> | null = null

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - runs before every API call
// Reads the access token from in-memory store and adds Authorization.
axiosInstance.interceptors.request.use((config) => {
  const token = tokenStore.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handles common API failures in one place.
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const originalRequest = error.config as (typeof error.config & RetryableAxiosRequest) | undefined
      const requestUrl = originalRequest?.url ?? ''
      const currentToken = tokenStore.getToken()
      const isAuthEndpoint = requestUrl.includes('/api/v1/auth/login') || requestUrl.includes('/api/v1/auth/refresh')
      if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint && !!currentToken) {
        originalRequest._retry = true
        try {
          if (!refreshRequest) {
            refreshRequest = axiosInstance
              .post<{ token: string }>('/api/v1/auth/refresh')
              .then((response) => response.data.token)
              .finally(() => {
                refreshRequest = null
              })
          }
          const refreshedToken = await refreshRequest
          tokenStore.setToken(refreshedToken)
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${refreshedToken}`
          return axiosInstance(originalRequest)
        } catch {
          tokenStore.clear()
          const isOnLoginPage = window.location.pathname === '/login'
          if (!isOnLoginPage) {
            window.location.href = '/login'
          }
        }
      } else if (status === 401 && isAuthEndpoint) {
        tokenStore.clear()
        const isOnLoginPage = window.location.pathname === '/login'
        if (!isOnLoginPage) {
          window.location.href = '/login'
        }
      }

      // Normalize message so UI can read one field.
      const message = getApiErrorMessage(error)
      if (error.response?.data && typeof error.response.data === 'object') {
        ;(error.response.data as { message?: string }).message = message
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance