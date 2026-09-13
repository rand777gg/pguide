import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'element-plus/dist/index.css'
import '@/styles/index.scss'

import App from './App.vue'
import router from './router'
import { setupPermissionDirectives } from '@/directives/permission'
import { setUnauthorizedHandler } from '@/api'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

/**
 * 管理后台入口。
 *
 * 与 apps/match、apps/auth 的差别：这个应用**不使用 @pguide/api**，
 * 因为它对接的是 PGuide-Manage（RuoYi 单体），响应体格式不一样
 * （{code, msg, data} vs {code, message, data}），
 * 详见 src/api/request.ts 的说明。
 */
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

setupPermissionDirectives(app)

/**
 * 会话失效处理：清用户态与动态路由，回到登录页。
 *
 * 必须在 pinia 安装之后注册（回调里要用 store）。
 * 做成回调注入而不是在 request.ts 里直接 import router，
 * 是为了避免 api 层与 router 互相依赖形成循环。
 */
setUnauthorizedHandler(() => {
  useUserStore().reset()
  usePermissionStore().reset()
  void router.push({ path: '/login' })
})

app.mount('#app')

document.getElementById('app-loading')?.remove()
