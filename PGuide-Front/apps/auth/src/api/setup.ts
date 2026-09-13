import { configureApi } from '@pguide/api'

/**
 * API 层初始化。
 *
 * 鉴权中心是「接收跳转」的一方，不需要 onUnauthorized / onRedirect：
 *   - 401 意味着账号密码不对，由登录表单自己提示，不需要跳转
 *   - 307 是发给子系统（apps/match）的，鉴权中心自己不会收到
 */
export function setupApi(): void {
  configureApi({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    // 鉴权中心自己就是鉴权中心，两个地址相同
    authBaseUrl: import.meta.env.VITE_API_BASE_URL,
    selfUrl: import.meta.env.VITE_SELF_URL,
    timeout: 25_000,
  })
}
