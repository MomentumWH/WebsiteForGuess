import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { Router, RouteRecordRaw } from 'vue-router'
import { constantRoutes } from '@/router/routes'
import { asyncRoutes } from '@/router/dynamic'
import { filterAsyncRoutes } from '@/utils/route'

export const usePermissionStore = defineStore('permission', () => {
  const isRoutesLoaded = shallowRef(false)
  const routes = shallowRef<RouteRecordRaw[]>([])
  let removeRoutes: Array<() => void> = []

  function resetRoutes(): void {
    removeRoutes.forEach((removeRoute) => removeRoute())
    removeRoutes = []
    routes.value = []
    isRoutesLoaded.value = false
  }

  function generateRoutes(router: Router, roles: string[]): RouteRecordRaw[] {
    resetRoutes()
    const accessedRoutes = filterAsyncRoutes(asyncRoutes, roles)
    removeRoutes = accessedRoutes.map((route) => router.addRoute(route))
    routes.value = [...constantRoutes, ...accessedRoutes]
    isRoutesLoaded.value = true
    return accessedRoutes
  }

  return { isRoutesLoaded, routes, generateRoutes, resetRoutes }
})
