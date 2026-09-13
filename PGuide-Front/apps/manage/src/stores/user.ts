import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi, clearToken, getToken, setToken } from '@/api'
import type { LoginBody, SysUser } from '@/api'

/**
 * 当前登录用户。
 *
 * 对应老 ruoyi-ui 的 `store/modules/user.js`。
 * 字段名保持和后端一致（RuoYi 侧是 user/roles/permissions）。
 */
export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())
  const user = ref<SysUser | null>(null)
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])

  const isAuthenticated = computed(() => Boolean(token.value))
  const nickName = computed(() => user.value?.nickName || user.value?.userName || '')
  const userName = computed(() => user.value?.userName ?? '')

  /**
   * 头像地址。后端存的是相对路径（如 `/profile/avatar/xxx.png`），
   * 需要拼上接口基地址才能访问 —— 老 ruoyi-ui 也是这么做的。
   */
  const avatar = computed(() => {
    const path = user.value?.avatar
    if (!path) return ''
    if (/^https?:\/\//.test(path)) return path
    return `${import.meta.env.VITE_API_BASE_URL}${path}`
  })

  /** 登录并保存 token */
  async function login(body: LoginBody): Promise<void> {
    const result = await authApi.login(body)
    if (!result.token) {
      throw new Error('登录成功但未返回 token')
    }
    token.value = result.token
    setToken(result.token)
  }

  /** 拉取用户信息、角色、权限 */
  async function fetchInfo(): Promise<void> {
    const result = await authApi.getInfo()
    user.value = result.user
    roles.value = result.roles ?? []
    permissions.value = result.permissions ?? []
  }

  /** 清空本地会话（不调用后端） */
  function reset(): void {
    token.value = null
    user.value = null
    roles.value = []
    permissions.value = []
    clearToken()
  }

  /** 退出登录：通知后端 + 清本地 */
  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } catch {
      // 后端登出失败也要清本地，否则用户会卡在「点了没反应」
    } finally {
      reset()
    }
  }

  return {
    token,
    user,
    roles,
    permissions,
    isAuthenticated,
    nickName,
    userName,
    avatar,
    login,
    fetchInfo,
    reset,
    logout,
  }
})
