<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

/**
 * 分类详情页。
 *
 * 老工程 `views/details/DetailPage.vue` 展示的是 10 条硬编码卡片 + el-pagination，
 * 分类名从 URL 的 query 里取（`detailTags`），返回按钮用
 * `location.href = process.env.VUE_APP_SELF_PATH`（整页跳转）。
 *
 * 这里保持同样的 query 契约（`/details?detailTags=xxx`），
 * 但数据来源改成 service 层，返回用 router.back()。
 */
const route = useRoute()
const router = useRouter()

const detailTags = computed(() => String(route.query.detailTags ?? '未指定分类'))

const currentPage = ref(1)
const pageSize = ref(6)

// TODO(后端): 接入 /mms/project/list?subject=<detailTags>&pageNum=&pageSize=
const total = ref(0)
const items = ref<never[]>([])

function backToIndex(): void {
  if (window.history.length > 1) {
    router.back()
  } else {
    void router.push({ name: 'home' })
  }
}
</script>

<template>
  <div class="detail-page">
    <header class="detail-page__header">
      <el-button link @click="backToIndex">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1 class="detail-page__title">{{ detailTags }}</h1>
    </header>

    <el-empty v-if="total === 0" description="该分类下暂无项目（后端列表接口待实现）" />

    <ul v-else class="detail-page__list">
      <li v-for="(item, index) in items" :key="index">{{ item }}</li>
    </ul>

    <el-pagination
      v-if="total > 0"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      class="detail-page__pagination"
      layout="prev, pager, next"
      :total="total"
    />
  </div>
</template>

<style scoped lang="scss">
.detail-page {
  max-width: var(--pg-content-max-width);
  margin: 0 auto;
  padding: var(--pg-spacing-lg);

  &__header {
    display: flex;
    align-items: center;
    gap: var(--pg-spacing-md);
    margin-bottom: var(--pg-spacing-lg);
  }

  &__title {
    font-size: 22px;
    font-weight: 600;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--pg-spacing-md);
  }

  &__pagination {
    margin-top: var(--pg-spacing-lg);
    justify-content: center;
  }
}
</style>
