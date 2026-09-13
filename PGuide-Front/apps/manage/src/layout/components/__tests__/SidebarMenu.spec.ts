import type * as ElementPlus from 'element-plus/es'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'

/**
 * 侧边栏菜单的渲染测试。
 *
 * 菜单是**后端驱动**的（`sys_menu` → `/getRouters` → 动态路由），
 * 侧边栏直接遍历动态路由渲染 —— 这样菜单和可跳转路由永远一致。
 *
 * 这里验证的是「路由树 → 菜单」这段转换，包括 RuoYi 的三个特殊行为：
 *   1. 只有一个子节点的目录会被「提级」，直接渲染成菜单项
 *   2. alwaysShow 为 true 时不提级，保留分组
 *   3. hidden 的路由不进菜单
 */

vi.mock('element-plus/es', async (importOriginal) => {
  const actual = await importOriginal<typeof ElementPlus>()
  const noop = () => undefined
  return { ...actual, ElMessage: { success: noop, error: noop, warning: noop } }
})

const SidebarMenu = (await import('../SidebarMenu.vue')).default

/** 造一个只用于测试的路由记录 */
function route(
  path: string,
  title: string,
  children?: RouteRecordRaw[],
  meta: Record<string, unknown> = {},
): RouteRecordRaw {
  return {
    path,
    component: { template: '<div />' },
    meta: { title, ...meta },
    children,
  } as RouteRecordRaw
}

async function mountSidebar(routes: RouteRecordRaw[], collapsed = false) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const permissionStore = usePermissionStore()
  permissionStore.dynamicRoutes = routes

  // 路由表里放一条根路由：侧边栏里的「首页」来自组件内部的 constantRoutes，
  // 但 el-menu 的 router 模式会在匹配不到当前路径时打 warning，塞一条根路由消掉噪音
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(SidebarMenu, {
    props: { collapsed },
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return wrapper
}

describe('SidebarMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染品牌名', async () => {
    const wrapper = await mountSidebar([])
    expect(wrapper.find('.sidebar__logo').text()).toBe('项导后台')
  })

  it('收起时只显示一个字的标识', async () => {
    const wrapper = await mountSidebar([], true)
    expect(wrapper.find('.sidebar__logo').text()).toBe('项')
  })

  it('把动态路由渲染成菜单项', async () => {
    const wrapper = await mountSidebar([
      route('/pguide', '项导业务', [
        route('/pguide/project', '项目管理', undefined, { icon: 'project' }),
        route('/pguide/student', '学生信息'),
      ]),
    ])

    const text = wrapper.text()
    expect(text).toContain('项导业务')
    expect(text).toContain('项目管理')
    expect(text).toContain('学生信息')
  })

  it('单子节点目录会被「提级」：直接显示子节点标题，不显示父级', async () => {
    // 这是 RuoYi 的经典行为：目录下只有一个菜单时，不显示一层多余的折叠
    const wrapper = await mountSidebar([
      route('/system', '系统管理', [
        route('/system/user', '用户管理', undefined, { icon: 'user' }),
      ]),
    ])

    // 注意：侧边栏里还有一条来自静态路由的「首页」，所以按标题断言而不是按下标
    const itemTexts = wrapper.findAll('.el-menu-item').map((i) => i.text())
    expect(itemTexts).toContain('用户管理')
    expect(itemTexts).not.toContain('系统管理')
  })

  it('alwaysShow 为 true 时不提级，保留分组', async () => {
    const wrapper = await mountSidebar([
      route('/system', '系统管理', [route('/system/user', '用户管理')], { alwaysShow: true }),
    ])

    // 只有一个子节点但因为 alwaysShow，父级渲染成 sub-menu
    expect(wrapper.find('.el-sub-menu').exists()).toBe(true)
  })

  it('多个子节点时渲染成分组', async () => {
    const wrapper = await mountSidebar([
      route('/system', '系统管理', [
        route('/system/user', '用户管理'),
        route('/system/role', '角色管理'),
      ]),
    ])

    expect(wrapper.find('.el-sub-menu').exists()).toBe(true)

    const itemTexts = wrapper.findAll('.el-menu-item').map((i) => i.text())
    expect(itemTexts).toEqual(expect.arrayContaining(['用户管理', '角色管理']))
  })

  it('hidden 的子路由不进菜单', async () => {
    const wrapper = await mountSidebar([
      route('/system', '系统管理', [
        route('/system/user', '用户管理'),
        route('/system/secret', '内部页面', undefined, { hidden: true }),
      ]),
    ])

    const text = wrapper.text()
    expect(text).toContain('用户管理')
    expect(text).not.toContain('内部页面')
  })

  it('菜单项的 index 是可跳转的完整路径', async () => {
    const wrapper = await mountSidebar([
      route('/pguide', '项导业务', [route('/pguide/project', '项目管理')]),
    ])

    // el-menu-item 不会把 index 渲染成 DOM 属性，所以从组件 props 上取
    const items = wrapper.findAllComponents({ name: 'ElMenuItem' })
    const target = items.find((i) => i.text().includes('项目管理'))

    expect(target).toBeDefined()
    expect(target!.props('index')).toBe('/pguide/project')
  })

  it('渲染出首页（来自静态路由）', async () => {
    const wrapper = await mountSidebar([])
    // constantRoutes 里 path 为 '/' 的那条会一并显示
    expect(wrapper.text()).toContain('首页')
  })
})
