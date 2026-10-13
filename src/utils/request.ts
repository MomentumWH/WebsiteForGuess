import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { appConfig } from '@/config/app'
import type { ApiResponse } from '@/types/api'
import { getToken } from './auth'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let unauthorizedHandler: (() => void) | undefined

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

const service = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15000,
})

service.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function handleUnauthorized(config?: AxiosRequestConfig): void {
  const token = getToken()
  if (token && config?.headers?.Authorization === `Bearer ${token}`) {
    unauthorizedHandler?.()
  }
}

service.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    handleUnauthorized(error.config)
    return Promise.reject(new ApiError('登录已过期，请重新登录', 401, 401))
  }
  return Promise.reject(error)
})

export async function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  const response = await service.request<ApiResponse<T>>(config)
  const result = response.data
  if (!result || typeof result.code !== 'number') {
    throw new ApiError('接口响应格式错误', -1, response.status)
  }
  if (result.code !== 0) {
    if (result.code === 401) handleUnauthorized(response.config)
    throw new ApiError(result.message || '请求失败', result.code, response.status)
  }
  return result.data
}
