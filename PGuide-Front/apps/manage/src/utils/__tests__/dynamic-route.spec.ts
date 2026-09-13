import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  buildRoutes,
  resolveComponent,
  isExternalLink,
  viewName,
  externalRoutePath,
} from '../dynamic-route'
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
    expect(resolveComponent('Layout', '/x').missing).toBe(false)
    expect(resolveComponent('ParentView', '/x').missing).toBe(false)
    expect(resolveComponent('InnerLink', '/x').missing).toBe(false)
  })

  it('找不到的组件会走兜底（不静默白屏），并把缺失的组件路径带出来', () => {
    const result = resolveComponent('not/exist/page', '/broken')

    expect(result.missing).toBe(true)
    expect(result.missingComponent).toBe('not/exist/page')
    // 不在已知未实现名单里 → 会被当成「配置写错了」报 error（见汇总的测试）
    expect(result.knownUnimplemented).toBe(false)
  })

  it('已知未实现的菜单（如代码生成器）标记出来，不算配置错误', () => {
    const result = resolveComponent('tool/gen/index', '/tool/gen')

    expect(result.missing).toBe(true)
    expect(result.knownUnimplemented).toBe(true)
  })

  it('解析本身不打日志 —— 逐条打会把控制台刷红（汇总交给 buildRoutes）', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    resolveComponent('not/exist/page', '/broken')
    resolveComponent('tool/gen/index', '/tool/gen')

    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()

    error.mockRestore()
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
    // 'mms/project/index' 对应 apps/manage/src/views/mms/project/index.vue
    const result = resolveComponent('mms/project/index', '/pguide/project')

    expect(result.missing).toBe(false)
  })

  it('空路径的节点被跳过，不产生脏路由', () => {
    const routes = buildRoutes([{ path: '', component: undefined } as DynamicRoute])
    expect(routes).toHaveLength(0)
  })
})

/**
 * 组件缺失的日志策略。
 *
 * 背景：每次登录都会拉整棵菜单树，未实现的菜单逐条 `console.error` 会把控制台
 * 刷成一片红 —— 实际收到过「登录报错」的反馈，其实登录是成功的，
 * 那九条只是「这些菜单还没做」。
 *
 * 现在的规则：
 *   - 已知未实现（KNOWN_UNIMPLEMENTED）→ 汇总成一条 warn
 *   - 其它（多半是 sys_menu 写错了）→ 汇总成一条 error
 *   - 全都解析得到 → 一条都不打
 */
describe('组件缺失时的日志', () => {
  function menuOf(component: string, path: string): DynamicRoute {
    return {
      name: 'X',
      path,
      component,
      meta: { title: '某菜单', noCache: false, link: null },
    }
  }

  it('已知未实现的菜单只汇总成一条 warn，不报 error', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    buildRoutes([
      menuOf('tool/gen/index', '/tool/gen'),
      menuOf('monitor/job/index', '/monitor/job'),
      menuOf('monitor/online/index', '/monitor/online'),
    ])

    expect(error).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0]?.[0])
    expect(message).toContain('3 个菜单尚未实现')
    expect(message).toContain('/tool/gen')
    expect(message).toContain('/monitor/job')

    error.mockRestore()
    warn.mockRestore()
  })

  it('配错的路径汇总成一条 error，并把路由与组件路径都列出来', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    buildRoutes([menuOf('system/usre/index', '/system/usre')])

    expect(warn).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledTimes(1)
    const message = String(error.mock.calls[0]?.[0])
    expect(message).toContain('/system/usre')
    expect(message).toContain('views/system/usre/index.vue')

    error.mockRestore()
    warn.mockRestore()
  })

  it('两类混在一起时各汇总一条，不会逐条刷屏', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    buildRoutes([
      menuOf('tool/gen/index', '/tool/gen'),
      menuOf('tool/build/index', '/tool/build'),
      menuOf('nope/a/index', '/nope/a'),
      menuOf('nope/b/index', '/nope/b'),
    ])

    expect(warn).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('2 个菜单尚未实现')
    expect(String(error.mock.calls[0]?.[0])).toContain('2 个菜单指向的组件不存在')

    error.mockRestore()
    warn.mockRestore()
  })

  it('全部解析得到时一条日志都不打（正常登录控制台应该是干净的）', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    buildRoutes([REAL_DIRECTORY])

    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()

    error.mockRestore()
    warn.mockRestore()
  })

  it('缺失信息写到路由 meta 上，占位页据此显示不同文案', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const [known] = buildRoutes([menuOf('tool/gen/index', '/tool/gen')])
    const [unknown] = buildRoutes([menuOf('system/usre/index', '/system/usre')])

    expect(known!.meta?.unimplemented).toBe(true)
    expect(known!.meta?.missingComponent).toBe('tool/gen/index')
    expect(unknown!.meta?.unimplemented).toBe(false)
    expect(unknown!.meta?.missingComponent).toBe('system/usre/index')

    error.mockRestore()
    warn.mockRestore()
  })
})

/**
 * 外链菜单。
 *
 * RuoYi 基线里有一条「若依官网」（menu_id=4），它的 path 就是 `http://ruoyi.vip`。
 * vue-router 4 对**顶层**路由强制要求 path 以 `/` 开头，直接 addRoute 会抛：
 *
 *   Route paths should start with a "/": "http://ruoyi.vip" should be "/http://ruoyi.vip"
 *
 * 这个异常出在路由守卫的 generateRoutes() 里 → catch 之后清会话回登录页，
 * 现象就是「密码没错但登不进去」。所以这里除了断言转换结果，还要**真的建一个
 * router 把路由加进去** —— 这才是能复现该 bug 的断言。
 */
describe('外链菜单', () => {
  /** 与真实 /getRouters 返回一致的一条外链菜单（若依官网） */
  const EXTERNAL_MENU: DynamicRoute = {
    name: 'Http://ruoyi.vip',
    path: 'http://ruoyi.vip',
    hidden: false,
    component: 'Layout',
    meta: { title: '若依官网', icon: 'guide', noCache: false, link: 'http://ruoyi.vip' },
  }

  it('externalRoutePath 把 URL 变成站内安全路径', () => {
    expect(externalRoutePath('http://ruoyi.vip')).toBe('/external/ruoyi-vip')
    expect(externalRoutePath('https://example.com/docs?x=1')).toBe('/external/example-com-docs-x-1')
  })

  it('外链不拿真实 URL 当路由 path，真实地址放在 meta.link', () => {
    const [route] = buildRoutes([EXTERNAL_MENU])

    expect(route!.path).toBe('/external/ruoyi-vip')
    expect(route!.meta?.external).toBe(true)
    expect(route!.meta?.link).toBe('http://ruoyi.vip')
    // 后端从 URL 拼出来的 name（Http://ruoyi.vip）不该进路由表
    expect(route!.name).toBeUndefined()
  })

  it('转换出来的路由能真的加进 router —— 这条就是守住那个崩溃', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [] })

    const routes = buildRoutes([REAL_DIRECTORY, EXTERNAL_MENU])

    expect(() => routes.forEach((route) => router.addRoute(route))).not.toThrow()
    // 顺带确认真的注册上了（占位路径能匹配到）
    expect(router.resolve('/external/ruoyi-vip').matched.length).toBeGreaterThan(0)
  })

  it('path 少写 / 的脏数据也不会让登录炸掉（补成合法路径）', () => {
    const [route] = buildRoutes([
      { name: 'Bad', path: 'system/user', component: 'system/user/index' },
    ])

    expect(route!.path).toBe('/system/user')
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
    const result = resolveComponent('system/user/index', '/system/user')

    expect(result.missing).toBe(false)
    expect(result.name).toBe('SystemUser')
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
