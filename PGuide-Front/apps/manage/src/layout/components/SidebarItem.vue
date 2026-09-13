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
</script>

<template>
  <!-- 只有一个子节点（或没有子节点）：直接渲染成菜单项 -->
  <el-menu-item v-if="onlyOneChild || visibleChildren.length === 0" :index="displayPath">
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
