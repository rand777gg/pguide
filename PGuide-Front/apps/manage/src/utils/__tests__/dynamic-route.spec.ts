import { describe, expect, it, vi } from 'vitest'
import { buildRoutes, resolveComponent, isExternalLink, viewName } from '../dynamic-route'
import type { DynamicRoute } from '@/api'

/**
 * 动态路由转换的测试。
 *
 * 这是管理端的核心逻辑：后端 `/getRouters` 返回菜单树 → 转成 vue-router 路由。
 * 转换错了的表现是「菜单点不动 / 白屏」，而这类问题很难从报错里定位，
 * 所以值得用测试把已知的坑固定下来。
 *
 * 下面的测试数据是从真实接口返回里截取的（`/getRouters` 的 /pguide 子树）。
 */

/** 真实接口返回的顶层目录 */
const REAL_DIRECTORY: DynamicRoute = {
  name: 'Pguide',
  path: '/pguide',
  hidden: false,
  redirect: 'noRedirect',
  component: 'Layout',
  alwaysShow: true,
  meta: { title: '项导业务', icon: 'mms', noCache: false, link: null },
  children: [
    {
      name: 'Project',
      path: 'project',
      hidden: false,
      component: 'mms/project/index',
      meta: { title: '项目管理', icon: 'project', noCache: false, link: null },
    },
    {
      name: 'Student',
      path: 'student',
      hidden: false,
      component: 'usercenter/student/index',
      meta: { title: '学生信息', icon: 'student', noCache: false, link: null },
    },
  ],
}

describe('isExternalLink', () => {
  it('识别 http/https 外链', () => {
    expect(isExternalLink('http://ruoyi.vip')).toBe(true)
    expect(isExternalLink('https://example.com')).toBe(true)
    expect(isExternalLink('/system')).toBe(false)
    expect(isExternalLink('system')).toBe(false)
  })
})

describe('resolveComponent', () => {
  it('RuoYi 的特殊 component 值映射到布局组件，不算缺失', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(resolveComponent('Layout', '/x').missing).toBe(false)
    expect(resolveComponent('ParentView', '/x').missing).toBe(false)
    expect(resolveComponent('InnerLink', '/x').missing).toBe(false)
    warn.mockRestore()
  })

  it('找不到的组件会走兜底并打日志 —— 不静默白屏', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = resolveComponent('not/exist/page', '/broken')

    expect(result.missing).toBe(true)
    // 关键：老 ruoyi-ui 这里是静默返回 undefined，页面白屏且没有线索
    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls[0]?.[0])).toContain('not/exist/page')

    warn.mockRestore()
  })
})

describe('buildRoutes', () => {
  it('把菜单树转成路由，子路径拼成绝对路径', () => {
    const routes = buildRoutes([REAL_DIRECTORY])

    expect(routes).toHaveLength(1)
    expect(routes[0]!.path).toBe('/pguide')
    expect(routes[0]!.children?.[0]!.path).toBe('/pguide/project')
    expect(routes[0]!.children?.[1]!.path).toBe('/pguide/student')
  })

  it('title / icon / hidden 从 meta 搬到路由 meta', () => {
    const routes = buildRoutes([REAL_DIRECTORY])
    expect(routes[0]!.meta?.title).toBe('项导业务')
    expect(routes[0]!.meta?.icon).toBe('mms')
    expect(routes[0]!.meta?.hidden).toBe(false)
  })

  /**
   * 这一条守住一个真实踩到的坑：RuoYi 对顶层目录返回
   * `redirect: 'noRedirect'`（哨兵值，意思是"别自动跳"）。
   * 不过滤的话 vue-router 会去找名为 noRedirect 的路由，点菜单白屏。
   * 实测 `/getRouters` 每个顶层目录都带这个值。
   */
  it('过滤掉 RuoYi 的 noRedirect 哨兵值', () => {
    const routes = buildRoutes([REAL_DIRECTORY])
    expect(routes[0]!.redirect).toBeUndefined()
  })

  it('真实的 redirect 值要保留', () => {
    const routes = buildRoutes([
      { path: '/parent', component: 'Layout', redirect: '/parent/child', children: [] },
    ])
    expect(routes[0]!.redirect).toBe('/parent/child')
  })

  it('子菜单的 component 能解析到真实组件文件（说明 glob 路径对得上）', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})

    // 'mms/project/index' 对应 apps/manage/src/views/mms/project/index.vue
    const result = resolveComponent('mms/project/index', '/pguide/project')

    expect(result.missing).toBe(false)
    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })

  it('空路径的节点被跳过，不产生脏路由', () => {
    const routes = buildRoutes([{ path: '', component: undefined } as DynamicRoute])
    expect(routes).toHaveLength(0)
  })
})

/**
 * 组件名（TagsView 的 keep-alive 缓存靠它匹配）。
 *
 * 这里值得单独测：`<script setup>` 的组件名默认从**文件名**推断，
 * 而我们的页面全叫 index.vue —— 不显式改名字的话 keep-alive 一个都缓存不住，
 * 而且不会报任何错（只会表现为「切回来查询条件没了」）。
 */
describe('viewName 与组件命名', () => {
  it('组件路径转成 PascalCase 组件名', () => {
    expect(viewName('system/user/index')).toBe('SystemUser')
    expect(viewName('mms/project/index')).toBe('MmsProject')
    expect(viewName('monitor/logininfor/index')).toBe('MonitorLogininfor')
    expect(viewName('usercenter/student/index')).toBe('UsercenterStudent')
  })

  it('连字符目录也按段大写', () => {
    expect(viewName('user-center/info/index')).toBe('UserCenterInfo')
  })

  it('真实页面在解析时就带上组件名', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = resolveComponent('system/user/index', '/system/user')

    expect(result.missing).toBe(false)
    expect(result.name).toBe('SystemUser')
    warn.mockRestore()
  })

  it('懒加载出来的组件被注入了 name（否则 keep-alive 匹配不上）', async () => {
    // 用一个很轻的页面：加载真实业务页面会把 CrudPage 整条依赖链带进来，测试会超时
    const result = resolveComponent('error/404', '/404')
    const component = (await result.loader()) as { name?: string; setup?: unknown }

    expect(component.name).toBe('Error404')
    // 确认拿到的是组件对象本身（注入名字不能把组件弄丢）
    expect(typeof component.setup).toBe('function')
  })

  it('Layout / 占位页不需要组件名（它们不是标签页）', () => {
    expect(resolveComponent('Layout', '/x').name).toBeUndefined()
    expect(resolveComponent(undefined, '/x').name).toBeUndefined()
  })

  it('路由名用组件名，与缓存名单同源', () => {
    const routes = buildRoutes([REAL_DIRECTORY])

    expect(routes[0]!.children?.[0]!.name).toBe('MmsProject')
    expect(routes[0]!.children?.[1]!.name).toBe('UsercenterStudent')
    // 目录节点（Layout）保留后端给的名字
    expect(routes[0]!.name).toBe('Pguide')
  })
})
