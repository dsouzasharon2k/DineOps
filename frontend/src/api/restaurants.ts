import axiosInstance from './axiosInstance'

// Fetches all restaurants from the backend
export const getRestaurantsApi = async () => {
  const response = await axiosInstance.get('/api/v1/restaurants')
  return response.data // returns array of restaurants
}