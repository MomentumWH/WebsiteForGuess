import { shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { resetSession } from '@/services/session'
import { useUserStore } from '@/stores/modules/user'
import type { LoginPayload } from '@/types/user'
import { getLoginRedirect } from '@/utils/route'

export function useLogin() {
  const router = useRouter()
  const route = useRoute()
  const message = useMessage()
  const userStore = useUserStore()
  const loading = shallowRef(false)

  async function login(payload: LoginPayload): Promise<void> {
    if (loading.value) return
    loading.value = true
    resetSession()
    try {
      await userStore.login(payload)
      await router.replace(getLoginRedirect(route.query.redirect))
      message.success('登录成功')
    } catch (error) {
      resetSession()
      message.error(error instanceof Error ? error.message : '登录失败，请稍后重试')
    } finally {
      loading.value = false
    }
  }

  return { loading, login }
}
