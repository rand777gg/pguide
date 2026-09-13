/**
 * Vite 环境变量类型声明。
 *
 * 与老工程的关键差异：Vue CLI 用 `process.env.VUE_APP_*`，
 * Vite 只暴露以 `VITE_` 开头的变量，且通过 `import.meta.env` 访问。
 *
 * 老 auth-ui 的 `.env.production` 里只定义了 VUE_APP_BASE_API，
 * 漏了 VUE_APP_IF_OPEN_AUTH 等变量，运行时静默变成 undefined。
 * 这里给每个变量声明类型，拼错名字 TS 直接报错。
 */
interface ImportMetaEnv {
  /** 应用标题 */
  readonly VITE_APP_TITLE: string

  /** 业务接口基地址。开发用 `/api` 走 Vite 代理；生产由 nginx 转发 */
  readonly VITE_API_BASE_URL: string

  /** 鉴权中心自身的地址。后端跳转过来时用的就是它 */
  readonly VITE_SELF_URL: string

  /** 开发代理目标（网关地址），仅 dev 使用 */
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
