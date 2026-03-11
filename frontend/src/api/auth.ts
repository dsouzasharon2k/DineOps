import axiosInstance from './axiosInstance'

// Sends login credentials to the backend and returns the JWT token
export const loginApi = async (email: string, password: string) => {
  const response = await axiosInstance.post('/api/v1/auth/login', {
    email,
    password,
  })
  return response.data // { token: "eyJ..." }
}