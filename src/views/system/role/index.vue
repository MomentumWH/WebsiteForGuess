<script setup lang="ts">
import { ref } from 'vue'

interface RoleItem {
  id: number
  name: string
  desc: string
}

const roles = ref<RoleItem[]>([
  { id: 1, name: 'admin', desc: '管理员，拥有全部权限' },
  { id: 2, name: 'user', desc: '普通用户，基础权限' },
])
</script>

<template>
  <div class="page">
    <n-card title="角色管理">
      <template #header-extra>
        <n-tag size="small" :bordered="false">静态示例</n-tag>
      </template>
      <n-list hoverable clickable>
        <n-list-item v-for="role in roles" :key="role.id">
          <n-thing :title="role.name" :description="role.desc" />
        </n-list-item>
      </n-list>
    </n-card>
  </div>
</template>
