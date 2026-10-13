import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Standalone workspace; skip the admin UI and session initialization. */
    minimalLayout?: boolean
    /** 菜单/面包屑标题 */
    title?: string
    /** 图标名（见 utils/icon.ts） */
    icon?: string
    /** 是否在菜单中隐藏 */
    hidden?: boolean
    /** 默认需要登录，仅显式 false 时允许匿名访问 */
    requiresAuth?: boolean
    /** 可访问该路由的角色列表 */
    roles?: string[]
    /** 是否缓存页面，按路径缓存，最多保留 10 个页面 */
    keepAlive?: boolean
  }
}
