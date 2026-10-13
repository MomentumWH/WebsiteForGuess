<script setup lang="ts">
import { useUserStore } from '@/stores/modules/user'

const userStore = useUserStore()
</script>

<template>
  <div class="page">
    <n-alert type="info" :show-icon="false" class="demo-notice">
      当前工作台为模板示例，下方统计为静态展示数据，尚未接入业务接口。
    </n-alert>
    <n-card class="welcome-card">
      <n-space align="center">
        <n-avatar round :size="56" :src="userStore.userInfo?.avatar || undefined">
          {{ userStore.userInfo?.nickname?.charAt(0) }}
        </n-avatar>
        <div>
          <div class="welcome-title">{{ userStore.userInfo?.nickname }}，你好！</div>
          <div class="welcome-sub">当前角色：{{ userStore.roles.join('、') || '无' }}</div>
        </div>
      </n-space>
    </n-card>

    <n-grid cols="1 s:2 m:3" responsive="screen" :x-gap="16" :y-gap="16" class="stats">
      <n-grid-item>
        <n-card>
          <n-statistic label="示例访问量" :value="1280" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="示例用户数" :value="356" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="示例待办" :value="8" />
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<style scoped>
.demo-notice {
  margin-bottom: 16px;
}

.welcome-title {
  font-size: 18px;
  font-weight: 600;
}

.welcome-sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-color-2);
}

.stats {
  margin-top: 16px;
}
</style>
