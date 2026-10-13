<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="error-page">
    <n-result status="404" title="404 页面不存在" description="你访问的页面不存在或已被移除">
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
