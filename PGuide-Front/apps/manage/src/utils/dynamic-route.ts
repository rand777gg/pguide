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
  /** 找不到的组件路径（仅 missing 为 true 时有值），供调用方汇总报告 */
  missingComponent?: string
  /** 缺失，但属于「计划中还没实现」的菜单（见 KNOWN_UNIMPLEMENTED） */
  knownUnimplemented?: boolean
}

/**
 * **已知未实现**的菜单组件路径。
 *
 * 这些是 RuoYi 基线的菜单（`20-ruoyi-vue-3.8.6-baseline.sql`），
 * 新前端**故意**没做：要么依赖 RuoYi 特有能力（Druid 面板 iframe、
 * 代码生成器、定时任务调度），要么是运维向、价值密度低。
 * 点进去会落到占位页，这是预期行为，不是配置错误。
 *
 * 为什么要显式列出来：前台每次登录都会拉整棵菜单树，这些菜单会**每一条**
 * 触发一次「组件不存在」的日志。原来九条都是 `console.error`，
 * 和真正的配置错误混在一起，控制台一片红 —— 看起来像登录失败了，
 * 实际登录是成功的（这也是实际收到的反馈）。
 *
 * 现在规则是：
 *   - 在名单里 → 汇总成**一条** `console.warn`（预期内的占位）
 *   - 不在名单里 → 汇总成**一条** `console.error`（多半是 sys_menu 写错了）
 *
 * 实现某个页面后，把它从这里删掉（README 的「未实现」清单也要同步）。
 */
export const KNOWN_UNIMPLEMENTED: readonly string[] = [
  // 系统监控
  'monitor/online/index',
  'monitor/job/index',
  'monitor/druid/index',
  'monitor/server/index',
  'monitor/cache/index',
  'monitor/cache/list',
  // 系统工具
  'tool/build/index',
  'tool/gen/index',
  'tool/swagger/index',
]

export function isKnownUnimplemented(component: string): boolean {
  return KNOWN_UNIMPLEMENTED.includes(component)
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

  // 找不到就兜底。**不在这里打日志** —— 每次登录整棵菜单树都会走一遍，
  // 逐条打会把控制台刷红（见 KNOWN_UNIMPLEMENTED 的说明）。
  // 汇总报告交给 buildRoutes，一次导航只留一条。
  void routePath
  return {
    loader: PLACEHOLDER_VIEW,
    missing: true,
    missingComponent: component,
    knownUnimplemented: isKnownUnimplemented(component),
  }
}

/** 是否外链 */
export function isExternalLink(path: string): boolean {
  return /^https?:\/\//.test(path)
}

/** 一个「组件找不到」的记录，用于最后汇总成一条日志 */
interface MissingRef {
  routePath: string
  component: string
  known: boolean
}

/**
 * 把菜单树转成路由记录。
 *
 * 注意几处 RuoYi 特有的约定：
 *   - 顶级路由的 path 要加 `/`
 *   - 单子节点目录会被「提级」（alwaysShow 为 false 时直接用子节点）
 *   - 目录类型（menuType=M）用 Layout 或 ParentView 承载
 *
 * 组件找不到的菜单会**汇总成一条**日志（见 reportMissing），
 * 而不是每一条各打一条 —— 每次登录都会拉整棵菜单树，逐条打会把控制台刷红。
 */
export function buildRoutes(routes: DynamicRoute[], basePath = ''): RouteRecordRaw[] {
  const missing: MissingRef[] = []
  const records = buildRouteRecords(routes, basePath, missing)

  // 只在外层汇总报告一次（递归里不打）
  if (!basePath) reportMissing(missing)

  return records
}

function buildRouteRecords(
  routes: DynamicRoute[],
  basePath: string,
  missing: MissingRef[],
): RouteRecordRaw[] {
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
      children: route.children
        ? buildRouteRecords(route.children, fullPath, missing)
        : undefined,
    } as RouteRecordRaw

    if (route.component) {
      const resolved = resolveComponent(route.component, fullPath)
      record.component = resolved.loader as RouteRecordRaw['component']
      // 真实页面用组件路径派生的名字（与组件名同源，TagsView 的缓存靠它匹配）；
      // 占位页 / Layout 这些保留后端给的名字
      if (resolved.name && !resolved.missing) {
        record.name = resolved.name
      }
      if (resolved.missing && resolved.missingComponent) {
        missing.push({
          routePath: fullPath,
          component: resolved.missingComponent,
          known: Boolean(resolved.knownUnimplemented),
        })
        // 把「缺哪个组件、是不是计划内」带到路由 meta 上，占位页据此显示不同文案
        record.meta = {
          ...record.meta,
          missingComponent: resolved.missingComponent,
          unimplemented: Boolean(resolved.knownUnimplemented),
        }
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

/**
 * 汇总报告组件缺失。
 *
 * 分两档，因为这两种情况的**处理方式完全不同**：
 *
 *   - 已知未实现（KNOWN_UNIMPLEMENTED）：预期内的占位页 → `console.warn`，
 *     一句话说清「几个菜单没做，要实现就建组件」
 *   - 其它：多半是 `sys_menu.component` 写错了（比如路径拼错、菜单是别处
 *     拷过来的），没有兜底就会静默白屏 → `console.error`，把路由和组件路径
 *     都列出来，方便直接去菜单管理里改
 *
 * 两种都没有时**不打任何日志** —— 正常登录控制台应该是干净的。
 */
function reportMissing(missing: MissingRef[]): void {
  if (missing.length === 0) return

  const known = missing.filter((item) => item.known)
  const unknown = missing.filter((item) => !item.known)

  if (known.length > 0) {
    console.warn(
      `[manage] ${known.length} 个菜单尚未实现（点进去是占位页，属预期）：` +
        known.map((item) => item.routePath).join('、') +
        '。要实现就在 src/views 下建对应组件，详见 apps/manage/README.md。',
    )
  }

  if (unknown.length > 0) {
    console.error(
      `[manage] ${unknown.length} 个菜单指向的组件不存在，多半是 sys_menu.component 配错了：` +
        unknown.map((item) => `${item.routePath} → views/${item.component}.vue`).join('、'),
    )
  }
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
