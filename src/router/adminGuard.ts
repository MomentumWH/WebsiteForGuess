import type { NavigationGuardReturn, RouteLocationNormalized, Router } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { appConfig } from '@/config/app'
import { resetSession, setupSession } from '@/services/session'
import { usePermissionStore } from '@/stores/modules/permission'
import { useUserStore } from '@/stores/modules/user'

export function createAdminGuard(router: Router) {
  setupSession(router)
  NProgress.configure({ showSpinner: false })
  router.afterEach(() => NProgress.done())
  router.onError(() => NProgress.done())

  return async (to: RouteLocationNormalized): Promise<NavigationGuardReturn> => {
    NProgress.start()
    const userStore = useUserStore()
    const permissionStore = usePermissionStore()
    if (!userStore.token) {
      if (to.meta.requiresAuth === false) return true
      return { path: appConfig.loginPath, query: { redirect: to.fullPath } }
    }
    try {
      if (!userStore.userInfo) await userStore.fetchUserInfo()
      if (!permissionStore.isRoutesLoaded) {
        permissionStore.generateRoutes(router, userStore.roles)
        return { path: to.fullPath, replace: true }
      }
    } catch {
      resetSession()
      return { path: appConfig.loginPath, query: { redirect: to.fullPath } }
    }
    if (to.path === appConfig.loginPath) return { path: appConfig.homePath }
    return true
  }
}
