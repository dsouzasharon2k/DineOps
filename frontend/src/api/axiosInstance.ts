import axios from 'axios'

// Base axios instance - all API calls go through this.
// baseURL points to our Spring Boot backend.
// The interceptor automatically attaches the JWT token to every request.
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080',
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

export default axiosInstance