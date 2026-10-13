<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

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
