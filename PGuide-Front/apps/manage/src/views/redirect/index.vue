<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * 重定向中转页。
 *
 * 对应 RuoYi 的 `/redirect/:path` —— 侧边栏点击当前已激活的菜单时，
 * 跳到这个页面再跳回去，用来「刷新」被 keep-alive 缓存的页面。
 */
const route = useRoute()
const router = useRouter()

onMounted(() => {
  const params = route.params as { path?: string | string[] }
  const raw = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '')
  const target = `/${raw}`
  void router.replace(target)
})
</script>

<template>
  <div class="redirect" />
</template>
