<script setup lang="ts">
import { Coin } from '@element-plus/icons-vue'
import type { RecruitCard } from '@/services/project'

/** 招募需求卡片。老工程对应 `components/card/TaskCard.vue`，其中"截止时间"是写死的。 */
defineProps<{
  recruit: RecruitCard
}>()
</script>

<template>
  <article class="recruit-card">
    <h3 class="recruit-card__name">{{ recruit.name }}</h3>
    <p class="recruit-card__detail">{{ recruit.detail }}</p>
    <footer class="recruit-card__footer">
      <span class="recruit-card__reward">
        <el-icon><Coin /></el-icon>
        {{ recruit.reward }}
      </span>
      <span class="recruit-card__deadline">
        {{ recruit.deadline ? `截止 ${recruit.deadline}` : '长期有效' }}
      </span>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.recruit-card {
  padding: var(--pg-spacing-md);
  border: 1px solid var(--pg-border-color);
  border-radius: var(--pg-border-radius);
  background-color: var(--pg-bg-card);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: var(--pg-shadow-card);
  }

  &__name {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: var(--pg-spacing-sm);
    color: var(--pg-text-primary);
  }

  &__detail {
    font-size: 13px;
    color: var(--pg-text-secondary);
    line-height: 1.6;
    margin-bottom: var(--pg-spacing-md);
    min-height: 42px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
  }

  &__reward {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--pg-color-warning);
    font-weight: 600;
  }

  &__deadline {
    color: var(--pg-text-placeholder);
  }
}
</style>
