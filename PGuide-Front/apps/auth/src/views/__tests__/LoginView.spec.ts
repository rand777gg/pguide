import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { configureApi } from '@pguide/api'
import type * as PguideApi from '@pguide/api'

/**
 * 渲染冒烟测试。
 *
 * 为什么单测不够：`vue-tsc` 能检查类型、`vite build` 能检查能否打包，
 * 但**都检查不到运行时**的问题 —— 比如组件没被解析（`Failed to resolve
 * component`）、store 初始化顺序、onMounted 里抛异常。这些只在浏览器
 * 控制台里才看得到。
 *
 * 这个文件把页面真正挂载一次，等于在没有浏览器的情况下做最低限度的
 * "页面能不能打开"验证。
 */

const fetchCaptcha = vi.fn()
const fetchThirdPartyList = vi.fn()

vi.mock('@pguide/api', async (importOriginal) => {
  const actual = await importOriginal<typeof PguideApi>()
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      fetchCaptcha: () => fetchCaptcha(),
      fetchThirdPartyList: () => fetchThirdPartyList(),
    },
  }
})

const LoginView = (await import('@/views/LoginView.vue')).default

/** 组装一个最小可用的路由（LoginView 里用了 useRouter） */
async function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: LoginView }],
  })
  await router.push('/')
  await router.isReady()
  return router
}

async function mountLoginView() {
  configureApi({
    apiBaseUrl: 'http://test/api',
    authBaseUrl: 'http://test/api',
    selfUrl: 'http://test/',
  })
  const router = await createTestRouter()
  return mount(LoginView, {
    global: { plugins: [createPinia(), router] },
  })
}

describe('LoginView 渲染冒烟', () => {
  beforeEach(() => {
    fetchCaptcha.mockReset().mockResolvedValue({ uuid: 'u1', img: 'AAAA' })
    fetchThirdPartyList.mockReset().mockResolvedValue([])
    // jsdom 默认地址是 http://localhost:3000/，没有 code/sendUrl，
    // 因此走「直接登录」分支而不是子系统分支
    window.history.replaceState({}, '', '/')
  })

  it('能挂载并渲染出登录表单的关键元素', async () => {
    const wrapper = await mountLoginView()
    await flushPromises()

    expect(wrapper.find('.login-page__brand').text()).toBe('项导')
    expect(wrapper.find('.login-page__subtitle').text()).toContain('统一身份认证')
    expect(wrapper.find('button').exists()).toBe(true)
    // 身份切换（学生/教师）
    expect(wrapper.text()).toContain('学生')
    expect(wrapper.text()).toContain('教师')
  })

  it('挂载后自动拉验证码，并把 base64 拼成 data URL', async () => {
    const wrapper = await mountLoginView()
    await flushPromises()

    expect(fetchCaptcha).toHaveBeenCalledTimes(1)
    const img = wrapper.find('.captcha-field__image img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('data:image/jpeg;base64,AAAA')
  })

  it('URL 里带 code + sendUrl 时进入子系统模式，并展示来源提示', async () => {
    window.history.replaceState(
      {},
      '',
      '/redirect?code=abc&sendUrl=' + encodeURIComponent('http://localhost:4000/'),
    )

    const wrapper = await mountLoginView()
    await flushPromises()

    expect(wrapper.text()).toContain('正在为业务系统登录')
    expect(wrapper.find('.login-page__notice-target').text()).toBe('http://localhost:4000/')
  })

  it('老格式（参数在 # 之后）也能进入子系统模式', async () => {
    // 这正是老 auth-ui 解析失败的形式
    window.history.replaceState(
      {},
      '',
      '/#/redirect?code=legacy&sendUrl=' + encodeURIComponent('http://localhost:4000/'),
    )

    const wrapper = await mountLoginView()
    await flushPromises()

    expect(wrapper.text()).toContain('正在为业务系统登录')
  })

  it('验证码接口失败时给出错误提示，页面不崩', async () => {
    fetchCaptcha.mockRejectedValue(new Error('网络异常'))

    const wrapper = await mountLoginView()
    await flushPromises()

    expect(wrapper.text()).toContain('网络异常')
    expect(wrapper.find('.login-page__brand').exists()).toBe(true)
  })
})
