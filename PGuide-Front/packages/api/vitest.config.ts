import { defineConfig } from 'vitest/config'

/**
 * `@pguide/api` 的测试配置。
 *
 * 这个包是纯 TS 逻辑（协议编解码、类型守卫），不碰 DOM，
 * 所以环境用 node 就行 —— 比 jsdom 快。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.{test,spec}.ts'],
  },
})
