<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue'
import { appConfig } from '@/config/app'
</script>

<template>
  <main class="login-page">
    <n-card class="login-card" :title="appConfig.title">
      <p class="login-description">登录后进入管理工作台</p>
      <LoginForm />
      <n-alert v-if="appConfig.useMock" type="info" :show-icon="false" class="login-tip">
        当前为演示模式：管理员 admin / 123456，普通用户 user / 123456。
      </n-alert>
    </n-card>
  </main>
</template>

<style lang="scss" scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 24px;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
}

.login-card {
  width: min(100%, 420px);
}

.login-description {
  margin-bottom: 24px;
  color: var(--text-color-2);
}

.login-tip {
  margin-top: 20px;
}
</style>
