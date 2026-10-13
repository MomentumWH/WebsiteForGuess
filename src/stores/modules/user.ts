import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { getToken, removeToken, setToken } from '@/utils/auth'
import { getUserInfoApi, loginApi } from '@/api/modules/user'
import type { LoginPayload, UserInfo } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  const token = shallowRef(getToken() ?? '')
  const userInfo = shallowRef<UserInfo | null>(null)
  const roles = computed(() => userInfo.value?.roles ?? [])
  const isLoggedIn = computed(() => !!token.value)
  let sessionVersion = 0
  let userInfoRequest: Promise<UserInfo> | undefined

  function resetToken(): void {
    sessionVersion += 1
    token.value = ''
    userInfo.value = null
    userInfoRequest = undefined
    removeToken()
  }

  function fetchUserInfo(): Promise<UserInfo> {
    if (!token.value) return Promise.reject(new Error('请先登录'))
    if (userInfoRequest) return userInfoRequest
    const version = sessionVersion
    const pending = getUserInfoApi()
      .then((info) => {
        if (version !== sessionVersion) throw new Error('登录状态已变更，请重新登录')
        userInfo.value = info
        return info
      })
      .finally(() => {
        if (userInfoRequest === pending) userInfoRequest = undefined
      })
    userInfoRequest = pending
    return pending
  }

  async function login(payload: LoginPayload): Promise<void> {
    resetToken()
    const version = sessionVersion
    try {
      const result = await loginApi(payload)
      if (version !== sessionVersion) throw new Error('登录状态已变更，请重新登录')
      if (!result.token) throw new Error('登录接口未返回有效 Token')
      setToken(result.token)
      token.value = result.token
      await fetchUserInfo()
    } catch (error) {
      if (version === sessionVersion) resetToken()
      throw error
    }
  }

  return { token, userInfo, roles, isLoggedIn, login, fetchUserInfo, resetToken }
})
