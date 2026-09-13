<script setup lang="ts">
import type { ProjectCard } from '@/services/project'

/**
 * 项目卡片。
 *
 * 老工程的 `components/card/InfoCard.vue` **没有任何 props**，
 * 内容全是写死的（"项导--项目导航"、"名字长的大学"、"指导老师：xxx"），
 * 而且 mounted 里用 `document.querySelectorAll(".box")` 全局选元素初始化
 * vanilla-tilt —— 页面上任何叫 .box 的元素都会被它抓到。
 *
 * 这里改成纯展示组件：数据全靠 props，交互靠 emit，样式 scoped。
 */
defineProps<{
  project: ProjectCard
}>()

const emit = defineEmits<{
  (e: 'open', project: ProjectCard): void
}>()
</script>

<template>
  <article class="info-card" @click="emit('open', project)">
    <header class="info-card__header">
      <h3 class="info-card__name">{{ project.name }}</h3>
      <el-tag size="small" type="info" effect="plain">{{ project.subject }}</el-tag>
    </header>

    <p class="info-card__meta">{{ project.school }} · {{ project.academy }}</p>

    <footer class="info-card__footer">
      <span class="info-card__count">
        {{ project.memberCount }} / {{ project.memberTarget }} 人
      </span>
      <el-button type="primary" link>查看详情</el-button>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.info-card {
  padding: var(--pg-spacing-md);
  border: 1px solid var(--pg-border-color);
  border-radius: var(--pg-border-radius);
  background-color: var(--pg-bg-card);
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    transform 0.2s;

  &:hover {
    box-shadow: var(--pg-shadow-hover);
    transform: translateY(-2px);
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--pg-spacing-sm);
    margin-bottom: var(--pg-spacing-sm);
  }

  &__name {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--pg-text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__meta {
    font-size: 13px;
    color: var(--pg-text-secondary);
    margin-bottom: var(--pg-spacing-md);
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__count {
    font-size: 13px;
    color: var(--pg-text-secondary);
  }
}
</style>
