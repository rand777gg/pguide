<script setup lang="ts">
/**
 * 主内容区。
 *
 * keep-alive 的名单来自 TagsView 的 store：**只有打开着的标签页才缓存**，
 * 关掉标签就释放它的实例（这正是多标签页的用处 —— 不然页面状态会越攒越多）。
 *
 * ⚠️ include 是按**组件名**匹配的，而 `<script setup>` 的名字默认来自文件名
 * （我们的页面都叫 index.vue，推断出来都叫 "Index"），所以必须由
 * `utils/dynamic-route.ts` 在加载组件时把名字改成路由名 —— 两边同源才匹配得上。
 * 同一个文件里也解释了这一点，改这里之前先看一眼。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTagsStore } from '@/stores/tags'

const route = useRoute()
const tagsStore = useTagsStore()

/** 缓存名单（组件名 = 路由名）；`meta.noCache` 的页面不会进来 */
const cachedViews = computed(() => tagsStore.cachedNames)

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
