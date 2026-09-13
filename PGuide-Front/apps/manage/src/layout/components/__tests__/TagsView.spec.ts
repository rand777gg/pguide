import type * as ElementPlus from 'element-plus/es'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useTagsStore } from '@/stores/tags'

/**
 * 多标签页组件的交互测试。
 *
 * 覆盖的是用户真会做的操作：点标签切页、点 × 关标签、右键刷新/关闭其它/关闭全部。
 * 关标签时「跳到哪」是这类组件最容易出错的地方（关掉当前页要落到相邻标签），
 * 所以那几条断言写得比较细。
 */

vi.mock('element-plus/es', async (importOriginal) => {
  const actual = await importOriginal<typeof ElementPlus>()
  return { ...actual, ElMessage: { success: () => undefined, error: () => undefined } }
})

const TagsView = (await import('../TagsView.vue')).default

async function mountTagsView(path = '/system/user') {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/index' },
      { path: '/index', name: 'Index', component: { template: '<div>首页</div>' }, meta: { title: '首页', affix: true } },
      { path: '/system/user', name: 'SystemUser', component: { template: '<div>用户</div>' }, meta: { title: '用户管理' } },
      { path: '/system/role', name: 'SystemRole', component: { template: '<div>角色</div>' }, meta: { title: '角色管理' } },
      { path: '/redirect/:path(.*)', name: 'Redirect', component: { template: '<div />' }, meta: { hidden: true } },
    ],
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(TagsView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router, tags: useTagsStore() }
}

/** 按标题找标签元素 */
function tagOf(wrapper: VueWrapper, title: string) {
  return wrapper.findAll('.tags-view__item').find((item) => item.text().includes(title))
}

describe('TagsView', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('当前页会出现在标签栏里，固定首页始终在', async () => {
    const { wrapper } = await mountTagsView()

    const titles = wrapper.findAll('.tags-view__item').map((i) => i.text())
    expect(titles[0]).toContain('首页')
    expect(titles[1]).toContain('用户管理')
  })

  it('只有固定标签没有关闭按钮', async () => {
    const { wrapper } = await mountTagsView()

    expect(tagOf(wrapper, '首页')!.find('.tags-view__close').exists()).toBe(false)
    expect(tagOf(wrapper, '用户管理')!.find('.tags-view__close').exists()).toBe(true)
  })

  it('当前标签带高亮 class', async () => {
    const { wrapper } = await mountTagsView()

    expect(tagOf(wrapper, '用户管理')!.classes()).toContain('is-active')
    expect(tagOf(wrapper, '首页')!.classes()).not.toContain('is-active')
  })

  it('点别的标签会跳过去', async () => {
    const { wrapper, router, tags } = await mountTagsView()
    tags.addView({
      path: '/system/role',
      fullPath: '/system/role',
      name: 'SystemRole',
      meta: { title: '角色管理' },
    } as never)
    await flushPromises()

    await tagOf(wrapper, '角色管理')!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/system/role')
  })

  it('关闭非当前标签：只从栏里移除，不跳转', async () => {
    const { wrapper, router, tags } = await mountTagsView()
    tags.addView({
      path: '/system/role',
      fullPath: '/system/role',
      name: 'SystemRole',
      meta: { title: '角色管理' },
    } as never)
    await flushPromises()

    await tagOf(wrapper, '角色管理')!.find('.tags-view__close').trigger('click')
    await flushPromises()

    expect(tagOf(wrapper, '角色管理')).toBeUndefined()
    expect(tags.cachedNames).not.toContain('SystemRole')
    // 当前页没变
    expect(router.currentRoute.value.path).toBe('/system/user')
  })

  it('关闭当前标签：落到最后一个剩下的标签，缓存也一起释放', async () => {
    const { wrapper, router, tags } = await mountTagsView()

    await tagOf(wrapper, '用户管理')!.find('.tags-view__close').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/index')
    expect(tags.visitedViews.map((v) => v.title)).toEqual(['首页'])
    // 被关掉的页面缓存必须释放；此时首页成了当前页，它自己也进了缓存
    expect(tags.cachedNames).not.toContain('SystemUser')
    expect(tags.cachedNames).toEqual(['Index'])
  })

  it('右键弹出菜单，里面有刷新 / 关闭 / 关闭其它 / 关闭全部', async () => {
    const { wrapper } = await mountTagsView()

    await tagOf(wrapper, '用户管理')!.trigger('contextmenu')
    await flushPromises()

    const items = wrapper.findAll('.tags-view__menu li').map((li) => li.text())
    expect(items).toEqual(['刷新', '关闭', '关闭其它', '关闭全部'])
  })

  it('固定标签的右键菜单里没有「关闭」', async () => {
    const { wrapper } = await mountTagsView()

    await tagOf(wrapper, '首页')!.trigger('contextmenu')
    await flushPromises()

    const items = wrapper.findAll('.tags-view__menu li').map((li) => li.text())
    expect(items).not.toContain('关闭')
    expect(items).toContain('关闭其它')
  })

  it('右键「刷新」会先丢缓存再走 /redirect 中转', async () => {
    const { wrapper, tags } = await mountTagsView()
    expect(tags.cachedNames).toContain('SystemUser')

    await tagOf(wrapper, '用户管理')!.trigger('contextmenu')
    await flushPromises()
    await wrapper.findAll('.tags-view__menu li')[0]!.trigger('click')
    await flushPromises()

    // 缓存被丢掉 → keep-alive 会丢弃实例，中转回来就是全新的页面
    expect(tags.cachedNames).not.toContain('SystemUser')
  })

  it('右键「关闭其它」只留固定标签与目标标签', async () => {
    const { wrapper, tags } = await mountTagsView()
    tags.addView({
      path: '/system/role',
      fullPath: '/system/role',
      name: 'SystemRole',
      meta: { title: '角色管理' },
    } as never)
    await flushPromises()

    await tagOf(wrapper, '用户管理')!.trigger('contextmenu')
    await flushPromises()
    const closeOthers = wrapper.findAll('.tags-view__menu li').find((li) => li.text() === '关闭其它')
    await closeOthers!.trigger('click')
    await flushPromises()

    expect(tags.visitedViews.map((v) => v.title)).toEqual(['首页', '用户管理'])
  })

  it('右键「关闭全部」后回到固定标签', async () => {
    const { wrapper, router, tags } = await mountTagsView()
    tags.addView({
      path: '/system/role',
      fullPath: '/system/role',
      name: 'SystemRole',
      meta: { title: '角色管理' },
    } as never)
    await flushPromises()

    await tagOf(wrapper, '用户管理')!.trigger('contextmenu')
    await flushPromises()
    const closeAll = wrapper.findAll('.tags-view__menu li').find((li) => li.text() === '关闭全部')
    await closeAll!.trigger('click')
    await flushPromises()

    expect(tags.visitedViews.map((v) => v.title)).toEqual(['首页'])
    expect(router.currentRoute.value.path).toBe('/index')
  })

  it('点遮罩关掉右键菜单', async () => {
    const { wrapper } = await mountTagsView()

    await tagOf(wrapper, '用户管理')!.trigger('contextmenu')
    await flushPromises()
    expect(wrapper.find('.tags-view__menu').exists()).toBe(true)

    await wrapper.find('.tags-view__mask').trigger('click')
    await flushPromises()
    expect(wrapper.find('.tags-view__menu').exists()).toBe(false)
  })
})
