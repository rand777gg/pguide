import type { RouteRecordRaw } from 'vue-router'
import type { DynamicRoute } from '@/api'

/**
 * 把后端 `/getRouters` 返回的菜单树转换成 vue-router 的路由表。
 *
 * RuoYi 的设计是**菜单驱动路由**：`sys_menu` 表里的每一行决定一个菜单项，
 * `component` 字段写的是前端组件路径（如 `system/user/index`）。
 * 前端要把这个字符串解析成真实组件。
 *
 * 老 ruoyi-ui 的做法（`store/modules/permission.js`）是用 Vite 的
 * `import.meta.glob` 把 views 目录下所有 .vue 收集成一张表，再用组件路径去查表。
 * 找不到时返回 undefined，页面就白屏，也没有任何提示 —— 这是实际踩过的坑：
 * 数据库里有一条菜单指向不存在的组件，整条路由静默失效。
 *
 * 这里改成两级兜底：
 *   1. 精确匹配 views 下与组件路径同名的文件
 *   2. 匹配不到就用占位页，并在页面上写明「菜单指向的组件不存在」
 * 这样问题会**显示出来**而不是静默白屏。
 */

// Vite 的 glob 必须是字面量，不能拼字符串
const viewModules = import.meta.glob('../views/**/*.vue')

/** 未实现菜单的兜底页 */
const PLACEHOLDER_VIEW = () => import('../views/placeholder/index.vue')

/** `/getRouters` 用过这些特殊 component，它们不是真实文件 */
const LAYOUT_COMPONENT = 'Layout'
const PARENT_VIEW_COMPONENT = 'ParentView'
const INNER_LINK_COMPONENT = 'InnerLink'

const Layout = () => import('../layout/index.vue')
const ParentView = () => import('../layout/components/ParentView.vue')
const InnerLink = () => import('../layout/components/InnerLink.vue')

export interface ResolveResult {
  loader: () => Promise<unknown>
  /** 是否用了兜底（说明 sys_menu 里的 component 路径有问题） */
  missing: boolean
}

/** 把 `system/user/index` 解析成组件加载函数 */
export function resolveComponent(component: string | undefined, routePath: string): ResolveResult {
  if (!component) {
    return { loader: PLACEHOLDER_VIEW, missing: false }
  }

  if (component === LAYOUT_COMPONENT) return { loader: Layout, missing: false }
  if (component === PARENT_VIEW_COMPONENT) return { loader: ParentView, missing: false }
  if (component === INNER_LINK_COMPONENT) return { loader: InnerLink, missing: false }

  const key = `../views/${component}.vue`
  const loader = viewModules[key]
  if (loader) {
    return { loader: loader as () => Promise<unknown>, missing: false }
  }

  // 找不到就兜底，但要留下痕迹
  console.error(
    `[manage] 菜单 ${routePath} 指向的组件不存在：views/${component}.vue。` +
      `已回退到占位页。请检查 sys_menu 表里的 component 字段。`,
  )
  return { loader: PLACEHOLDER_VIEW, missing: true }
}

/** 是否外链 */
export function isExternalLink(path: string): boolean {
  return /^https?:\/\//.test(path)
}

/**
 * 把菜单树转成路由记录。
 *
 * 注意几处 RuoYi 特有的约定：
 *   - 顶级路由的 path 要加 `/`
 *   - 单子节点目录会被「提级」（alwaysShow 为 false 时直接用子节点）
 *   - 目录类型（menuType=M）用 Layout 或 ParentView 承载
 */
export function buildRoutes(routes: DynamicRoute[], basePath = ''): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = []

  for (const route of routes) {
    if (!route.path && !route.component) continue

    const fullPath = isExternalLink(route.path)
      ? route.path
      : joinPath(basePath, route.path)

    const record: RouteRecordRaw = {
      path: fullPath,
      name: route.name,
      meta: {
        title: route.meta?.title ?? '',
        icon: route.meta?.icon,
        noCache: route.meta?.noCache ?? false,
        hidden: route.hidden ?? false,
      },
      children: route.children ? buildRoutes(route.children, fullPath) : undefined,
    } as RouteRecordRaw

    if (route.component) {
      const { loader } = resolveComponent(route.component, fullPath)
      record.component = loader as RouteRecordRaw['component']
    } else if (route.children?.length) {
      // 没有 component 但有子节点：用 Layout / ParentView 承载
      record.component = basePath ? ParentView : Layout
    }

    /**
     * `redirect: 'noRedirect'` 是 RuoYi 的**哨兵值**，意思是「不要自动重定向」。
     * 直接把它赋给 vue-router 的 redirect，路由会去找一个叫 `noRedirect`
     * 的路径，点菜单直接白屏。
     *
     * 实测 `/getRouters` 对每个顶层目录都会返回这个值（见接口返回的
     * `"redirect": "noRedirect"`），所以这里必须过滤掉。
     */
    if (route.redirect && route.redirect !== 'noRedirect') {
      record.redirect = route.redirect
    }

    result.push(record)
  }

  return result
}

function joinPath(base: string, path: string): string {
  if (!path) return base
  if (path.startsWith('/')) return path
  return `${base}/${path}`.replace(/\/+/g, '/')
}

/** 运行时兜底路由，必须在动态路由之后注册 */
export const catchAllRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'NotFoundCatchAll',
  component: () => import('../views/error/404.vue'),
  meta: { title: '页面不存在', hidden: true },
}
