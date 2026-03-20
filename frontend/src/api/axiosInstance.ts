import axios from 'axios'
import { getApiErrorMessage } from './error'

// Base axios instance - all API calls go through this.
// baseURL points to our Spring Boot backend.
// The interceptor automatically attaches the JWT token to every request.
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - runs before every API call
// Reads the token from localStorage and adds it to the Authorization header
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handles common API failures in one place.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 401) {
        localStorage.removeItem('token')
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