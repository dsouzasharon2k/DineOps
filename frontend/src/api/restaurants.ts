import axiosInstance from './axiosInstance'
import type { Restaurant } from '../types/restaurant'
import type { PaginatedResponse } from '../types/api'

export interface CreateRestaurantPayload {
  name: string
  address?: string
  phone?: string
  cuisineType?: string
  logoUrl?: string
  fssaiLicense?: string
  gstNumber?: string
  ownerEmail?: string
}

// Fetches all restaurants from the backend
export const getRestaurantsApi = async (): Promise<Restaurant[]> => {
  const response = await axiosInstance.get<PaginatedResponse<Restaurant>>('/api/v1/restaurants')
  return response.data.content
}

export const createRestaurantApi = async (payload: CreateRestaurantPayload): Promise<Restaurant> => {
  const response = await axiosInstance.post<Restaurant>('/api/v1/restaurants', payload)
  return response.data
}