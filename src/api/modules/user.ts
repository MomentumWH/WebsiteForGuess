import { request } from '@/utils/request'
import type { LoginPayload, LoginResult, UserInfo } from '@/types/user'

export async function loginApi(payload: LoginPayload): Promise<LoginResult> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { mockLogin } = await import('@/mock/user')
    return mockLogin(payload)
  }
  return request<LoginResult>({ url: '/auth/login', method: 'post', data: payload })
}

export async function getUserInfoApi(): Promise<UserInfo> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { mockUserInfo } = await import('@/mock/user')
    return mockUserInfo()
  }
  return request<UserInfo>({ url: '/user/info', method: 'get' })
}
