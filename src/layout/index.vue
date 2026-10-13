<script setup lang="ts">
import { useAppStore } from '@/stores/modules/app'
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import AppContent from './components/AppContent.vue'

const appStore = useAppStore()
</script>

<template>
  <n-layout has-sider position="absolute" class="layout">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      :collapsed="appStore.sidebarCollapsed"
      :native-scrollbar="false"
    >
      <AppSidebar />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="layout-header">
        <AppHeader />
      </n-layout-header>

      <n-layout-content class="layout-content" :native-scrollbar="false">
        <AppContent />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style lang="scss" scoped>
.layout {
  height: 100%;
}

.layout-header {
  height: 56px;
  padding: 0 16px;
}

.layout-content {
  background-color: var(--body-color);
}
</style>
