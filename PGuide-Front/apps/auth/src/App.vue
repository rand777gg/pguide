<script setup lang="ts">
/**
 * 根组件。
 *
 * 老 auth-ui 的 App.vue 里挂着非 scoped 的全局样式
 * （`* { box-sizing: border-box }`、`.app` / `.move` 的渐变背景流动动画），
 * 其中 `.move` 还泄漏到了全局。这里样式统一在 src/styles/index.scss，
 * 渐变背景收在 LoginView 的 scoped 样式里，并保留原本的动画效果。
 */
</script>

<template>
  <RouterView />
</template>
