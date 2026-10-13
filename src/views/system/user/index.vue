<script setup lang="ts">
import { h, ref } from 'vue'
import { NButton, NTag, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

interface UserRow {
  id: number
  username: string
  nickname: string
  email: string
  status: 'active' | 'disabled'
}

const message = useMessage()

const data = ref<UserRow[]>([
  { id: 1, username: 'admin', nickname: '管理员', email: 'admin@example.com', status: 'active' },
  { id: 2, username: 'user', nickname: '普通用户', email: 'user@example.com', status: 'active' },
  { id: 3, username: 'guest', nickname: '访客', email: 'guest@example.com', status: 'disabled' },
])

const columns: DataTableColumns<UserRow> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '用户名', key: 'username' },
  { title: '昵称', key: 'nickname' },
  { title: '邮箱', key: 'email' },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(
        NTag,
        { type: row.status === 'active' ? 'success' : 'error', size: 'small', bordered: false },
        { default: () => (row.status === 'active' ? '启用' : '禁用') },
      ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) =>
      h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          quaternary: true,
          onClick: () => message.info(`编辑：${row.username}`),
        },
        { default: () => '编辑' },
      ),
  },
]
</script>

<template>
  <div class="page">
    <n-card title="用户管理">
      <template #header-extra>
        <n-tag size="small" :bordered="false">静态示例</n-tag>
      </template>
      <n-data-table :columns="columns" :data="data" :bordered="false" :single-line="false" />
    </n-card>
  </div>
</template>
