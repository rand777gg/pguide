<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * 重定向中转页。
 *
 * 对应 RuoYi 的 `/redirect/:path`，有两个用途：
 *   1. 侧边栏点击当前已激活的菜单时，跳这里再跳回去 → 「刷新」页面
 *   2. TagsView 右键「刷新」也是这么做的（见 TagsView.vue）
 *
 * ⚠️ 查询参数要一并带回去。只把 path 拼回去的话，
 * 刷新一个带筛选条件的列表页会变成「条件被清空」——
 * 用户看到的就是「一刷新筛选就没了」。
 */
const route = useRoute()
const router = useRouter()

onMounted(() => {
  const params = route.params as { path?: string | string[] }
  const raw = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '')
  void router.replace({ path: `/${raw}`, query: route.query })
})
</script>

<template>
  <div class="redirect" />
</template>
