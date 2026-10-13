import { getToken } from '@/utils/auth'
import type { LoginPayload, LoginResult, UserInfo } from '@/types/user'

const accounts = [
  { username: 'admin', nickname: '管理员', role: 'admin', id: 1 },
  { username: 'user', nickname: '普通用户', role: 'user', id: 2 },
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function mockLogin(payload: LoginPayload): Promise<LoginResult> {
  await delay(500)
  const account = accounts.find((item) => item.username === payload.username)
  if (!account || payload.password !== '123456') {
    throw new Error('用户名或密码错误')
  }
  return { token: `mock-token-${account.username}` }
}

export async function mockUserInfo(): Promise<UserInfo> {
  const token = getToken()
  await delay(300)
  const account = accounts.find((item) => token === `mock-token-${item.username}`)
  if (!account) throw new Error('登录已过期，请重新登录')
  return {
    id: account.id,
    username: account.username,
    nickname: account.nickname,
    avatar: '',
    roles: [account.role],
  }
}
