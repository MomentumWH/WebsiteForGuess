<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

// 注释修改时间：2026-10-22
// 用途与逻辑：按需加载后台全局 Provider，通过异步组件隔离后台依赖与前台入口。
const AdminProviders = defineAsyncComponent(() => import('@/components/admin/AdminProviders.vue'))
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <template v-if="Component">
      <component :is="Component" v-if="route.meta.minimalLayout" />
      <AdminProviders v-else><component :is="Component" /></AdminProviders>
    </template>
  </RouterView>
</template>
