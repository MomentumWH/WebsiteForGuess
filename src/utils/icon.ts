import { h } from 'vue'
import type { Component, VNode } from 'vue'
import { NIcon } from 'naive-ui'
import HomeOutline from '@vicons/ionicons5/es/HomeOutline'
import LogOutOutline from '@vicons/ionicons5/es/LogOutOutline'
import MenuOutline from '@vicons/ionicons5/es/MenuOutline'
import PersonOutline from '@vicons/ionicons5/es/PersonOutline'
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'

// 字符串图标名 -> 图标组件，供路由 meta.icon 使用
const iconMap: Record<string, Component> = {
  home: HomeOutline,
  settings: SettingsOutline,
  person: PersonOutline,
  menu: MenuOutline,
  logout: LogOutOutline,
}

export function renderIcon(name: string): () => VNode {
  const icon = iconMap[name] ?? HomeOutline
  return () => h(NIcon, null, { default: () => h(icon) })
}
