<script setup lang="ts">
import { useUserStore } from '@/stores/modules/user'

const userStore = useUserStore()
</script>

<template>
  <div class="page">
    <n-card title="个人中心">
      <n-descriptions bordered :column="1">
        <n-descriptions-item label="用户名">
          {{ userStore.userInfo?.username }}
        </n-descriptions-item>
        <n-descriptions-item label="昵称">
          {{ userStore.userInfo?.nickname }}
        </n-descriptions-item>
        <n-descriptions-item label="角色">
          {{ userStore.roles.join('、') }}
        </n-descriptions-item>
      </n-descriptions>
    </n-card>
  </div>
</template>
