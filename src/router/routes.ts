import type { RouteRecordRaw } from 'vue-router'

const Layout = () => import('@/layout/index.vue')

/**
 * 静态（常量）路由：无需权限即可注册，应用启动时即存在。
 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Matchday',
    component: () => import('@/views/MatchdayView.vue'),
    meta: { title: 'MATCHDAY · 赛事预测', requiresAuth: false, minimalLayout: true },
  },
  {
    path: '/squad',
    name: 'ArsenalSquad',
    component: () => import('@/views/MatchdayView.vue'),
    meta: { title: 'MATCHDAY · 球队阵容', requiresAuth: false, minimalLayout: true },
  },
  { path: '/dashboard', redirect: '/', meta: { requiresAuth: false } },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true, requiresAuth: false },
  },
  {
    path: '/admin',
    component: Layout,
    redirect: '/admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页', icon: 'home', requiresAuth: true, keepAlive: true },
      },
    ],
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '403', hidden: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '404', hidden: true },
  },
]
