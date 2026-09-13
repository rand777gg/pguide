<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 内嵌外链页面。
 *
 * 后端菜单里如果有外链（`sys_menu.is_frame = 0` 或 path 是 http 开头），
 * `/getRouters` 会返回 `component: 'InnerLink'`，用 iframe 嵌入目标页面。
 */
const route = useRoute()

const link = computed(() => (route.meta?.link as string | undefined) ?? '')
</script>

<template>
  <div class="inner-link">
    <iframe v-if="link" :src="link" frameborder="0" class="inner-link__iframe" />
    <el-empty v-else description="外链地址为空" />
  </div>
</template>

<style scoped lang="scss">
.inner-link {
  height: calc(100vh - 120px);

  &__iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
}
</style>
