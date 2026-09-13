import { fileURLToPath, URL } from 'node:url'

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

/**
 * 鉴权中心 dev server 固定跑在 99 端口。
 *
 * 这个端口不是随便选的：后端 pguide-auth 的配置项
 * `pguide.server.path.authPage` = `http://localhost:99/`，
 * 它是 `GET /api/auth/authCenter/redirect` 返回给子系统用来跳转的地址
 * （见 RedirectHelper.doRedirectMemory）。
 * 改端口就必须同步改后端配置，否则跳转会 404。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      // 与 apps/match 同样的按需引入策略，说明见该项目的 vite.config.ts
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
      port: 99,
      host: true,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:666',
          changeOrigin: true,
        },
      },
    },

    preview: {
      port: 99,
      strictPort: true,
    },

    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1024,
      rollupOptions: {
        output: {
          // manualChunks 必须用函数写法，对象写法会把整棵依赖树强制打进 chunk
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
