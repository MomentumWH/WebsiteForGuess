import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { footballPlugin } from './server/football/plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      vue(),
      footballPlugin(env),
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
        dts: 'src/types/auto-imports.d.ts',
      }),
      // Naive UI 组件按需自动导入（含类型声明）
      Components({
        resolvers: [NaiveUiResolver()],
        dts: 'src/types/components.d.ts',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // Pre-bundle the small public workspace runtime. Discover admin-only
    // dependencies when those routes are actually requested.
    optimizeDeps: {
      entries: [],
      holdUntilCrawlEnd: false,
      include: [
        'vue',
        'vue-router',
        'pinia',
        // These tiny icon modules are first discovered after login. Preparing
        // them early avoids an optimizer reload interrupting that navigation.
        ...[
          'HomeOutline',
          'SettingsOutline',
          'PersonOutline',
          'LogOutOutline',
          'MenuOutline',
          'MoonOutline',
          'SunnyOutline',
        ].map((name) => `@vicons/ionicons5/es/${name}`),
      ],
    },
    server: {
      host: true,
      port: 4444,
      strictPort: true,
      // The local pnpm content store contains many unrelated cache files.
      // Git ignores do not automatically exclude it from Vite's file watcher.
      watch: {
        ignored: ['**/.pnpm-store/**', '**/.idea/**', '**/.cache/**'],
      },
      // 后端联调时代理 /api 到后端服务
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      target: 'es2022',
      outDir: 'dist',
    },
  }
})
