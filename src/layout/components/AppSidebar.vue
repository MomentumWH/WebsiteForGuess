<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { appConfig } from '@/config/app'
import { useAppStore } from '@/stores/modules/app'
import { usePermissionStore } from '@/stores/modules/permission'
import { buildMenuOptions } from '@/utils/menu'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const permissionStore = usePermissionStore()
const menuOptions = computed(() => buildMenuOptions(permissionStore.routes))
const activeKey = computed(() => route.path)

function handleSelect(key: string): void {
  void router.push(key)
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-logo" :title="appConfig.title">
      <span v-if="!appStore.sidebarCollapsed">{{ appConfig.title }}</span>
      <span v-else>W</span>
    </div>
    <n-menu
      :value="activeKey"
      :options="menuOptions"
      :collapsed="appStore.sidebarCollapsed"
      :collapsed-width="64"
      :collapsed-icon-size="20"
      @update:value="handleSelect"
    />
  </div>
</template>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  padding: 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: var(--primary-color);
  border-bottom: 1px solid var(--border-color);

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
