import axios from 'axios'
import type { ApiError } from '../types/api'

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.'

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string = FALLBACK_ERROR_MESSAGE
): string => {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.message ?? fallbackMessage
  }
  return fallbackMessage
}
