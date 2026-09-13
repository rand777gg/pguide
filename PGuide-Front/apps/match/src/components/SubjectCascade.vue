<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import type { SubjectTreeNode } from '@pguide/api'

/**
 * 学科分类三级联动。
 *
 * 老工程 HomeBody.vue 里这块是这么做的：
 *   - 用 `r.data[0]` 取一级、`allSearchBoxItems[id]` 取二级、再查三级
 *   - 展开/收起靠 `$refs` + 直接拼 style 字符串改 DOM
 *     （其中有 `"background-color:write"` 这种拼写错误，因为字符串不校验所以没人发现）
 *   - 点击最后一级时 `window.open("http://localhost:4000/#/details?detailTags=...")`
 *     把开发机地址写死在源码里
 *
 * 这里改成：纯计算属性推导要显示哪几列，点击交给父组件用 router 跳转。
 */
const props = defineProps<{
  tree: SubjectTreeNode[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', node: SubjectTreeNode): void
}>()

const activeFirst = ref<SubjectTreeNode | null>(null)
const activeSecond = ref<SubjectTreeNode | null>(null)

// 树加载完成后默认展开第一列的第一项，避免页面上一片空白
watch(
  () => props.tree,
  (tree) => {
    activeFirst.value = tree[0] ?? null
    activeSecond.value = tree[0]?.children[0] ?? null
  },
  { immediate: true },
)

const firstColumn = computed(() => props.tree)
const secondColumn = computed(() => activeFirst.value?.children ?? [])
const thirdColumn = computed(() => activeSecond.value?.children ?? [])

function selectFirst(node: SubjectTreeNode): void {
  activeFirst.value = node
  activeSecond.value = node.children[0] ?? null
}

function selectSecond(node: SubjectTreeNode): void {
  activeSecond.value = node
}

function selectLeaf(node: SubjectTreeNode): void {
  emit('select', node)
}
</script>

<template>
  <div v-loading="loading" class="subject-cascade">
    <ul class="subject-cascade__column">
      <li
        v-for="node in firstColumn"
        :key="node.subjectId"
        class="subject-cascade__item"
        :class="{ 'is-active': activeFirst?.subjectId === node.subjectId }"
        @mouseenter="selectFirst(node)"
        @click="selectLeaf(node)"
      >
        <span>{{ node.subjectName }}</span>
        <el-icon v-if="node.children.length"><ArrowRight /></el-icon>
      </li>
    </ul>

    <ul v-if="secondColumn.length" class="subject-cascade__column">
      <li
        v-for="node in secondColumn"
        :key="node.subjectId"
        class="subject-cascade__item"
        :class="{ 'is-active': activeSecond?.subjectId === node.subjectId }"
        @mouseenter="selectSecond(node)"
        @click="selectLeaf(node)"
      >
        <span>{{ node.subjectName }}</span>
        <el-icon v-if="node.children.length"><ArrowRight /></el-icon>
      </li>
    </ul>

    <ul v-if="thirdColumn.length" class="subject-cascade__column">
      <li
        v-for="node in thirdColumn"
        :key="node.subjectId"
        class="subject-cascade__item"
        @click="selectLeaf(node)"
      >
        {{ node.subjectName }}
      </li>
    </ul>

    <el-empty v-if="!loading && firstColumn.length === 0" description="暂无学科数据" />
  </div>
</template>

<style scoped lang="scss">
.subject-cascade {
  display: flex;
  min-height: 260px;
  border: 1px solid var(--pg-border-color);
  border-radius: var(--pg-border-radius);
  background-color: var(--pg-bg-card);
  overflow: hidden;

  &__column {
    flex: 0 0 200px;
    border-right: 1px solid var(--pg-border-color);
    padding: var(--pg-spacing-xs) 0;
    overflow-y: auto;

    &:last-child {
      border-right: none;
      flex: 1;
    }
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pg-spacing-sm);
    padding: 10px var(--pg-spacing-md);
    cursor: pointer;
    color: var(--pg-text-regular);
    transition:
      background-color 0.15s,
      color 0.15s;

    &:hover,
    &.is-active {
      background-color: var(--pg-bg-hover);
      color: var(--pg-color-primary);
    }
  }
}
</style>
