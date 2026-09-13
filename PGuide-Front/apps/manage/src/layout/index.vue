<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import SidebarMenu from './components/SidebarMenu.vue'
import Navbar from './components/Navbar.vue'
import AppMain from './components/AppMain.vue'

/**
 * 后台布局：左侧菜单 + 顶部导航 + 主内容区。
 *
 * 老 ruoyi-ui 的布局还有 TagsView（多标签页）和 Settings（主题设置抽屉），
 * 这里先不搬 —— 标签页功能对当前规模用处不大，主题设置更是低频。
 * 需要的话可以按同样的方式加进 layout/components。
 */
const appStore = useAppStore()

const collapsed = computed(() => appStore.sidebarCollapsed)
</script>

<template>
  <el-container class="layout">
    <el-aside class="layout__aside" :width="collapsed ? '64px' : '220px'">
      <SidebarMenu :collapsed="collapsed" />
    </el-aside>

    <el-container class="layout__main">
      <el-header class="layout__header">
        <Navbar />
      </el-header>

      <el-main class="layout__content">
        <AppMain />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.layout {
  height: 100vh;

  &__aside {
    background-color: #304156;
    transition: width 0.28s;
    overflow: hidden;
  }

  &__main {
    min-width: 0;
  }

  &__header {
    height: 56px;
    padding: 0 var(--pg-spacing-md);
    background-color: #ffffff;
    border-bottom: 1px solid var(--pg-border-color);
    display: flex;
    align-items: center;
  }

  &__content {
    padding: var(--pg-spacing-md);
    background-color: #f0f2f5;
    overflow-y: auto;
  }
}
</style>
