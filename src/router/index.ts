import { createRouter, createWebHistory } from 'vue-router'
import type { App } from 'vue'
import { constantRoutes } from './routes'
import { setupRouterGuard } from './guard'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 }),
})

export function setupRouter(app: App): void {
  setupRouterGuard(router)
  app.use(router)
}

export default router
