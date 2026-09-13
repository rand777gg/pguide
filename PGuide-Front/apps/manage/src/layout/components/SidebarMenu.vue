<script setup lang="ts">
import { computed } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import { constantRoutes } from '@/router'
import SidebarItem from './SidebarItem.vue'

/**
 * 侧边栏菜单。
 *
 * 数据来源是**路由表本身**，而不是后端菜单树的原始结构 ——
 * 这样菜单和实际可跳转的路由永远一致，不会出现
 * 「菜单有但点进去 404」（老工程出现过）。
 */
defineProps<{ collapsed: boolean }>()

const permissionStore = usePermissionStore()

/** 首页那条是静态路由，需要一起显示在菜单里 */
const staticMenuRoutes = computed(() =>
  constantRoutes.filter((route) => route.path === '/' && !route.meta?.hidden),
)

const menuRoutes = computed<RouteRecordRaw[]>(() => [
  ...staticMenuRoutes.value,
  ...permissionStore.dynamicRoutes,
])
</script>

<template>
  <div class="sidebar">
    <div class="sidebar__logo">
      <span v-if="!collapsed">项导后台</span>
      <span v-else>项</span>
    </div>

    <el-scrollbar class="sidebar__scroll">
      <el-menu
        :default-active="$route.path"
        :collapse="collapsed"
        :collapse-transition="false"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        unique-opened
        router
      >
        <SidebarItem
          v-for="route in menuRoutes"
          :key="route.path"
          :item="route"
          :base-path="route.path"
        />
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<style scoped lang="scss">
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;

  &__logo {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 1px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  &__scroll {
    flex: 1;
  }

  :deep(.el-menu) {
    border-right: none;
  }
}
</style>
