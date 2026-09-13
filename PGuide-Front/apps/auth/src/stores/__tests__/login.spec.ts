import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type * as PguideApi from '@pguide/api'

/**
 * 登录 store 的测试。
 *
 * 覆盖两个最容易出问题的分支：
 *   1. 子系统上下文缺失时不能继续（否则会拿空 tokenCode 去请求后端）
 *   2. 登录失败要把后端的英文/异常信息转成人能看懂的中文
 */

const fetchCaptcha = vi.fn()
const login = vi.fn()
const subSystemLogin = vi.fn()
const fetchThirdPartyList = vi.fn()

vi.mock('@pguide/api', async (importOriginal) => {
  const actual = await importOriginal<typeof PguideApi>()
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      fetchCaptcha: () => fetchCaptcha(),
      login: (body: unknown) => login(body),
      subSystemLogin: (body: unknown) => subSystemLogin(body),
      fetchThirdPartyList: () => fetchThirdPartyList(),
    },
  }
})

const { useLoginStore } = await import('../login')
// ApiError 用真实实现 —— store 里靠 instanceof 做错误分类，mock 掉就测不到东西
const { ApiError } = await import('@pguide/api')

const CAPTCHA = { uuid: 'uuid-1', img: 'AAAA' }

describe('useLoginStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchCaptcha.mockReset().mockResolvedValue(CAPTCHA)
    login.mockReset()
    subSystemLogin.mockReset()
    fetchThirdPartyList.mockReset().mockResolvedValue([])
  })

  it('refreshCaptcha 把 base64 拼成可直接给 img 的 data URL，并清空已输入的验证码', async () => {
    const store = useLoginStore()
    store.form.code = 'stale'

    await store.refreshCaptcha()

    expect(store.captcha).toEqual(CAPTCHA)
    expect(store.captchaImage).toBe('data:image/jpeg;base64,AAAA')
    expect(store.form.code).toBe('')
  })

  it('子系统登录缺少上下文时直接拒绝，不发请求', async () => {
    const store = useLoginStore()
    store.setSubSystemContext(null)

    const result = await store.loginForSubSystem()

    expect(result).toBeNull()
    expect(store.errorMessage).toContain('缺少子系统登录参数')
    expect(subSystemLogin).not.toHaveBeenCalled()
  })

  it('子系统登录把 tokenCode 和 redirectUrl 一起传给后端，并返回回跳地址', async () => {
    const store = useLoginStore()
    store.setSubSystemContext({ code: 'one-time-code', sendUrl: 'http://localhost:4000/' })
    await store.refreshCaptcha()
    store.form.account = 'student001'
    store.form.password = '123456'
    store.form.code = '8888'

    subSystemLogin.mockResolvedValue({ token: 'tk', redirectUrl: 'http://localhost:4000/' })

    const target = await store.loginForSubSystem()

    expect(target).toBe('http://localhost:4000/')
    expect(subSystemLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'student001',
        code: '8888',
        uuid: 'uuid-1',
        tokenCode: 'one-time-code',
        redirectUrl: 'http://localhost:4000/',
        sysType: 'pguide',
        userType: 'student',
      }),
    )
  })

  it('直接登录走 /auth/login 那条路径，不传 tokenCode', async () => {
    const store = useLoginStore()
    await store.refreshCaptcha()
    store.form.account = 'student001'
    store.form.code = '8888'

    login.mockResolvedValue('token-abc')

    const token = await store.loginDirect()

    expect(token).toBe('token-abc')
    expect(login).toHaveBeenCalledWith(expect.objectContaining({ account: 'student001' }))
    expect(subSystemLogin).not.toHaveBeenCalled()
  })

  it('验证码错误时给出中文提示，并自动刷新验证码', async () => {
    const store = useLoginStore()
    await store.refreshCaptcha()
    store.form.account = 'student001'
    store.form.code = '0000'

    login.mockRejectedValue(new ApiError(500, 'Captcha Error'))

    const token = await store.loginDirect()

    expect(token).toBeNull()
    expect(store.errorMessage).toBe('验证码错误或已过期，请重新输入')
    // 失败后会再拉一次验证码，所以 fetchCaptcha 被调了两次（初始化 + 失败后刷新）
    expect(fetchCaptcha).toHaveBeenCalledTimes(2)
  })

  it('密码错误的提示和验证码错误要区分开', async () => {
    const store = useLoginStore()
    await store.refreshCaptcha()
    store.form.account = 'student001'
    store.form.code = '8888'

    login.mockRejectedValue(new ApiError(500, 'Login Error'))

    await store.loginDirect()

    expect(store.errorMessage).toBe('账号或密码错误')
  })

  it('账号为空时本地就拦下，不发请求', async () => {
    const store = useLoginStore()
    await store.refreshCaptcha()
    store.form.account = '   '
    store.form.code = '8888'

    const token = await store.loginDirect()

    expect(token).toBeNull()
    expect(store.errorMessage).toBe('请输入账号')
    expect(login).not.toHaveBeenCalled()
  })

  it('第三方列表加载失败不影响登录，只是列表为空', async () => {
    const store = useLoginStore()
    fetchThirdPartyList.mockRejectedValue(new Error('boom'))

    await store.loadThirdPartyList()

    expect(store.thirdPartyList).toEqual([])
    expect(store.errorMessage).toBeNull()
  })
})
