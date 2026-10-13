import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { storage } from '@/utils/storage'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'app_theme'
const SIDEBAR_KEY = 'app_sidebar_collapsed'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = shallowRef(storage.get(SIDEBAR_KEY) === true)
  const theme = shallowRef<ThemeMode>(storage.get(THEME_KEY) === 'dark' ? 'dark' : 'light')

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
    storage.set(SIDEBAR_KEY, sidebarCollapsed.value)
  }

  function setTheme(value: ThemeMode): void {
    theme.value = value
    storage.set(THEME_KEY, value)
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { sidebarCollapsed, theme, toggleSidebar, setTheme, toggleTheme }
})
