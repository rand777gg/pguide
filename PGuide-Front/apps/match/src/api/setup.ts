import { configureApi } from '@pguide/api'
import router from '@/router'
import { useUserStore } from '@/stores/user'

/**
 * API 层初始化。
 *
 * 为什么要有这一层：`@pguide/api` 是跨应用复用的库，它不应该知道
 * 本应用的 router / store 长什么样。所以由应用侧把环境和副作用注入进去。
 *
 * - 环境变量：Vite 用 `import.meta.env.VITE_*`（老工程是 `process.env.VUE_APP_*`）
 * - onUnauthorized：会话失效时清用户态并跳登录
 * - onRedirect：需要跳统一鉴权中心时（默认 window.location.assign），
 *   这里显式写出来是为了让流程可读
 */
export function setupApi(): void {
  configureApi({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    authBaseUrl: import.meta.env.VITE_AUTH_API_BASE_URL,
    selfUrl: import.meta.env.VITE_SELF_URL,
    timeout: 25_000,

    onUnauthorized: () => {
      const userStore = useUserStore()
      userStore.reset()
      void router.push({ name: 'forbidden' })
    },

    onRedirect: (url: string) => {
      window.location.assign(url)
    },
  })
}
