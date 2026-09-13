<script setup lang="ts">
/**
 * 根组件。
 *
 * 老工程的 App.vue 里挂着两处**非 scoped** 的全局样式
 * （`* { margin: 0; padding: 0 }` 和 `#app` 的渐变背景、`font-family: serif`）。
 * 这里挪到 src/styles/index.scss，避免样式从组件里泄漏出去。
 */
</script>

<template>
  <RouterView />
</template>
