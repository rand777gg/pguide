import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { AUTH_SYSTEM_TYPE, AUTH_USER_TYPE } from '@pguide/shared'
import type { AuthUserType, CaptchaResult } from '@pguide/shared'
import { ApiError, authApi, toCaptchaDataUrl } from '@pguide/api'
import type { AuthRedirectParams, ThirdPartyItem } from '@pguide/api'

/**
 * 登录状态机。
 *
 * 对应老 auth-ui 里散落在两个 View（AuthCenterHomeView / LightAuthCenterHomeView）
 * 中的逻辑 —— 同一套流程写了两遍，而且其中一份的子系统参数解析是坏的。
 * 这里合成一个 store，两个页面共用。
 */

/** 登录表单的可编辑字段 */
export interface LoginForm {
  account: string
  password: string
  /** 验证码，由用户输入 */
  code: string
  userType: AuthUserType
}

export const useLoginStore = defineStore('login', () => {
  // ---- 表单状态 ----
  const form = ref<LoginForm>({
    account: '',
    password: '',
    code: '',
    userType: AUTH_USER_TYPE.STUDENT,
  })

  // ---- 验证码 ----
  const captcha = ref<CaptchaResult | null>(null)
  /** 可以直接给 <img src> 的 data URL */
  const captchaImage = computed(() =>
    captcha.value ? toCaptchaDataUrl(captcha.value.img) : '',
  )
  const captchaLoading = ref(false)

  // ---- 第三方登录 ----
  const thirdPartyList = ref<ThirdPartyItem[]>([])

  // ---- 提交流程 ----
  const submitting = ref(false)
  const errorMessage = ref<string | null>(null)

  /**
   * 子系统登录上下文。
   * 由 `/redirect?code=..&sendUrl=..` 页面解析后写入；
   * 为 null 表示用户是直接访问鉴权中心的（不是被子系统跳过来的）。
   */
  const subSystem = ref<AuthRedirectParams | null>(null)

  const isSubSystemLogin = computed(() => subSystem.value !== null)

  function setSubSystemContext(params: AuthRedirectParams | null): void {
    subSystem.value = params
  }

  function clearError(): void {
    errorMessage.value = null
  }

  /**
   * 拉取验证码。登录失败后也会调它 —— 旧的可能已经过期。
   *
   * ⚠️ 这里**故意不调 clearError()**。
   * 曾经这么写过，结果是：runLogin 的 catch 里先 `errorMessage = ...`
   * 再调本函数，而本函数开头的 clearError() 是同步执行的，
   * 于是刚设好的错误提示立刻被清空，用户什么都看不到。
   * 清错误的责任交给提交入口（runLogin 开头已经 clearError 了）。
   */
  async function refreshCaptcha(): Promise<void> {
    captchaLoading.value = true
    try {
      captcha.value = await authApi.fetchCaptcha()
      form.value.code = ''
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '验证码加载失败'
    } finally {
      captchaLoading.value = false
    }
  }

  /** 拉第三方登录方式列表（失败不阻塞登录，只是不显示那几个入口） */
  async function loadThirdPartyList(): Promise<void> {
    try {
      thirdPartyList.value = await authApi.fetchThirdPartyList()
    } catch {
      thirdPartyList.value = []
    }
  }

  /**
   * 鉴权中心自身登录（用户直接访问鉴权中心页面的情况）。
   * @returns 成功时返回 token
   */
  async function loginDirect(): Promise<string | null> {
    return runLogin(async () => {
      const token = await authApi.login({
        account: form.value.account,
        password: form.value.password,
        sysType: AUTH_SYSTEM_TYPE.PGUIDE,
        userType: form.value.userType,
        code: form.value.code,
        uuid: captcha.value?.uuid ?? '',
      })
      return { done: true, value: token }
    })
  }

  /**
   * 子系统登录（从 apps/match 这类业务应用跳过来的情况）。
   *
   * 必须走 `/auth/authCenter/login` 而不是 `/auth/login`：
   * 前者会多带一个 tokenCode，后端据此把 token 存进 Redis，
   * 供子系统回跳后用 `/auth/authCenter/tokenEx` 换取。
   *
   * @returns 成功时返回要回跳的子应用地址
   */
  async function loginForSubSystem(): Promise<string | null> {
    const context = subSystem.value
    if (!context) {
      errorMessage.value = '缺少子系统登录参数，请从业务系统重新进入'
      return null
    }

    return runLogin(async () => {
      const result = await authApi.subSystemLogin({
        account: form.value.account,
        password: form.value.password,
        code: form.value.code,
        uuid: captcha.value?.uuid ?? '',
        // 登录完成后要跳回的业务应用地址
        redirectUrl: context.sendUrl,
        // 子系统传来的一次性 code
        tokenCode: context.code,
        sysType: AUTH_SYSTEM_TYPE.PGUIDE,
        userType: form.value.userType,
      })
      return { done: true, value: result.redirectUrl }
    })
  }

  /** 两个登录入口共用的提交流程：校验 → 提交 → 失败时刷新验证码 */
  async function runLogin<T>(
    action: () => Promise<{ done: true; value: T }>,
  ): Promise<T | null> {
    if (!captcha.value) {
      errorMessage.value = '验证码尚未加载，请点击图片重试'
      return null
    }
    if (!form.value.account.trim()) {
      errorMessage.value = '请输入账号'
      return null
    }
    if (!form.value.code.trim()) {
      errorMessage.value = '请输入验证码'
      return null
    }

    submitting.value = true
    clearError()
    try {
      const { value } = await action()
      return value
    } catch (error) {
      errorMessage.value = toFriendlyMessage(error)
      // 验证码是一次性的展示信息，失败后刷新，避免用户反复提交同一个
      void refreshCaptcha()
      return null
    } finally {
      submitting.value = false
    }
  }

  function reset(): void {
    form.value = {
      account: '',
      password: '',
      code: '',
      userType: AUTH_USER_TYPE.STUDENT,
    }
    errorMessage.value = null
  }

  return {
    form,
    captcha,
    captchaImage,
    captchaLoading,
    thirdPartyList,
    submitting,
    errorMessage,
    subSystem,
    isSubSystemLogin,
    setSubSystemContext,
    clearError,
    refreshCaptcha,
    loadThirdPartyList,
    loginDirect,
    loginForSubSystem,
    reset,
  }
})

/**
 * 把后端的错误转成人能看懂的话。
 *
 * 后端 `GlobalExceptionHandler` 会把已知异常转成 JsonResult，
 * 但 message 有时是英文（"Captcha Error"），有时是 Java 异常信息。
 * 这里做一层映射，把常见的几种翻成中文。
 */
function toFriendlyMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : '登录失败，请稍后重试'
  }

  const raw = error.message || ''
  if (/captcha/i.test(raw)) return '验证码错误或已过期，请重新输入'
  if (/login/i.test(raw)) return '账号或密码错误'
  if (/not\s*found/i.test(raw)) return '账号不存在'

  return raw || '登录失败，请稍后重试'
}
