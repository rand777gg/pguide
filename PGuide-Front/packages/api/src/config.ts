import type { UserInfoVo } from '@pguide/shared'

/**
 * API 层运行时配置。
 *
 * 为什么不让本包直接读 `import.meta.env`：
 *   1. 库不应该依赖具体构建工具的环境变量机制（换成 Vitest / Node 跑测试就失效）
 *   2. 环境变量的取值应该由 app 决定，库只接受注入
 *   3. 重定向这类副作用（改 window.location）必须可替换，否则没法写单元测试
 *
 * 用法：在 app 的 main.ts 里，mount 之前调用 `configureApi({...})`。
 */
export interface ApiConfig {
  /** 业务接口基地址（走网关），例如 http://localhost:666/api */
  apiBaseUrl: string

  /** 鉴权中心基地址。当前与业务同网关，保留独立配置是为了将来能分开部署 */
  authBaseUrl: string

  /** 本应用地址，登录完成后鉴权中心会回跳到这里，例如 http://localhost:4000/ */
  selfUrl: string

  /** 请求超时（毫秒），默认 25000 —— 与老工程保持一致 */
  timeout?: number

  /**
   * 需要跳转到统一鉴权中心时的行为。
   * 默认 `window.location.assign(url)`；测试里可以替换成 spy。
   */
  onRedirect?: (url: string) => void

  /**
   * 会话失效（401）时触发。
   * 典型实现是清空 Pinia 里的用户态并跳登录页。做成回调而不是在这里
   * 直接 import 路由，是为了让 api 包不依赖具体 app 的 router 实例。
   */
  onUnauthorized?: () => void
}

let currentConfig: ApiConfig | null = null

export function configureApi(config: ApiConfig): void {
  currentConfig = config
}

export function getApiConfig(): ApiConfig {
  if (!currentConfig) {
    throw new Error(
      '[pguide/api] 尚未调用 configureApi()。请在 app 入口（main.ts）挂载前完成初始化。',
    )
  }
  return currentConfig
}

/** 供测试与热更新场景重置配置 */
export function resetApiConfig(): void {
  currentConfig = null
}

/**
 * 鉴权中心回调时带回来的一次性 code。
 * 后端 `SubSystempTokenCodeStore` 把它和 token 关联，有效期 1 分钟。
 */
export interface TokenExchangeResult {
  token: string
  redirectUrl?: string
}

/** 重定向响应体（后端 code=307 时返回） */
export interface AuthRedirectPayload {
  redirectUrl: string
  sendUrl: string
}

export type { UserInfoVo }
