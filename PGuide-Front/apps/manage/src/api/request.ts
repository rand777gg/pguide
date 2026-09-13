import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

/**
 * PGuide-Manage（RuoYi 单体）的 HTTP 客户端。
 *
 * ── 为什么不复用 @pguide/api ──
 *
 * 本项目有两个后端，契约不一样：
 *
 *                PGuide-Back（微服务网关）      PGuide-Manage（RuoYi）
 *   ───────────  ────────────────────────────  ──────────────────────────
 *   前缀          /api/auth、/api/cms ...       根路径（/login、/system/...）
 *   响应体        {code, message, data}         {code, msg, data}
 *   列表响应      {code, message, data:{rows}}  {code, msg, rows, total}  ← 平铺
 *   成功码        200 / 202                     200
 *   认证头        token                         Authorization: Bearer xxx
 *
 * 强行合成一个客户端只会让两边都变别扭。所以这个应用自己持有一个客户端，
 * 但**同样遵守「组件里不允许出现 axios」这条规则** —— 组件只调 src/api/modules。
 */

/** RuoYi 统一响应体（`AjaxResult`） */
export interface RuoYiResult<T = unknown> {
  code: number
  msg: string
  data?: T
}

/** RuoYi 分页响应体（`TableDataInfo`）—— 注意 rows/total 是平铺的 */
export interface RuoYiPage<T> {
  code: number
  msg: string
  total: number
  rows: T[]
}

export class RuoYiError extends Error {
  readonly code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'RuoYiError'
    this.code = code
  }
}

const SUCCESS = 200
const UNAUTHORIZED = 401

// ---------------------------------------------------------------------------
// token
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'PGUIDE_ADMIN_TOKEN'

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY)
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

/** 会话失效时的回调，由 app 注入（避免这里 import router 造成循环依赖） */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

let client: AxiosInstance | null = null

function buildClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30_000,
  })

  instance.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
      // RuoYi 的 JwtAuthenticationTokenFilter 读的是 Authorization 头
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status
      if (status === UNAUTHORIZED) {
        clearToken()
        onUnauthorized?.()
        throw new RuoYiError(UNAUTHORIZED, '登录状态已过期，请重新登录')
      }
      throw new RuoYiError(-1, error?.message ?? '网络异常')
    },
  )

  return instance
}

export function getHttp(): AxiosInstance {
  client ??= buildClient()
  return client
}

/** 校验响应码，非 200 抛 RuoYiError */
function ensureSuccess(body: RuoYiResult | undefined): void {
  if (!body) return

  if (body.code === UNAUTHORIZED) {
    clearToken()
    onUnauthorized?.()
    throw new RuoYiError(UNAUTHORIZED, body.msg || '登录状态已过期，请重新登录')
  }
  if (body.code !== SUCCESS) {
    throw new RuoYiError(body.code, body.msg || '请求失败')
  }
}

/** 拿到响应体的 `data` 字段 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await getHttp().request<RuoYiResult<T>>(config)
  ensureSuccess(response.data)
  return response.data.data as T
}

/** 拿到**整个响应体**（有的接口把结果放在顶层，比如 getInfo 的 user/roles/permissions） */
export async function requestRaw<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await getHttp().request<T & RuoYiResult>(config)
  ensureSuccess(response.data)
  return response.data
}

/** 分页列表：从平铺的 rows/total 里取数据 */
export async function requestPage<T>(
  config: AxiosRequestConfig,
): Promise<{ total: number; rows: T[] }> {
  const response = await getHttp().request<RuoYiPage<T>>(config)
  ensureSuccess(response.data)
  return { total: response.data.total ?? 0, rows: response.data.rows ?? [] }
}

/**
 * HTTP 便捷方法。
 *
 * 参数类型用 `object` 而不是 `Record<string, unknown>`：
 * 后者要求类型带索引签名，而我们的查询类型都是 interface（不带索引签名），
 * 会导致 `http.page<T>(url, query)` 报「不可赋值」。`object` 足够宽松且仍有约束。
 */
export const http = {
  get: <T>(url: string, params?: object) => request<T>({ url, method: 'GET', params }),
  post: <T>(url: string, data?: unknown) => request<T>({ url, method: 'POST', data }),
  put: <T>(url: string, data?: unknown) => request<T>({ url, method: 'PUT', data }),
  delete: <T>(url: string, params?: object) => request<T>({ url, method: 'DELETE', params }),

  page: <T>(url: string, params?: object) => requestPage<T>({ url, method: 'GET', params }),

  raw: <T>(url: string, params?: object) => requestRaw<T>({ url, method: 'GET', params }),
}

/** 下载类接口（导出 Excel）。RuoYi 返回的是 blob。 */
export async function download(url: string, params?: object): Promise<Blob> {
  const response = await getHttp().request<Blob>({
    url,
    method: 'POST',
    params,
    responseType: 'blob',
  })
  return response.data
}
