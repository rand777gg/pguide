import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@pguide/shared'
import type { UserInfoVo } from '@pguide/shared'
import { authApi, clearToken, getToken, setToken } from '@pguide/api'

/**
 * 用户会话 Store。
 *
 * 对应老工程的 Vuex `store/moudules/user.js`（注意原目录名拼写是 moudules）。
 * 老实现里的问题，这里一并处理：
 *   - token 存在 sessionStorage（utils/auth.js），但 axios 拦截器读的是
 *     localStorage（utils/request.js）—— 两套存储不一致，实际是坏的
 *   - `Login` action 调用的是 `loginToCenter()`（无参 GET），传进去的参数被忽略，
 *     且 `res.token` 根本不存在，这个 action 从来没生效过
 *   - 登录跳转的副作用（改 window.location）藏在 axios 拦截器里，无法测试
 *
 * 新实现把「换 token → 拉用户信息」做成显式 action，副作用全部可观测。
 */
export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())
  const userInfo = ref<UserInfoVo | null>(null)
  const loading = ref(false)
  const lastError = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))

  const displayName = computed(
    () => userInfo.value?.userName || userInfo.value?.userAccount || '未登录',
  )

  /** 用户类型：student / teacher / spd-user（见后端 AuthConst.UserTypeConst） */
  const userType = computed(() => userInfo.value?.userType ?? '')

  function applyToken(value: string): void {
    token.value = value
    setToken(value)
  }

  function reset(): void {
    token.value = null
    userInfo.value = null
    lastError.value = null
    clearToken()
  }

  /**
   * 从鉴权中心回跳后，用本地暂存的一次性 code 换真正的访问令牌。
   *
   * 流程见 `@pguide/api` 的 performRedirect：跳转前把 uuid 写进
   * localStorage，用户登录完成后回到本应用，这里再消费它。
   * code 是一次性的（后端 Redis 里只保留 1 分钟），无论成败都要清掉。
   *
   * @returns 是否成功换到 token
   */
  async function redeemTokenCode(): Promise<boolean> {
    const code = readStorage<string>(STORAGE_KEYS.TOKEN_CODE)
    if (!code) return false

    try {
      const exchanged = await authApi.exchangeToken(code)
      if (!exchanged) return false
      applyToken(exchanged)
      return true
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '换取 token 失败'
      return false
    } finally {
      removeStorage(STORAGE_KEYS.TOKEN_CODE)
    }
  }

  /** 拉取当前登录用户的会话信息 */
  async function loadUserInfo(): Promise<UserInfoVo | null> {
    if (!token.value) return null

    loading.value = true
    try {
      const info = await authApi.fetchUserInfoVo()
      userInfo.value = info
      return info
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '获取用户信息失败'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 保证会话可用：没有 token 就尝试用一次性 code 换，
   * 换到了再补拉用户信息。路由守卫调用这个。
   */
  async function ensureSession(): Promise<boolean> {
    if (!token.value) {
      const redeemed = await redeemTokenCode()
      if (!redeemed) return false
    }
    if (!userInfo.value) {
      await loadUserInfo()
    }
    return true
  }

  /** 主动跳转到统一鉴权中心登录 */
  function goToAuthCenter(): Promise<unknown> {
    return authApi.redirectToAuthCenter()
  }

  function logout(): void {
    reset()
    removeStorage(STORAGE_KEYS.TOKEN_CODE)
  }

  /** 仅供测试/调试：直接写入 token */
  function setTokenDirectly(value: string): void {
    applyToken(value)
    writeStorage(STORAGE_KEYS.TOKEN, value)
  }

  return {
    token,
    userInfo,
    loading,
    lastError,
    isAuthenticated,
    displayName,
    userType,
    applyToken,
    reset,
    redeemTokenCode,
    loadUserInfo,
    ensureSession,
    goToAuthCenter,
    logout,
    setTokenDirectly,
  }
})
