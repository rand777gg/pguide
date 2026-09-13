import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus/es'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { catchAllRoute } from '@/utils/dynamic-route'

/**
 * 路由表。
 *
 * RuoYi 是**菜单驱动路由**：业务菜单全部来自后端 `sys_menu`，
 * `/getRouters` 返回后才 `addRoute` 注册。这里只放不依赖权限的静态路由。
 *
 * 老 ruoyi-ui 用的是 `mode: 'history'` + `NProgress` 进度条。
 * 新工程保持 history（部署时 nginx 需要 try_files 回退），
 * 进度条改用路由守卫里的一个轻量指示器，省掉一个依赖。
 */

/** 不需要登录就能访问的路径 */
const WHITE_LIST = ['/login', '/404', '/401']

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', hidden: true },
  },
  {
    path: '/401',
    name: 'Unauthorized',
    component: () => import('@/views/error/401.vue'),
    meta: { title: '无权限', hidden: true },
  },
  {
    // 老 ruoyi-ui 用它做菜单刷新：跳到 /redirect/xxx 再跳回来
    path: '/redirect',
    component: () => import('@/layout/index.vue'),
    meta: { hidden: true },
    children: [
      {
        path: '/redirect/:path(.*)',
        component: () => import('@/views/redirect/index.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/index',
    children: [
      {
        path: 'index',
        name: 'Index',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页', icon: 'HomeFilled', affix: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 }),
})

/**
 * 全局前置守卫。
 *
 * 顺序很重要：
 *   无 token → 白名单放行 / 否则跳登录
 *   有 token 且在登录页 → 回首页
 *   已有菜单 → 直接放行
 *   首次进入 → 拉用户信息 + 生成动态路由 → **重新导航一次**
 *
 * 最后的 `return { ...to, replace: true }` 不能省：
 * 动态路由是在本次导航**开始之后**才注册的，不重新匹配一次的话
 * 目标路由仍然不存在，会落到 404。
 */
router.beforeEach(async (to) => {
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()

  if (!userStore.token) {
    if (WHITE_LIST.includes(to.path)) return true
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.path === '/login') {
    return { path: '/' }
  }

  if (permissionStore.ready) return true

  try {
    await userStore.fetchInfo()
    const routes = await permissionStore.generateRoutes()

    for (const route of routes) {
      router.addRoute(route)
    }
    router.addRoute(catchAllRoute)
    permissionStore.setAllRoutes([...constantRoutes, ...routes])

    return { ...to, replace: true }
  } catch (error) {
    /**
     * 拿不到用户信息（token 过期 / 后端不可用）→ 清会话回登录页。
     *
     * ⚠️ 一定要把失败**说出来**：这里清了会话之后用户会看到「又回到登录页」，
     * 很像「密码错了」，但实际是菜单/路由生成出的问题（真实踩过：
     * 一条外链菜单的 path 是 http://ruoyi.vip，vue-router 直接抛异常，
     * 现象就是「密码没错但登不进去」，控制台只有一行日志）。
     */
    userStore.reset()
    permissionStore.reset()
    console.error('[manage] 生成动态路由失败', error)
    ElMessage.error(
      `菜单加载失败：${error instanceof Error ? error.message : String(error)}。` +
        `请检查 sys_menu 表里的菜单配置。`,
    )
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

router.afterEach((to) => {
  const title = to.meta?.title as string | undefined
  const appTitle = import.meta.env.VITE_APP_TITLE || '项导后台管理系统'
  document.title = title ? `${title} - ${appTitle}` : appTitle
})

export default router
