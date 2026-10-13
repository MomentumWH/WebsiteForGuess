import type { RouteRecordRaw } from 'vue-router'
import type { MenuOption } from 'naive-ui'
import { renderIcon } from './icon'
import { resolveRoutePath } from './route'

export function buildMenuOptions(routes: RouteRecordRaw[], basePath = ''): MenuOption[] {
  return routes.flatMap((route): MenuOption[] => {
    if (route.meta?.hidden) return []
    const fullPath = resolveRoutePath(basePath, route.path)
    const children = buildMenuOptions(route.children ?? [], fullPath)
    if (!route.meta?.title && children.length) return children
    const option: MenuOption = {
      label: route.meta?.title ?? String(route.name ?? ''),
      key: fullPath,
      icon: route.meta?.icon ? renderIcon(route.meta.icon) : undefined,
    }
    if (children.length === 1 && !children[0].children) {
      return [{ ...option, key: children[0].key }]
    }
    if (children.length) option.children = children
    return [option]
  })
}
