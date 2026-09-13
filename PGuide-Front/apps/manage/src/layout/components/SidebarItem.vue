<script setup lang="ts">
import { computed } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { isExternalLink } from '@/utils/dynamic-route'
import { resolveMenuIcon } from '@/utils/menu-icon'

/**
 * 递归渲染一个菜单项。
 *
 * 三种情况：
 *   1. 只有一个可见子节点且父级不强制展开 → 直接渲染成菜单项（RuoYi 的「提级」行为）
 *   2. 有多个子节点 → 渲染成 el-sub-menu
 *   3. 叶子节点 → 渲染成 el-menu-item
 */
const props = defineProps<{
  item: RouteRecordRaw
  basePath: string
}>()

const visibleChildren = computed(
  () => (props.item.children ?? []).filter((child) => !child.meta?.hidden),
)

/** 是否只有一个子节点需要「提级」 */
const onlyOneChild = computed(() => {
  if (visibleChildren.value.length === 1 && !props.item.meta?.alwaysShow) {
    return visibleChildren.value[0]
  }
  return null
})

/** 计算子节点的完整路径 */
function resolvePath(routePath: string): string {
  if (isExternalLink(routePath)) return routePath
  if (routePath.startsWith('/')) return routePath
  return `${props.basePath}/${routePath}`.replace(/\/+/g, '/')
}

const displayPath = computed(() => {
  if (onlyOneChild.value) return resolvePath(onlyOneChild.value.path)
  return props.basePath
})

const displayTitle = computed(
  () => (onlyOneChild.value?.meta?.title ?? props.item.meta?.title ?? '') as string,
)

const displayIcon = computed(() => {
  const name = (onlyOneChild.value?.meta?.icon ?? props.item.meta?.icon) as string | undefined
  return resolveMenuIcon(name)
})

const parentIcon = computed(() => resolveMenuIcon(props.item.meta?.icon as string | undefined))

/**
 * 外链菜单（后端 `sys_menu.path` 是 http(s) 地址，如 RuoYi 自带的「若依官网」）。
 *
 * 这类菜单在路由表里只有个 `/external/xxx` 的占位路径（见 utils/dynamic-route.ts），
 * 真实地址在 `meta.link`。侧边栏必须渲染成真正的 `<a target="_blank">`：
 * 走 vue-router 的话会变成站内跳转，页面里根本没有那个组件。
 */
const externalLink = computed<string | null>(() => {
  const link = (onlyOneChild.value?.meta?.link ?? props.item.meta?.link) as string | undefined
  return link && isExternalLink(link) ? link : null
})
</script>

<template>
  <!-- 外链：新窗口打开，@click.stop 是为了不让 el-menu 的 router 模式再 push 一次 -->
  <el-menu-item v-if="externalLink" :index="displayPath">
    <a
      class="sidebar-item__link"
      :href="externalLink"
      target="_blank"
      rel="noopener noreferrer"
      @click.stop
    >
      <el-icon v-if="displayIcon"><component :is="displayIcon" /></el-icon>
      <!-- 用 span 而不是 #title 插槽：Element Plus 折叠态隐藏的正是菜单项里的 span -->
      <span class="sidebar-item__title">{{ displayTitle }}</span>
    </a>
  </el-menu-item>

  <!-- 只有一个子节点（或没有子节点）：直接渲染成菜单项 -->
  <el-menu-item v-else-if="onlyOneChild || visibleChildren.length === 0" :index="displayPath">
    <el-icon v-if="displayIcon"><component :is="displayIcon" /></el-icon>
    <template #title>{{ displayTitle }}</template>
  </el-menu-item>

  <!-- 多个子节点：渲染成分组 -->
  <el-sub-menu v-else :index="basePath">
    <template #title>
      <el-icon v-if="parentIcon"><component :is="parentIcon" /></el-icon>
      <span>{{ item.meta?.title }}</span>
    </template>

    <SidebarItem
      v-for="child in visibleChildren"
      :key="child.path"
      :item="child"
      :base-path="resolvePath(child.path)"
    />
  </el-sub-menu>
</template>

<style scoped lang="scss">
// 外链菜单项里的 <a> 要铺满整个菜单项，否则只有文字可点
.sidebar-item__link {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  color: inherit;
  text-decoration: none;
}
</style>
