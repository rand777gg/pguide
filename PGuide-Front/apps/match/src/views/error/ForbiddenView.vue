<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

/**
 * 需要登录（403）。
 *
 * 老工程这里是 `views/error/403.vue`，兼了两个职责：
 *   1. 提示未登录
 *   2. 在 mounted 里偷偷做 token 兑换（读 localStorage 的 tokenCode →
 *      调 /auth/authCenter/tokenEx → 存 token → window.location="/"）
 *
 * 兑换逻辑挪到路由守卫 + AuthCallbackView 之后，这个页面只负责提示和跳转。
 */
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const redirecting = ref(false)

/** 登录后要回到的位置，由守卫在 query 里带过来 */
const redirectTarget = computed(() => String(route.query.redirect ?? '/'))

async function goToLogin(): Promise<void> {
  redirecting.value = true
  try {
    // 跳到统一鉴权中心；登录完成后会带一次性 code 回到本应用
    await userStore.goToAuthCenter()
  } catch {
    redirecting.value = false
    void router.push({ name: 'home' })
  }
}
</script>

<template>
  <div class="forbidden">
    <el-result icon="warning" title="需要登录" sub-title="该页面需要登录后才能访问">
      <template #extra>
        <el-button type="primary" :loading="redirecting" @click="goToLogin">
          去统一鉴权中心登录
        </el-button>
        <el-button @click="router.push(redirectTarget)">继续浏览</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped lang="scss">
.forbidden {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
</style>
