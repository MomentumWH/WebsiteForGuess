import type { Router } from 'vue-router'
import { appConfig } from '@/config/app'
import type { createAdminGuard } from './adminGuard'

export function setupRouterGuard(router: Router): void {
  let adminGuard: Promise<ReturnType<typeof createAdminGuard>> | undefined
  router.beforeEach(async (to) => {
    if (to.meta.minimalLayout) return true
    adminGuard ??= import('./adminGuard').then(({ createAdminGuard }) => createAdminGuard(router))
    return (await adminGuard)(to)
  })
  router.afterEach((to, _from, failure) => {
    if (!failure) {
      document.title =
        to.name === 'Matchday'
          ? 'MATCHDAY · 赛事预测'
          : to.meta.title
            ? `${to.meta.title} - ${appConfig.title}`
            : appConfig.title
    }
  })
}
