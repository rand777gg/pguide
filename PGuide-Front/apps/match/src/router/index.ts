import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

/**
 * 路由表。
 *
 * 与老工程 `router/index.js` 的对应关系与差异：
 *
 *   老工程                          新工程
 *   ------------------------------  ------------------------------------------
 *   /                HomeView       /                 HomeView
 *   /homePage        HomeView       （删除，与 / 重复且子路由写成绝对路径）
 *   /details         DetailPage     /details          DetailPage（query: detailTags）
 *   /user            UserCenter     /user             UserCenterLayout（带鉴权）
 *     ├─ ''            UserCenterIndex
 *     ├─ create/group  CreatedGroup
 *     └─ create/resume CreatedResume
 *   /group /resume   平级重复        （删除，上面已有嵌套路由）
 *   /403             error/403      /403              Forbidden
 *   （无）                           /auth/callback    鉴权中心回跳落地页
 *
 * 老工程两个路由都叫 name: 'detailPage'（重名），且 `/homePage` 的子路由
 * 用了绝对路径 `/detailPage`，实际不构成嵌套。这里全部理顺。
 *
 * 模式：老工程用 hash（默认），这里改用 history。
 * 部署时 nginx 需要配 `try_files $uri $uri/ /index.html;`。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/details',
    name: 'detail',
    component: () => import('@/views/details/DetailPage.vue'),
    meta: { title: '分类详情' },
  },
  {
    path: '/user',
    component: () => import('@/views/user/UserCenterLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'userCenter',
        component: () => import('@/views/user/UserCenterIndex.vue'),
        meta: { title: '用户中心' },
      },
      {
        path: 'create/group',
        name: 'createGroup',
        component: () => import('@/views/user/CreatedGroup.vue'),
        meta: { title: '创建队伍' },
      },
      {
        path: 'create/resume',
        name: 'createResume',
        component: () => import('@/views/user/CreatedResume.vue'),
        meta: { title: '创建简历' },
      },
    ],
  },
  {
    path: '/auth/callback',
    name: 'authCallback',
    component: () => import('@/views/auth/AuthCallbackView.vue'),
    meta: { title: '登录中' },
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/error/ForbiddenView.vue'),
    meta: { title: '需要登录' },
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
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

/**
 * 全局前置守卫。
 *
 * 老工程的守卫（main.js）有两个问题：
 *   1. `next({ path: '/403' })` 之后紧接着又无条件 `next()`，等于把重定向作废
 *   2. 判断条件依赖 `process.env.VUE_APP_IF_OPEN_AUTH === 'true'`，
 *      而 `.env.production` / `.env.test` 里压根没定义这个变量
 *
 * 新实现：用返回值式守卫（Vue Router 4 写法），逻辑只走一条路。
 */
router.beforeEach(async (to) => {
  const userStore = useUserStore()
  const guardEnabled = import.meta.env.VITE_AUTH_GUARD === 'true'

  // 从鉴权中心回跳：本地存着一次性 code，先换 token（与是否开守卫无关）
  const isCallback = to.name === 'authCallback'
  if (!userStore.isAuthenticated || isCallback) {
    await userStore.ensureSession()
  }

  if (isCallback) {
    // 换完 token 就回首页；换不到由页面自己提示
    return userStore.isAuthenticated ? { name: 'home' } : true
  }

  if (guardEnabled && to.meta.requiresAuth && !userStore.isAuthenticated) {
    return { name: 'forbidden', query: { redirect: to.fullPath } }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  const appTitle = import.meta.env.VITE_APP_TITLE || '项导组队中心'
  document.title = title ? `${title} · ${appTitle}` : appTitle
})

export default router
