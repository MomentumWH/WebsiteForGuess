import type { RouteRecordRaw } from 'vue-router'

const Layout = () => import('@/layout/index.vue')

/**
 * 动态（权限）路由：登录后根据用户角色过滤并动态注册。
 * 真实项目中，此结构通常由后端接口返回。
 */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/system',
    name: 'System',
    component: Layout,
    redirect: '/system/user',
    meta: { title: '系统管理', icon: 'settings', roles: ['admin'] },
    children: [
      {
        path: 'user',
        name: 'SystemUser',
        component: () => import('@/views/system/user/index.vue'),
        meta: { title: '用户管理', roles: ['admin'] },
      },
      {
        path: 'role',
        name: 'SystemRole',
        component: () => import('@/views/system/role/index.vue'),
        meta: { title: '角色管理', roles: ['admin'] },
      },
    ],
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Layout,
    redirect: '/profile/index',
    meta: { title: '个人中心', icon: 'person' },
    children: [
      {
        path: 'index',
        name: 'ProfileIndex',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心' },
      },
    ],
  },
]
