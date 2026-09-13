<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

/**
 * 统一鉴权中心回跳落地页。
 *
 * ── 这个页面对应的契约（重要，写下来免得下次又踩） ──
 *
 * 老工程的流程是坏的，这里把契约定清楚：
 *
 *   1. 业务应用发现无 token → 调 `GET /auth/authCenter/redirect?sendUrl=<本应用地址>`
 *   2. 后端返回 code=307 + `{ redirectUrl, sendUrl }`
 *   3. 业务应用生成一次性 code（uuid），存 localStorage，
 *      然后 `window.location = <redirectUrl>#/redirect?code=<uuid>&sendUrl=<urlencoded>`
 *   4. 用户在鉴权中心登录，鉴权中心用 uuid 把 token 存进后端 Redis（1 分钟有效）
 *   5. 鉴权中心回跳到 sendUrl
 *   6. 业务应用启动时读 localStorage 里的 uuid → 调
 *      `GET /auth/authCenter/tokenEx?tokenCode=<uuid>` 换到真正的 token
 *
 * ⚠️ 已知问题：老版 auth-ui 用 `new URL(...).searchParams` 解析 `#/redirect?code=`，
 * 但 `searchParams` 读的是 `#` **之前**的部分，所以它取不到 code —— 那一步实际是失效的。
 * 幸好第 6 步依赖的是 localStorage 而不是 URL 参数，所以整条链路仍然能走通。
 * 重写 auth-ui 时需要把这段解析修掉（见 dev-manual/06-鉴权与会话.md）。
 */
const router = useRouter()
const userStore = useUserStore()

const status = ref<'pending' | 'success' | 'failed'>('pending')
const message = ref('正在核实登录信息…')

onMounted(async () => {
  // 路由守卫通常已经完成兑换，这里兜一次底
  const ok = userStore.isAuthenticated || (await userStore.redeemTokenCode())

  if (!ok) {
    status.value = 'failed'
    message.value = '未找到有效的登录凭证，可能已过期（有效期 1 分钟）'
    return
  }

  await userStore.loadUserInfo()
  status.value = 'success'
  message.value = `欢迎回来，${userStore.displayName}`

  // 稍作停留让用户看到提示，再回首页
  window.setTimeout(() => {
    void router.replace({ name: 'home' })
  }, 800)
})
</script>

<template>
  <div class="auth-callback">
    <el-result
      :icon="status === 'pending' ? 'info' : status === 'success' ? 'success' : 'error'"
      :title="
        status === 'pending' ? '登录中' : status === 'success' ? '登录成功' : '登录失败'
      "
      :sub-title="message"
    >
      <template #extra>
        <el-button v-if="status === 'failed'" type="primary" @click="router.push({ name: 'home' })">
          回到首页
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped lang="scss">
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
</style>
