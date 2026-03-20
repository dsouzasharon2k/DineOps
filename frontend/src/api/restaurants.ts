import axiosInstance from './axiosInstance'
import type { Restaurant } from '../types/restaurant'

// Fetches all restaurants from the backend
export const getRestaurantsApi = async (): Promise<Restaurant[]> => {
  const response = await axiosInstance.get<Restaurant[]>('/api/v1/restaurants')
  return response.data
}