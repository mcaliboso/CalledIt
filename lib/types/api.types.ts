export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}

export function apiSuccess<T>(data: T, meta?: ApiResponse['meta']): ApiResponse<T> {
  return { success: true, data, ...(meta && { meta }) }
}

export function apiError(error: string): ApiResponse {
  return { success: false, error }
}
