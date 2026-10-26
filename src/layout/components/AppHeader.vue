<script setup lang="ts">
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, useDialog } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import LogOutOutline from '@vicons/ionicons5/es/LogOutOutline'
import MenuOutline from '@vicons/ionicons5/es/MenuOutline'
import MoonOutline from '@vicons/ionicons5/es/MoonOutline'
import PersonOutline from '@vicons/ionicons5/es/PersonOutline'
import SunnyOutline from '@vicons/ionicons5/es/SunnyOutline'
import { appConfig } from '@/config/app'
import { resetSession } from '@/services/session'
import { useAppStore } from '@/stores/modules/app'
import { useUserStore } from '@/stores/modules/user'

const route = useRoute()
const router = useRouter()
const dialog = useDialog()
const appStore = useAppStore()
const userStore = useUserStore()

// 注释修改时间：2026-10-22
// 用途与逻辑：生成面包屑，只保留当前匹配路由中配置了标题的记录。
const breadcrumbs = computed(() => route.matched.filter((item) => item.meta?.title))

const dropdownOptions: DropdownOption[] = [
  {
    label: '个人中心',
    key: 'profile',
    // 注释修改时间：2026-10-22
    // 用途与逻辑：渲染个人中心菜单图标，通过图标容器插槽创建用户图标节点。
    icon: () => h(NIcon, null, { default: () => h(PersonOutline) }),
  },
  { type: 'divider', key: 'divider' },
  {
    label: '退出登录',
    key: 'logout',
    // 注释修改时间：2026-10-22
    // 用途与逻辑：渲染退出菜单图标，通过图标容器插槽创建退出图标节点。
    icon: () => h(NIcon, null, { default: () => h(LogOutOutline) }),
  },
]

// 注释修改时间：2026-10-22
// 用途与逻辑：处理用户菜单，退出时先确认并统一清理会话，选择个人中心时跳转对应页面。
function handleDropdownSelect(key: string): void {
  // 退出操作先显示确认弹窗，只有确认后才真正清除登录状态。
  if (key === 'logout') {
    dialog.warning({
      title: '提示',
      content: '确定要退出登录吗？',
      positiveText: '确定',
      negativeText: '取消',
      // 注释修改时间：2026-10-22
      // 用途与逻辑：确认退出后清理会话，通过统一重置方法移除登录与权限状态，再返回登录页。
      onPositiveClick: () => {
        // 通过统一会话服务清除 Token、用户信息与动态路由，再返回登录入口。
        resetSession()
        void router.replace(appConfig.loginPath)
      },
    })
  } else if (key === 'profile') {
    // 个人中心选项只负责路由导航，不触发会话清理。
    router.push('/profile')
  }
}
</script>

<template>
  <div class="header">
    <div class="header-left">
      <n-button quaternary circle aria-label="折叠或展开侧边栏" @click="appStore.toggleSidebar">
        <template #icon>
          <n-icon><MenuOutline /></n-icon>
        </template>
      </n-button>

      <n-breadcrumb>
        <n-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
          {{ item.meta.title }}
        </n-breadcrumb-item>
      </n-breadcrumb>
    </div>

    <div class="header-right">
      <n-button
        quaternary
        circle
        :aria-label="appStore.theme === 'dark' ? '切换浅色主题' : '切换深色主题'"
        @click="appStore.toggleTheme"
      >
        <template #icon>
          <n-icon>
            <SunnyOutline v-if="appStore.theme === 'dark'" />
            <MoonOutline v-else />
          </n-icon>
        </template>
      </n-button>
      <n-dropdown :options="dropdownOptions" trigger="hover" @select="handleDropdownSelect">
        <div class="user-info">
          <n-avatar round size="small" :src="userStore.userInfo?.avatar || undefined">
            {{ userStore.userInfo?.nickname?.charAt(0) }}
          </n-avatar>
          <span class="nickname">{{ userStore.userInfo?.nickname || '未登录' }}</span>
        </div>
      </n-dropdown>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;

    .nickname {
      font-size: 14px;
    }
  }
}
</style>
