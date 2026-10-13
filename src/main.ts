import { createApp } from 'vue'
import App from './App.vue'
import { setupRouter } from './router'
import { setupStore } from './stores'
import './assets/styles/index.scss'
import './assets/styles/matchday.scss'

function bootstrap() {
  const app = createApp(App)

  // 先注册 Pinia，再注册路由（导航守卫中会用到 store）
  setupStore(app)
  setupRouter(app)

  app.mount('#app')
}

bootstrap()
