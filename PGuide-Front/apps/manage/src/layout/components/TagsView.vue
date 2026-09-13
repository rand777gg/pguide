<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close } from '@element-plus/icons-vue'
import { useTagsStore, type TagView } from '@/stores/tags'

/**
 * 多标签页（TagsView）。
 *
 * 对应老 ruoyi-ui 的 `layout/components/TagsView/index.vue`。
 * 行为对齐那边：
 *
 *   - 点标签 → 跳到该标签的 fullPath（带原来的查询条件）
 *   - 点 × → 关掉标签；关的是当前页时跳到最后一个标签
 *   - 右键 → 刷新 / 关闭 / 关闭其它 / 关闭全部
 *   - 固定标签（首页，`meta.affix`）没有关闭按钮
 *
 * 与 keep-alive 的配合见 stores/tags.ts：关标签会丢掉对应缓存，
 * 所以「关掉再打开」是一个干净的新页面；而「刷新」是丢缓存 + 走一次
 * `/redirect` 中转，让当前页重新挂载。
 */
const route = useRoute()
const router = useRouter()
const tagsStore = useTagsStore()

// immediate：首次进入时把当前页也登记成标签
watch(
  () => route.fullPath,
  () => tagsStore.addView(route),
  { immediate: true },
)

function isActive(tag: TagView): boolean {
  return tag.path === route.path
}

/** 右键菜单的位置与目标标签 */
const contextMenu = reactive({
  visible: false,
  left: 0,
  top: 0,
  tag: null as TagView | null,
})

function openContextMenu(event: MouseEvent, tag: TagView): void {
  contextMenu.left = event.clientX
  contextMenu.top = event.clientY
  contextMenu.tag = tag
  contextMenu.visible = true
}

function closeContextMenu(): void {
  contextMenu.visible = false
  contextMenu.tag = null
}

function handleClick(tag: TagView): void {
  if (!isActive(tag)) void router.push(tag.fullPath)
}

function handleClose(tag: TagView): void {
  const wasActive = isActive(tag)
  const rest = tagsStore.removeView(tag)
  if (wasActive) {
    // 关掉当前页后落到最后一个标签；一个都不剩（理论上还有固定的首页）就回首页
    const last = rest[rest.length - 1]
    void router.push(last ? last.fullPath : '/')
  }
  closeContextMenu()
}

/** 刷新当前页：丢缓存 + 走 /redirect 中转，回来时是一个全新的页面实例 */
async function handleRefresh(tag: TagView): Promise<void> {
  tagsStore.invalidate(tag.name)
  closeContextMenu()
  await router.replace(`/redirect${tag.fullPath}`)
}

function handleCloseOthers(tag: TagView): void {
  tagsStore.removeOthers(tag)
  closeContextMenu()
  if (!isActive(tag)) void router.push(tag.fullPath)
}

function handleCloseAll(): void {
  tagsStore.removeAll()
  closeContextMenu()
  const rest = tagsStore.visitedViews
  const last = rest[rest.length - 1]
  // 全关之后只剩固定标签（首页），回到它；没有就回根路径
  void router.push(last ? last.fullPath : '/')
}
</script>

<template>
  <div class="tags-view">
    <div class="tags-view__scroll">
      <router-link
        v-for="tag in tagsStore.visitedViews"
        :key="tag.path"
        class="tags-view__item"
        :class="{ 'is-active': isActive(tag) }"
        :to="tag.fullPath"
        @click.prevent="handleClick(tag)"
        @contextmenu.prevent="openContextMenu($event, tag)"
      >
        <span class="tags-view__dot" />
        {{ tag.title }}
        <el-icon
          v-if="!tag.affix"
          class="tags-view__close"
          @click.prevent.stop="handleClose(tag)"
        >
          <Close />
        </el-icon>
      </router-link>
    </div>

    <!-- 右键菜单：点空白处或选中一项后关闭 -->
    <ul
      v-if="contextMenu.visible"
      class="tags-view__menu"
      :style="{ left: `${contextMenu.left}px`, top: `${contextMenu.top}px` }"
    >
      <li @click="contextMenu.tag && handleRefresh(contextMenu.tag)">刷新</li>
      <li
        v-if="contextMenu.tag && !contextMenu.tag.affix"
        @click="contextMenu.tag && handleClose(contextMenu.tag)"
      >
        关闭
      </li>
      <li @click="contextMenu.tag && handleCloseOthers(contextMenu.tag)">关闭其它</li>
      <li @click="handleCloseAll()">关闭全部</li>
    </ul>

    <!-- 菜单开着时点别处关掉它（用一层透明遮罩，避免监听整个 document） -->
    <div v-if="contextMenu.visible" class="tags-view__mask" @click="closeContextMenu()" />
  </div>
</template>

<style scoped lang="scss">
.tags-view {
  position: relative;
  height: 34px;
  padding: 0 var(--pg-spacing-md);
  background-color: #ffffff;
  border-bottom: 1px solid var(--pg-border-color);
  display: flex;
  align-items: center;

  &__scroll {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 8px;
    font-size: 12px;
    line-height: 1;
    color: var(--pg-text-regular);
    background-color: #ffffff;
    border: 1px solid var(--pg-border-color);
    border-radius: 3px;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      color: var(--pg-color-primary);
    }

    &.is-active {
      color: #ffffff;
      background-color: var(--pg-color-primary);
      border-color: var(--pg-color-primary);
    }
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #c0c4cc;

    .tags-view__item.is-active & {
      background-color: #ffffff;
    }
  }

  &__close {
    font-size: 12px;
    border-radius: 50%;

    &:hover {
      background-color: rgba(0, 0, 0, 0.2);
    }
  }

  &__menu {
    position: fixed;
    z-index: 3000;
    margin: 0;
    padding: 4px 0;
    list-style: none;
    font-size: 12px;
    background-color: #ffffff;
    border: 1px solid var(--pg-border-color);
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);

    li {
      padding: 6px 16px;
      cursor: pointer;

      &:hover {
        background-color: #f5f7fa;
        color: var(--pg-color-primary);
      }
    }
  }

  &__mask {
    position: fixed;
    inset: 0;
    z-index: 2999;
  }
}
</style>
