import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Element Plus 样式：全量引入一次。
// 组件 JS 仍然由 unplugin-vue-components 按需引入（见 vite.config.ts），
// 所以 resolvers 里关掉了 importStyle，不会重复打包样式。
import 'element-plus/dist/index.css'

import '@/styles/index.scss'

import App from './App.vue'
import router from './router'
import { setupApi } from '@/api/setup'

/**
 * 应用入口。
 *
 * 顺序有讲究：setupApi() 必须在任何组件发起请求之前完成，
 * 因为 @pguide/api 的两个 axios 实例是在首次调用时才根据配置构建的。
 */
setupApi()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// 首屏 loading 遮罩可以移除了（见 index.html）
document.getElementById('app-loading')?.remove()
