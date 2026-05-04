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

export const registerApi = async (payload: {
  name: string
  email: string
  phone?: string
  password: string
  acceptTerms: boolean
}) => {
  const response = await axiosInstance.post('/api/v1/auth/register', payload)
  return response.data
}

export const sendOtpApi = async (phone: string) => {
  const response = await axiosInstance.post('/api/v1/auth/otp/send', { phone })
  return response.data
}

export const otpLoginApi = async (phone: string, otp: string): Promise<LoginResponse> => {
  const response = await axiosInstance.post<LoginResponse>('/api/v1/auth/otp/login', { phone, otp })
  return response.data
}

export const forgotPasswordApi = async (identifier: string) => {
  const response = await axiosInstance.post('/api/v1/auth/password/forgot', { identifier })
  return response.data
}

export const resetPasswordApi = async (identifier: string, otp: string, newPassword: string) => {
  const response = await axiosInstance.post('/api/v1/auth/password/reset', {
    identifier,
    otp,
    newPassword,
  })
  return response.data
}

export const setup2faApi = async (token: string) => {
  const response = await axiosInstance.post(
    '/api/v1/auth/2fa/setup',
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return response.data as { secret: string; qrCodeUrl: string }
}

export const enable2faApi = async (token: string, secret: string, code: number) => {
  const response = await axiosInstance.post(
    '/api/v1/auth/2fa/enable',
    { secret, code },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return response.data
}

export const verify2faApi = async (tempToken: string, code: number): Promise<LoginResponse> => {
  const response = await axiosInstance.post<LoginResponse>(
    '/api/v1/auth/2fa/verify',
    { code },
    { headers: { Authorization: `Bearer ${tempToken}` } }
  )
  return response.data
}