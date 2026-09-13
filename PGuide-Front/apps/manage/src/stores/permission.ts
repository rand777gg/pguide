import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'
import { authApi } from '@/api'
import { buildRoutes, catchAllRoute } from '@/utils/dynamic-route'

/**
 * 动态路由（菜单由后端 `sys_menu` 驱动）。
 *
 * 流程：登录成功后调 `/getRouters` 拿到菜单树 → 转成路由记录 →
 * `router.addRoute()` 注册 → 侧边栏直接遍历这份路由渲染。
 *
 * 菜单存在 store 里而不是每次重新请求，是为了：
 *   1. 刷新页面时不用重新拉（路由守卫判断 ready）
 *   2. 侧边栏与路由表共用一份数据，不会出现「菜单有但点不进去」
 */

/**
 * store 的返回类型**必须显式声明**。
 *
 * 不写的话 TS 会去推断 defineStore 的返回类型，而它内部要展开
 * `RouteRecordRaw[]`（vue-router 的递归联合类型），
 * 结果是：
 *   TS2742 推断出的类型引用了不可移植的内部路径（@vue/shared）
 *   TS7056 推断出的类型超过了编译器能序列化的长度上限
 * 显式写出来就绕开了推断。
 */
export interface PermissionStore {
  dynamicRoutes: Ref<RouteRecordRaw[]>
  allRoutes: Ref<RouteRecordRaw[]>
  ready: Ref<boolean>
  generateRoutes: () => Promise<RouteRecordRaw[]>
  setAllRoutes: (routes: RouteRecordRaw[]) => void
  reset: () => void
}

export const usePermissionStore = defineStore('permission', (): PermissionStore => {
  /** 动态路由（用于渲染侧边栏） */
  const dynamicRoutes = ref<RouteRecordRaw[]>([])
  /** 完整路由（静态 + 动态），面包屑等场景用 */
  const allRoutes = ref<RouteRecordRaw[]>([])
  /** 是否已经生成过，避免重复请求 */
  const ready = ref(false)

  async function generateRoutes(): Promise<RouteRecordRaw[]> {
    const menus = await authApi.getRouters()
    const routes = buildRoutes(menus)
    dynamicRoutes.value = routes
    ready.value = true
    return routes
  }

  function setAllRoutes(routes: RouteRecordRaw[]): void {
    allRoutes.value = [...routes, catchAllRoute]
  }

  function reset(): void {
    dynamicRoutes.value = []
    allRoutes.value = []
    ready.value = false
  }

  return { dynamicRoutes, allRoutes, ready, generateRoutes, setAllRoutes, reset }
})
