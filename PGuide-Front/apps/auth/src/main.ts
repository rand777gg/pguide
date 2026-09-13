import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'element-plus/dist/index.css'
import '@/styles/index.scss'

import App from './App.vue'
import router from './router'
import { setupApi } from '@/api/setup'

/**
 * 鉴权中心入口。
 *
 * 与 apps/match 的差别：这里是「登录发生的地方」，
 * 所以 `onUnauthorized` 不做跳转（本来就在登录页），
 * `onRedirect` 也不会被触发（不会对自己发起 307 跳转）。
 */
setupApi()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

document.getElementById('app-loading')?.remove()
