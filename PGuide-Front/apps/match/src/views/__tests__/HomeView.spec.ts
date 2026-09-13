import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { STORAGE_KEYS } from '@pguide/shared'
import { configureApi } from '@pguide/api'
import type * as PguideApi from '@pguide/api'
import { useUserStore } from '@/stores/user'

/**
 * 首页渲染冒烟测试。
 *
 * 单测（services / api）只覆盖纯逻辑，这个文件把 HomeView 真正挂载一次，
 * 覆盖"页面能不能打开"这一层 —— 组件解析、store 初始化、onMounted 里
 * 抛异常这类问题只有渲染时才会暴露。
 */

const fetchSubjectTree = vi.fn()

vi.mock('@pguide/api', async (importOriginal) => {
  const actual = await importOriginal<typeof PguideApi>()
  return {
    ...actual,
    subjectApi: {
      ...actual.subjectApi,
      fetchSubjectTree: () => fetchSubjectTree(),
    },
  }
})

const HomeView = (await import('@/views/HomeView.vue')).default

/** 后端真实返回的形状：按父 id 索引的邻接表，且 subjectLevel 是字符串 */
const ADJACENCY = {
  '0': [
    { subjectId: 1, subjectName: '数学建模', subjectLevel: '1', parentId: 0 },
    { subjectId: 2, subjectName: '创新创业', subjectLevel: '1', parentId: 0 },
  ],
  '1': [{ subjectId: 4, subjectName: '算法与程序', subjectLevel: '2', parentId: 1 }],
}

async function mountHomeView() {
  configureApi({
    apiBaseUrl: 'http://test/api',
    authBaseUrl: 'http://test/api',
    selfUrl: 'http://test/',
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/details', name: 'detail', component: { template: '<div />' } },
      { path: '/user', name: 'userCenter', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  return mount(HomeView, { global: { plugins: [createPinia(), router] } })
}

describe('HomeView 渲染冒烟', () => {
  beforeEach(() => {
    fetchSubjectTree.mockReset().mockResolvedValue(ADJACENCY)
    window.localStorage.clear()
  })

  it('能挂载并渲染出导航与首页骨架', async () => {
    const wrapper = await mountHomeView()
    await flushPromises()

    expect(wrapper.find('.nav-top__logo').text()).toBe('项导')
    expect(wrapper.find('.home-body__slogan').text()).toContain('找到一起打比赛的队友')
    expect(wrapper.find('.home-body__search').exists()).toBe(true)
  })

  it('学科树用真实接口数据渲染出一级与二级学科', async () => {
    const wrapper = await mountHomeView()
    await flushPromises()

    expect(fetchSubjectTree).toHaveBeenCalledTimes(1)

    const cascade = wrapper.find('.subject-cascade')
    expect(cascade.exists()).toBe(true)
    expect(cascade.text()).toContain('数学建模')
    expect(cascade.text()).toContain('创新创业')
    // 第二个列显示的是第一个一级节点的子节点
    expect(cascade.text()).toContain('算法与程序')
  })

  it('热门项目与需求市场渲染出占位卡片，并显式标注是示例数据', async () => {
    const wrapper = await mountHomeView()
    await flushPromises()

    expect(wrapper.findAll('.info-card').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.recruit-card').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('示例数据')
  })

  it('学科树接口失败时显示错误提示，页面其余部分不受影响', async () => {
    fetchSubjectTree.mockRejectedValue(new Error('学科树加载失败：401'))

    const wrapper = await mountHomeView()
    await flushPromises()

    expect(wrapper.text()).toContain('学科树加载失败')
    // 关键：不能整页崩掉
    expect(wrapper.find('.home-body__slogan').exists()).toBe(true)
    expect(wrapper.findAll('.info-card').length).toBeGreaterThan(0)
  })

  it('未登录时导航展示"用户信息"入口（沿用老工程行为）', async () => {
    const wrapper = await mountHomeView()
    await flushPromises()

    // NavTop 里是 v-if/v-else：已登录才显示用户名下拉，未登录显示这个按钮
    expect(wrapper.find('.nav-top__user').text()).toContain('用户信息')
  })

  it('已登录（localStorage 有 token + store 有用户信息）时显示用户名下拉', async () => {
    window.localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify('fake-token'))

    const pinia = createPinia()
    setActivePinia(pinia)
    const userStore = useUserStore()
    // store 的 token 在创建时从 localStorage 读，上面已经写好
    expect(userStore.isAuthenticated).toBe(true)
    userStore.userInfo = {
      userName: '小张',
      userSchool: '示例大学',
      userAccount: 'student001',
      userAcademy: '计算机学院',
      userType: 'student',
      userId: 1,
      workId: '2021001',
      studentYear: '2021',
      userGroup: null,
    }

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: HomeView },
        { path: '/details', name: 'detail', component: { template: '<div />' } },
        { path: '/user', name: 'userCenter', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.find('.nav-top__user').text()).toContain('小张')
  })
})
