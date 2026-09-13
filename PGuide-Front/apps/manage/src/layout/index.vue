<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import SidebarMenu from './components/SidebarMenu.vue'
import Navbar from './components/Navbar.vue'
import TagsView from './components/TagsView.vue'
import AppMain from './components/AppMain.vue'

/**
 * 后台布局：左侧菜单 + 顶部导航 + 多标签页 + 主内容区。
 *
 * 老 ruoyi-ui 的布局还有 Settings（主题设置抽屉）没搬 —— 低频功能，
 * 而且主题变量已经在 styles 里统一定义，需要时再加。
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

      <!-- 多标签页：切换已打开过的页面，关掉标签同时释放它的 keep-alive 缓存 -->
      <TagsView />

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
