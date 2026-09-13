import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

/**
 * 多标签页（TagsView）的状态。
 *
 * 对应老 ruoyi-ui 的 `store/modules/tagsView.js`，两份数据：
 *
 *   visitedViews  标签页列表（界面上那一排）
 *   cachedNames   keep-alive 的 include 名单
 *
 * 两者**不是一回事**：标签页是界面状态，缓存名单决定页面实例是否保留。
 * 关掉标签时要顺手把缓存也丢掉，否则那个页面的状态会一直留在内存里，
 * 下次打开还是旧的 —— 这正是「标签页 + keep-alive」这套东西的用意。
 *
 * 缓存名单里存的是**路由名**，而路由名与组件名同源
 * （见 utils/dynamic-route.ts 的 viewName），这样 KeepAlive 的 include 才匹配得上。
 */

export interface TagView {
  /** 路由路径，作为标签的唯一标识 */
  path: string
  /** 带查询参数的真实路径（点标签要回到原来的筛选条件） */
  fullPath: string
  /** 路由名（= keep-alive 的缓存键） */
  name: string
  title: string
  /** 固定标签（首页），不能关闭 */
  affix: boolean
}

export interface TagsStore {
  visitedViews: Ref<TagView[]>
  cachedNames: Ref<string[]>
  addView: (route: RouteLocationNormalizedLoaded) => void
  /** 关闭一个标签，返回剩下的标签（调用方据此决定跳哪里） */
  removeView: (tag: TagView) => TagView[]
  removeOthers: (tag: TagView) => void
  removeAll: () => void
  /** 只丢缓存不关标签（「刷新」用：页面会重新挂载） */
  dropCache: (name: string) => void
  /**
   * 强制丢缓存，即使标签还在。
   *
   * KeepAlive 会监听 include 的变化并清掉不再匹配的缓存实例，
   * 所以「刷新」就是：先 invalidate（缓存实例被丢弃）→
   * 走一次 /redirect 中转 → 页面以全新状态重新挂载。
   */
  invalidate: (name: string) => void
  reset: () => void
}

/**
 * 常驻的固定标签。
 *
 * 与 `router/index.ts` 里 `meta.affix: true` 的那条静态路由对应
 * （路径 `/index`，标题「首页」）。这里写死而不是去遍历 constantRoutes，
 * 是为了避免 store 反向依赖 router 模块 —— 那条路由改名时这里也要改，
 * 有 `stores/__tests__/tags.spec.ts` 里的断言盯着。
 */
const AFFIX_TAGS: TagView[] = [
  { path: '/index', fullPath: '/index', name: 'Index', title: '首页', affix: true },
]

export const useTagsStore = defineStore('tags', (): TagsStore => {
  const visitedViews = ref<TagView[]>(AFFIX_TAGS.map((tag) => ({ ...tag })))
  const cachedNames = ref<string[]>([])

  /** 把路由加进标签栏；已在栏里的只更新 fullPath */
  function addView(route: RouteLocationNormalizedLoaded): void {
    // 没有 name 的（如 /redirect 中转页）和标了 hidden 的不进标签栏
    if (!route.name || route.meta?.hidden) return

    const name = String(route.name)
    const tag: TagView = {
      path: route.path,
      fullPath: route.fullPath,
      name,
      title: (route.meta?.title as string) || '未命名页面',
      affix: Boolean(route.meta?.affix),
    }

    const existing = visitedViews.value.find((view) => view.path === tag.path)
    if (existing) {
      // 同一页面换了查询条件（比如从用户列表跳到第 3 页）要更新，
      // 否则点标签会回到上一次的参数
      existing.fullPath = tag.fullPath
      existing.title = tag.title
    } else {
      visitedViews.value.push(tag)
    }

    // meta.noCache 的页面永远不进缓存名单
    if (!route.meta?.noCache && !cachedNames.value.includes(name)) {
      cachedNames.value.push(name)
    }
  }

  function dropCache(name: string): void {
    // 还有别的标签用同一个组件名时不能丢（菜单可以指向同一个组件）
    if (visitedViews.value.some((view) => view.name === name)) return
    cachedNames.value = cachedNames.value.filter((item) => item !== name)
  }

  function invalidate(name: string): void {
    cachedNames.value = cachedNames.value.filter((item) => item !== name)
  }

  function removeView(tag: TagView): TagView[] {
    // 固定标签不允许关闭（界面上也不渲染关闭按钮）
    if (tag.affix) return visitedViews.value

    visitedViews.value = visitedViews.value.filter((view) => view.path !== tag.path)
    dropCache(tag.name)
    return visitedViews.value
  }

  function removeOthers(tag: TagView): void {
    visitedViews.value = visitedViews.value.filter(
      (view) => view.affix || view.path === tag.path,
    )
    cachedNames.value = cachedNames.value.filter((name) =>
      visitedViews.value.some((view) => view.name === name),
    )
  }

  function removeAll(): void {
    visitedViews.value = visitedViews.value.filter((view) => view.affix)
    cachedNames.value = cachedNames.value.filter((name) =>
      visitedViews.value.some((view) => view.name === name),
    )
  }

  function reset(): void {
    visitedViews.value = AFFIX_TAGS.map((tag) => ({ ...tag }))
    cachedNames.value = []
  }

  return {
    visitedViews,
    cachedNames,
    addView,
    removeView,
    removeOthers,
    removeAll,
    dropCache,
    invalidate,
    reset,
  }
})
