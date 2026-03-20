import axiosInstance from './axiosInstance'
import type { Review } from '../types/review'
import type { PaginatedResponse } from '../types/api'

export const submitOrderReviewApi = async (
  orderId: string,
  rating: number,
  comment: string
): Promise<Review> => {
  const res = await axiosInstance.post<Review>(`/api/v1/orders/${orderId}/review`, {
    rating,
    comment: comment.trim() || null,
  })
  return res.data
}

export const getOrderReviewApi = async (orderId: string): Promise<Review> => {
  const res = await axiosInstance.get<Review>(`/api/v1/orders/${orderId}/review`)
  return res.data
}

export const getReviewsByTenantApi = async (tenantId: string): Promise<Review[]> => {
  const res = await axiosInstance.get<PaginatedResponse<Review>>(`/api/v1/reviews?tenantId=${tenantId}`)
  return res.data.content
}
