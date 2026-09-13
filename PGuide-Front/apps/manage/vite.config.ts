import { fileURLToPath, URL } from 'node:url'

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

/**
 * 管理后台 dev server。
 *
 * ── 为什么代理前缀是 /dev-api 而不是 /api ──
 *
 * 本项目有两个后端，它们的路径风格不一样：
 *
 *   PGuide-Back 微服务集群（网关 :666）
 *     所有接口都在 /api 前缀下：/api/auth/**、/api/cms/**、/api/mms/**
 *     → apps/match、apps/auth 用 `/api` 代理，不需要 rewrite
 *
 *   PGuide-Manage（RuoYi 单体 :8080）
 *     接口直接在根路径：/login、/getInfo、/getRouters、/system/user/list
 *     → 这里用 `/dev-api` 代理并**去掉前缀**，避免和上面那套混淆
 *
 * 这个约定沿用 RuoYi 的 `.env.development`（VUE_APP_BASE_API=/dev-api），
 * 现有部署脚本不用改。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
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
      // 老 ruoyi-ui 跑在 80；这里用 81，避开 Windows 上 80 端口常见的占用
      port: 81,
      host: true,
      strictPort: true,
      proxy: {
        '/dev-api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/dev-api/, ''),
        },
      },
    },

    preview: {
      port: 81,
      strictPort: true,
    },

    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
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
