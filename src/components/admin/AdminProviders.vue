<script setup lang="ts">
import { computed } from 'vue'
import { darkTheme, dateZhCN, zhCN } from 'naive-ui'
import { useAppStore } from '@/stores/modules/app'

const appStore = useAppStore()
// 注释修改时间：2026-10-22
// 用途与逻辑：根据全局主题选择 Naive UI 深色配置，浅色模式返回默认主题。
const theme = computed(() => (appStore.theme === 'dark' ? darkTheme : null))
</script>

<template>
  <n-config-provider :theme="theme" :locale="zhCN" :date-locale="dateZhCN">
    <n-global-style />
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <n-element class="admin-root"><slot /></n-element>
          </n-loading-bar-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
.admin-root {
  height: 100%;
}
</style>
