<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="error-page">
    <n-result status="403" title="403 无权限" description="你没有访问该页面的权限">
      <template #footer>
        <n-button type="primary" @click="router.replace('/')">返回首页</n-button>
      </template>
    </n-result>
  </div>
</template>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
