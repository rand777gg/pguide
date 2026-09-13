<script setup lang="ts">
/**
 * 主内容区。
 *
 * 加了 keep-alive：从列表页点进详情再返回时保留查询条件与滚动位置。
 * 对应老 ruoyi-ui 的 `<keep-alive :include="cachedViews">`，
 * 但这里简化成「按路由 meta.noCache 决定是否缓存」，不额外维护缓存名单。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const cachedViews = computed(() => {
  const name = route.name
  if (!name || route.meta?.noCache) return []
  return [String(name)]
})

const transitionName = computed(() => 'fade-slide')
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition :name="transitionName" mode="out-in">
      <KeepAlive :include="cachedViews">
        <component :is="Component" :key="route.path" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
