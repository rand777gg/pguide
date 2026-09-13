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
  /**
   * 组件名（见 viewName 的说明）。
   * 只有真实页面组件才有 —— Layout / ParentView / 占位页不是标签页，不需要。
   */
  name?: string
}

/**
 * 组件路径 → 组件名（PascalCase）：`system/user/index` → `SystemUser`。
 *
 * ── 为什么需要这个 ──
 *
 * TagsView 的 keep-alive 缓存是按**组件名**匹配的（`<KeepAlive :include>`），
 * 而 `<script setup>` 的 SFC 名字默认从**文件名**推断 —— 我们的页面全叫
 * `index.vue`，推断出来都叫 "Index"，于是 include 永远匹配不上：
 * keep-alive 看着写了，实际一个页面都没缓存住（这种问题不会报错，只会
 * 让人觉得「怎么切回来查询条件没了」）。
 *
 * 所以这里从组件路径生成一个稳定且唯一的名字，**同时用作路由名和组件名**，
 * 两边同源就不会对不上（Store 里的 cachedNames 用的就是这个路由名）。
 */
export function viewName(component: string): string {
  return component
    .replace(/\/index$/, '')
    .split(/[/-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
}

/**
 * 给懒加载出来的组件注入 name。
 *
 * `<script setup>` 组件的 name 来自文件名，这里覆盖掉它，
 * KeepAlive 的 include 才能按我们的名字匹配（KeepAlive 取名字时
 * 优先用 `name`，没有再退回 `__name`）。
 */
function withName(
  loader: () => Promise<{ default: object }>,
  name: string,
): () => Promise<unknown> {
  return () => loader().then((mod) => ({ ...mod.default, name }))
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
    return {
      loader: withName(loader as () => Promise<{ default: object }>, viewName(component)),
      missing: false,
      name: viewName(component),
    }
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
      const { loader, name, missing } = resolveComponent(route.component, fullPath)
      record.component = loader as RouteRecordRaw['component']
      // 真实页面用组件路径派生的名字（与组件名同源，TagsView 的缓存靠它匹配）；
      // 占位页 / Layout 这些保留后端给的名字
      if (name && !missing) {
        record.name = name
      }
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
