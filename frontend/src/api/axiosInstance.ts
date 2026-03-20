import axios from 'axios'
import { getApiErrorMessage } from './error'
import { tokenStore } from '../auth/tokenStore'

// Base axios instance - all API calls go through this.
// baseURL points to our Spring Boot backend.
// The interceptor automatically attaches the JWT token to every request.
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
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
      const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined
      const requestUrl = originalRequest?.url ?? ''
      const isAuthEndpoint = requestUrl.includes('/api/v1/auth/login') || requestUrl.includes('/api/v1/auth/refresh')
      if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true
        try {
          const refreshResponse = await axiosInstance.post<{ token: string }>('/api/v1/auth/refresh')
          tokenStore.setToken(refreshResponse.data.token)
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`
          return axiosInstance(originalRequest)
        } catch {
          tokenStore.clear()
          const isOnLoginPage = window.location.pathname === '/login'
          if (!isOnLoginPage) {
            window.location.href = '/login'
          }
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