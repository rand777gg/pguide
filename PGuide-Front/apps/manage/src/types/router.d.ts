import 'vue-router'

/**
 * 扩展 vue-router 的路由元信息类型。
 *
 * RuoYi 的菜单树除了标准的 title/icon，还会带几个自己的字段
 * （`alwaysShow` 强制展开、`hidden` 隐藏、`noCache` 不缓存、`affix` 固定标签页、
 * `link` 外链地址）。不声明的话，`route.meta.xxx` 和 `route.alwaysShow`
 * 在类型检查里都是错的。
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 菜单/页面标题 */
    title?: string
    /** RuoYi 的图标名（不是 Element Plus 图标名，需要经 menu-icon 映射） */
    icon?: string
    /** 不在侧边栏显示 */
    hidden?: boolean
    /** 只有一个子路由时也渲染成分组，不「提级」 */
    alwaysShow?: boolean
    /** 不使用 keep-alive 缓存 */
    noCache?: boolean
    /** 固定在标签页上（暂未实现标签页，先保留字段） */
    affix?: boolean
    /** 外链地址（InnerLink 用） */
    link?: string | null
  }
}
