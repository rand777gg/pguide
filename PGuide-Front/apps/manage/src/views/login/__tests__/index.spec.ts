import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { RuoYiError } from '@/api'
import { useUserStore } from '@/stores/user'
import type * as ManageApi from '@/api'

/**
 * 登录页的渲染与提交测试。
 *
 * 全部通过**驱动真实界面**来验证（往输入框填值、点按钮），
 * 而不是去读组件内部状态 —— `<script setup>` 本来就不暴露内部绑定，
 * 而且走界面才真的覆盖了「用户点得动吗」。
 *
 * 登录涉及几件容易出错的事：验证码可能被后端关掉、空表单要本地拦下、
 * 失败后要刷新验证码、成功后要跳到 redirect 指定的页面而不是无脑进首页。
 */

const fetchCaptchaImage = vi.fn()
const login = vi.fn()

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ManageApi>()
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      fetchCaptchaImage: () => fetchCaptchaImage(),
      login: (body: unknown) => login(body),
    },
  }
})

const LoginView = (await import('../index.vue')).default

const CAPTCHA = { captchaEnabled: true, uuid: 'uuid-1', img: 'AAAA' }

/** 挂载登录页；redirect 会拼进 URL 查询串，模拟「被拦截后跳登录」的场景 */
async function mountLogin(redirect?: string) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/system/user', component: { template: '<div>users</div>' } },
    ],
  })
  await router.push(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login')
  await router.isReady()

  const wrapper = mount(LoginView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router }
}

/**
 * 往表单里填值。
 * 输入框在 DOM 里的顺序是：账号、密码、（开启验证码时的）验证码。
 */
async function fillForm(
  wrapper: VueWrapper,
  values: { username?: string; password?: string; code?: string },
): Promise<void> {
  const inputs = wrapper.findAll('input')
  if (values.username !== undefined) await inputs[0]!.setValue(values.username)
  if (values.password !== undefined) await inputs[1]!.setValue(values.password)
  if (values.code !== undefined && inputs[2]) await inputs[2]!.setValue(values.code)
}

async function clickLogin(wrapper: VueWrapper): Promise<void> {
  await wrapper.find('.login__submit').trigger('click')
  await flushPromises()
}

describe('登录页', () => {
  beforeEach(() => {
    window.localStorage.clear()
    fetchCaptchaImage.mockReset().mockResolvedValue(CAPTCHA)
    login.mockReset().mockResolvedValue({ token: 'token-abc' })
  })

  it('挂载时拉取验证码并渲染成图片', async () => {
    const { wrapper } = await mountLogin()

    expect(fetchCaptchaImage).toHaveBeenCalledTimes(1)
    const img = wrapper.find('.login__captcha-img img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('data:image/gif;base64,AAAA')
  })

  it('渲染出标题、账号框、密码框与登录按钮', async () => {
    const { wrapper } = await mountLogin()

    expect(wrapper.find('.login__title').text()).toContain('项导')

    // 提示文字在 placeholder 属性里，不在文本内容里
    const inputs = wrapper.findAll('input')
    expect(inputs[0]!.attributes('placeholder')).toBe('账号')
    expect(inputs[1]!.attributes('placeholder')).toBe('密码')
    expect(inputs[1]!.attributes('type')).toBe('password')

    expect(wrapper.find('.login__submit').exists()).toBe(true)
  })

  it('表单默认是空的，不预填任何账号密码', async () => {
    // 预填默认凭据等于把口令硬编码进源码，这条测试守住它不要被加回来
    const { wrapper } = await mountLogin()

    const inputs = wrapper.findAll('input')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('')
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('')
  })

  it('后端关闭验证码时不渲染验证码区域', async () => {
    fetchCaptchaImage.mockResolvedValue({ captchaEnabled: false, uuid: '' })
    const { wrapper } = await mountLogin()

    expect(wrapper.find('.login__captcha').exists()).toBe(false)
  })

  it('后端关闭验证码时不填验证码也能登录成功', async () => {
    fetchCaptchaImage.mockResolvedValue({ captchaEnabled: false, uuid: '' })
    const { wrapper, router } = await mountLogin()

    await fillForm(wrapper, { username: 'admin', password: 'admin123' })
    await clickLogin(wrapper)

    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'admin', password: 'admin123' }),
    )
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('账号或密码为空时本地拦下，不发请求', async () => {
    const { wrapper } = await mountLogin()

    // 表单默认就是空的，直接提交就该被拦下
    await clickLogin(wrapper)

    expect(login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入账号和密码')
  })

  it('开启验证码但未填写时也拦下', async () => {
    const { wrapper } = await mountLogin()

    await fillForm(wrapper, { username: 'admin', password: 'admin123', code: '' })
    await clickLogin(wrapper)

    expect(login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入验证码')
  })

  it('登录成功：保存 token 并跳到 redirect 指定的页面', async () => {
    const { wrapper, router } = await mountLogin('/system/user')

    await fillForm(wrapper, { username: 'admin', password: 'admin123', code: '8888' })
    await clickLogin(wrapper)

    expect(login).toHaveBeenCalledWith({
      username: 'admin',
      password: 'admin123',
      code: '8888',
      uuid: 'uuid-1',
    })
    expect(useUserStore().token).toBe('token-abc')
    expect(window.localStorage.getItem('PGUIDE_ADMIN_TOKEN')).toBe('token-abc')
    expect(router.currentRoute.value.path).toBe('/system/user')
  })

  it('登录失败：显示错误、刷新验证码、不跳转', async () => {
    login.mockRejectedValue(new RuoYiError(500, '用户不存在/密码错误'))
    const { wrapper, router } = await mountLogin()

    await fillForm(wrapper, { username: 'admin', password: 'wrong', code: '8888' })
    await clickLogin(wrapper)

    expect(wrapper.text()).toContain('用户不存在/密码错误')
    // 初始化 1 次 + 失败后刷新 1 次
    expect(fetchCaptchaImage).toHaveBeenCalledTimes(2)
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('验证码接口失败时页面不崩，只显示错误', async () => {
    fetchCaptchaImage.mockRejectedValue(new Error('验证码服务不可用'))
    const { wrapper } = await mountLogin()

    expect(wrapper.text()).toContain('验证码服务不可用')
    expect(wrapper.find('.login__title').exists()).toBe(true)
  })

  it('点验证码图片会重新拉取', async () => {
    const { wrapper } = await mountLogin()
    fetchCaptchaImage.mockClear()

    await wrapper.find('.login__captcha-img').trigger('click')
    await flushPromises()

    expect(fetchCaptchaImage).toHaveBeenCalledTimes(1)
  })
})
