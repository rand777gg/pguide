import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/**
 * 路由表。
 *
 * 与老 auth-ui 的差异：
 *
 *   老工程                            新工程
 *   --------------------------------  ------------------------------------
 *   /                                 /                LoginView
 *   /redirect/:code/:sendUrl          /redirect        LoginView（同组件）
 *   （声明了但没匹配上的路由）           /:pathMatch(.*)* NotFoundView
 *
 * 老工程的 `router/index.js` 声明的是**路径参数**路由 `/redirect/:code/:sendUrl`，
 * 而实际跳过来的 URL 是 `#/redirect?code=..&sendUrl=..`（查询参数形式），
 * 两者对不上，所以那条路由从来没生效过。
 *
 * 新实现不依赖路由参数：`/` 和 `/redirect` 用同一个组件，
 * 组件自己用 `parseAuthRedirectParams(location.href)` 解析 ——
 * 它对「参数在 # 之后」和「参数在 ? 之后」两种形式都支持（见该函数注释）。
 *
 * 这样还有一个好处：老格式的 URL（`#/redirect?...`）在 history 模式下
 * 会被浏览器当成路径 `/` 处理，参数留在 hash 里，依然能正确解析。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/redirect',
    name: 'redirectEntry',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  const appTitle = import.meta.env.VITE_APP_TITLE || '项导鉴权中心'
  document.title = title ? `${title} · ${appTitle}` : appTitle
})

export default router
