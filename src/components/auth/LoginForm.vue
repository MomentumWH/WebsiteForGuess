<script setup lang="ts">
import { reactive, useTemplateRef } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { appConfig } from '@/config/app'
import { useLogin } from '@/composables/useLogin'
import type { LoginPayload } from '@/types/user'

const formRef = useTemplateRef<FormInst>('form')
const { loading, login } = useLogin()
const model = reactive<LoginPayload>({
  username: appConfig.useMock ? 'admin' : '',
  password: appConfig.useMock ? '123456' : '',
})
const rules: FormRules = {
  username: { required: true, message: '请输入用户名', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' },
}

// 注释修改时间：2026-10-22
// 用途与逻辑：提交登录表单，先阻止重复请求并完成校验，再规范用户名并调用登录流程。
async function handleSubmit(): Promise<void> {
  // 登录进行中或表单尚未挂载时停止处理，避免重复提交和空引用。
  if (loading.value || !formRef.value) return
  try {
    // 先执行表单规则校验，校验失败直接返回，不发起登录请求。
    await formRef.value.validate()
  } catch {
    return
  }
  // 仅规范用户名首尾空格，保持密码原样传给统一登录流程。
  await login({ username: model.username.trim(), password: model.password })
}
</script>

<template>
  <n-form ref="form" :model="model" :rules="rules" @submit.prevent="handleSubmit">
    <n-form-item path="username" label="用户名">
      <n-input
        v-model:value="model.username"
        placeholder="请输入用户名"
        autocomplete="username"
        :disabled="loading"
      />
    </n-form-item>
    <n-form-item path="password" label="密码">
      <n-input
        v-model:value="model.password"
        type="password"
        show-password-on="click"
        placeholder="请输入密码"
        autocomplete="current-password"
        :disabled="loading"
      />
    </n-form-item>
    <n-button type="primary" attr-type="submit" block :loading="loading">登 录</n-button>
  </n-form>
</template>
