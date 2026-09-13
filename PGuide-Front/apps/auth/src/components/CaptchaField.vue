<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'

/**
 * 验证码输入 + 图片。
 *
 * 对应老 auth-ui 里直接写在页面中的验证码片段。
 * 抽成组件的原因：验证码的交互要点（点击图片刷新、加载中不可点、
 * 空图占位）是最容易被各处实现得不一样的部分。
 */

const code = defineModel<string>({ required: true })

defineProps<{
  /** data URL，为空时显示占位 */
  image: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
  /** 用户按回车 —— 交给父组件决定是提交登录还是别的 */
  (e: 'submit'): void
}>()

function handleRefresh(): void {
  emit('refresh')
}
</script>

<template>
  <div class="captcha-field">
    <el-input
      v-model="code"
      size="large"
      maxlength="8"
      placeholder="验证码"
      autocomplete="off"
      @keyup.enter="emit('submit')"
    />

    <button
      type="button"
      class="captcha-field__image"
      :disabled="loading"
      :title="loading ? '加载中' : '点击刷新验证码'"
      @click="handleRefresh"
    >
      <img v-if="image" :src="image" alt="验证码" />
      <span v-else class="captcha-field__placeholder">
        <el-icon :class="{ 'is-loading': loading }"><Refresh /></el-icon>
      </span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.captcha-field {
  display: flex;
  align-items: center;
  gap: var(--pg-spacing-sm);

  :deep(.el-input) {
    flex: 1;
  }

  &__image {
    flex: 0 0 108px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--pg-border-color);
    border-radius: var(--pg-border-radius-sm);
    background-color: var(--pg-bg-hover);
    cursor: pointer;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    &:disabled {
      cursor: wait;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__placeholder {
    color: var(--pg-text-placeholder);
    display: flex;
    align-items: center;
  }

  :deep(.is-loading) {
    animation: captcha-spin 1s linear infinite;
  }
}

@keyframes captcha-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
