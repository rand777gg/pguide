<script setup lang="ts">
/**
 * 纯容器路由。
 *
 * RuoYi 的菜单树里，「目录」节点本身没有组件，但需要渲染它下面的子菜单。
 * 后端 `/getRouters` 对这类节点返回 `component: 'ParentView'`，
 * 对应的就是这个只有 `<router-view>` 的组件。
 */
</script>

<template>
  <RouterView />
</template>
