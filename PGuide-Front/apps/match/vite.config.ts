import { fileURLToPath, URL } from 'node:url'

// loadEnv 来自 vite（vitest/config 不导出它，第一版就栽在这）
import { loadEnv } from 'vite'
// defineConfig 从 vitest/config 引入：它是 vite 的超集，
// 这样同一个文件既能描述构建配置，也能描述测试配置，不必再开一个 vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      vueDevTools(),

      // Element Plus 按需引入：只打包用到的组件 JS。
      // 样式统一在 main.ts 里 import 'element-plus/dist/index.css' 全量引入，
      // 所以这里 resolvers 都关掉 importStyle，避免 CSS 被重复打进产物。
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia'],
        resolvers: [ElementPlusResolver({ importStyle: false })],
        dts: 'src/types/auto-imports.d.ts',
        eslintrc: { enabled: false },
      }),
      Components({
        resolvers: [ElementPlusResolver({ importStyle: false })],
        dts: 'src/types/components.d.ts',
        dirs: ['src/components'],
      }),
    ],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      // 老工程的 dev 脚本是 `--port 4000`，保持一致，避免改前端又要改后端 CORS 白名单
      port: 4000,
      host: true,
      strictPort: true,
      /**
       * 代理而不是直连绝对地址。
       *
       * 老工程 `.env.development` 里写的是 `VUE_APP_BASE_API=http://localhost:666/api`，
       * 属于跨域请求，只能靠网关的 CORS 配置兜着。
       * 这里改成代理：浏览器请求同源的 /api，由 dev server 转发到网关，
       * 从根上没有跨域问题（生产环境由 nginx 做同样的转发）。
       *
       * 网关自身路由就是 /api/auth/**、/api/mms/** 这种前缀，所以不需要 rewrite。
       */
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:666',
          changeOrigin: true,
        },
      },
    },

    preview: {
      port: 4000,
      strictPort: true,
    },

    build: {
      // 生产不产出 sourcemap，减小产物体积（与老工程 productionSourceMap: false 一致）
      sourcemap: false,
      chunkSizeWarningLimit: 1024,
      rollupOptions: {
        /**
         * 关于 element-plus 产物体积的实测结论（避免后人重复踩）
         *
         * `manualChunks` 只能用下面的**函数写法**。曾经写成对象写法
         * `{ 'element-plus': ['element-plus', '@element-plus/icons-vue'] }`，
         * 那种写法会把列出的包连同整棵依赖树强制打进 chunk。
         *
         * 另外验证过一次「element-plus 是不是没按需引入」：
         *   - element-plus/es 完整包           10365 KB
         *   - @element-plus/icons-vue 完整包    3218 KB
         *   - 本产物 element-plus chunk          915 KB（gzip 294 KB）
         * 915KB 只占完整 es 的 9%，说明按需引入**是生效的**，
         * 这个数字就是用到的组件 + 它们的共享依赖（el-form 的 async-validator、
         * el-select 的 popper / virtual-list 等）的真实成本。
         *
         * 试过加 `treeshake.moduleSideEffects` 把 element-plus/es 标成无副作用，
         * 体积没有任何变化（915.36KB 一模一样），所以没有保留这个配置 ——
         * 无效的配置比没有配置更糟糕。
         *
         * 真要压体积，方向是减少组件使用（比如用原生 select 换掉 el-select），
         * 而不是调 treeshake。
         */
        output: {
          /**
           * 拆包。注意这里**必须**用函数写法。
           *
           * 对象写法（manualChunks: { 'element-plus': [...] }）会把列出的包
           * **连同它整棵依赖树强制打进 chunk**，连没用到的东西也一起进去。
           * 函数写法只对「已经在模块图里的模块」做归组，不会引入新模块。
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined

            if (id.includes('element-plus') || id.includes('@element-plus')) {
              return 'element-plus'
            }
            if (
              id.includes('/vue/') ||
              id.includes('vue-router') ||
              id.includes('pinia') ||
              id.includes('@vue/')
            ) {
              return 'vue'
            }
            return undefined
          },
        },
      },
    },

    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules', 'dist'],
    },
  }
})
