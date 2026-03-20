import axiosInstance from './axiosInstance'
import type { LoginResponse } from '../types/api'

// Sends login credentials to the backend and returns the JWT token
export const loginApi = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await axiosInstance.post<LoginResponse>('/api/v1/auth/login', {
    email,
    password,
  })
  return response.data
}

export const refreshTokenApi = async (): Promise<LoginResponse> => {
  const response = await axiosInstance.post<LoginResponse>('/api/v1/auth/refresh')
  return response.data
}

export const logoutApi = async (): Promise<void> => {
  await axiosInstance.post('/api/v1/auth/logout')
}