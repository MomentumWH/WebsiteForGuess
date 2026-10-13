import type { Router } from 'vue-router'
import { appConfig } from '@/config/app'
import { usePermissionStore } from '@/stores/modules/permission'
import { useUserStore } from '@/stores/modules/user'
import { setUnauthorizedHandler } from '@/utils/request'

export function resetSession(): void {
  useUserStore().resetToken()
  usePermissionStore().resetRoutes()
}

export function setupSession(router: Router): void {
  setUnauthorizedHandler(() => {
    const currentRoute = router.currentRoute.value
    resetSession()
    if (currentRoute.matched.length && currentRoute.path !== appConfig.loginPath) {
      void router.replace({
        path: appConfig.loginPath,
        query: { redirect: currentRoute.fullPath },
      })
    }
  })
}
