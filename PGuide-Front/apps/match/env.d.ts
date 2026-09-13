/**
 * Vite 环境变量类型声明。
 *
 * ⚠️ 与老工程的关键差异：Vue CLI 用 `process.env.VUE_APP_*`，
 * Vite 只暴露以 `VITE_` 开头的变量，且通过 `import.meta.env` 访问。
 * 这里给每个变量声明类型，写错名字 TS 会直接报错（老工程拼错环境变量是静默失败）。
 */
interface ImportMetaEnv {
  /** 应用标题 */
  readonly VITE_APP_TITLE: string

  /** 业务接口基地址。开发环境用 `/api` 走 Vite 代理；生产由 nginx 转发 */
  readonly VITE_API_BASE_URL: string

  /** 鉴权中心接口基地址。当前与业务同网关 */
  readonly VITE_AUTH_API_BASE_URL: string

  /** 本应用地址。登录完成后鉴权中心会回跳到这里 */
  readonly VITE_SELF_URL: string

  /** 开发代理目标（网关地址），仅 dev 使用 */
  readonly VITE_PROXY_TARGET?: string

  /** 是否启用路由登录守卫 */
  readonly VITE_AUTH_GUARD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
