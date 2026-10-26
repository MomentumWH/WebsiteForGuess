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
// 注释修改时间：2026-10-22
// 用途与逻辑：生成侧栏菜单，将权限过滤后的路由转换为菜单选项并随路由集合变化更新。
const menuOptions = computed(() => buildMenuOptions(permissionStore.routes))
// 注释修改时间：2026-10-22
// 用途与逻辑：获取当前菜单选中项，直接使用活动路由路径匹配菜单键。
const activeKey = computed(() => route.path)

// 注释修改时间：2026-10-22
// 用途与逻辑：处理侧栏选择，以菜单键作为目标路径调用路由导航。
function handleSelect(key: string): void {
  // 直接使用菜单中已经解析好的完整路径进行导航。
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
