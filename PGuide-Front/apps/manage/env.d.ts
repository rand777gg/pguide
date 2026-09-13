/**
 * Vite 环境变量类型声明。
 *
 * 注意这个应用对接的是 **PGuide-Manage（RuoYi 单体 :8080）**，
 * 不是 PGuide-Back 微服务网关，两者的接口前缀与响应体都不一样：
 *
 *   PGuide-Back     前缀 /api        响应 {code, message, data}
 *   PGuide-Manage   前缀（根路径）    响应 {code, msg, data | rows/total}
 *
 * 所以这里不复用 @pguide/api 的客户端，见 src/api/request.ts 的说明。
 */
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string

  /** 管理后台接口基地址。开发用 `/dev-api` 走 Vite 代理（会去掉前缀） */
  readonly VITE_API_BASE_URL: string

  /** 开发代理目标（RuoYi 单体地址），仅 dev 使用 */
  readonly VITE_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
