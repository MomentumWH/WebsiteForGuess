import type { RouteRecordRaw } from 'vue-router'
import { appConfig } from '@/config/app'

export function hasRoutePermission(roles: string[], route: RouteRecordRaw): boolean {
  const required = route.meta?.roles
  return !required?.length || roles.some((role) => required.includes(role))
}

export function filterAsyncRoutes(
  routes: RouteRecordRaw[],
  roles: string[],
  basePath = '',
): RouteRecordRaw[] {
  return routes.flatMap((route) => {
    if (!hasRoutePermission(roles, route)) return []
    if (!route.children?.length) return [{ ...route }]
    const fullPath = resolveRoutePath(basePath, route.path)
    const children = filterAsyncRoutes(route.children, roles, fullPath)
    if (!children.length) return []
    const filtered = { ...route, children }
    if (typeof filtered.redirect === 'string') {
      const accessiblePaths = children.map((child) => resolveRoutePath(fullPath, child.path))
      if (!accessiblePaths.includes(filtered.redirect)) filtered.redirect = accessiblePaths[0]
    }
    return [filtered]
  })
}

export function resolveRoutePath(basePath: string, path: string): string {
  if (path.startsWith('/')) return path
  return `${basePath}/${path}`.replace(/\/+/g, '/')
}

export function getLoginRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return appConfig.homePath
  }
  if (value.includes('\\') || Array.from(value).some((character) => character.charCodeAt(0) < 32)) {
    return appConfig.homePath
  }
  const path = value.split(/[?#]/)[0].replace(/\/+$/, '')
  return path === appConfig.loginPath ? appConfig.homePath : value
}
