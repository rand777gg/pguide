import { ref } from 'vue'
import { defineStore } from 'pinia'

/** 应用级 UI 状态 */
export const useAppStore = defineStore('app', () => {
  /** 侧边栏是否收起 */
  const sidebarCollapsed = ref(false)

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return { sidebarCollapsed, toggleSidebar }
})
