<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

/**
 * 用户中心外壳。
 *
 * 老工程对应 `views/details/user/UserCenter.vue`：一个 RETURN 按钮 +
 * `<router-view>` + 底部的 BOTTOM 区块。
 * 另外还有一个从未被路由引用的 `views/frame/UserCenter.vue`（纯占位），已删除。
 */
const router = useRouter()
</script>

<template>
  <div class="user-center">
    <header class="user-center__header">
      <el-button link @click="router.push({ name: 'home' })">
        <el-icon><ArrowLeft /></el-icon>
        返回首页
      </el-button>
      <h1 class="user-center__title">用户中心</h1>
    </header>

    <main class="user-center__body">
      <RouterView />
    </main>
  </div>
</template>

<style scoped lang="scss">
.user-center {
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
}
</style>
