import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { HTTP_STATUS, STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@pguide/shared'
import type { ApiResult } from '@pguide/shared'
import { getApiConfig } from './config'
import type { AuthRedirectPayload } from './config'

/**
 * 统一业务异常。
 *
 * 老工程的做法是把失败的 Promise 直接 reject 一个 `new Error("异常响应 (code: xxx)")`，
 * 调用方拿不到 code，也没法按错误类型分流。这里带上 code 和原始响应体。
 */
export class ApiError extends Error {
  readonly code: number
  readonly payload: unknown

  constructor(code: number, message: string, payload?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.payload = payload
  }
}

/** 后端约定：200 / 202 视为成功（见 org.pguide.common.core.constant.HttpStatus） */
function isSuccessCode(code: number): boolean {
  return code === HTTP_STATUS.SUCCESS || code === HTTP_STATUS.ACCEPTED
}

// ---------------------------------------------------------------------------
// token 读写
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  return readStorage<string>(STORAGE_KEYS.TOKEN)
}

export function setToken(token: string): void {
  writeStorage(STORAGE_KEYS.TOKEN, token)
}

export function clearToken(): void {
  removeStorage(STORAGE_KEYS.TOKEN)
}

/**
 * 生成一次性 code。
 * 用平台原生的 `crypto.randomUUID()`，不再依赖 `uuid` 包
 * （老工程 `loginRequest.js` 里 `import { v4 as uuidv4 } from 'uuid'`
 * 但 package.json 里根本没声明这个依赖）。
 */
function createTokenCode(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // 兜底：老浏览器 / 非安全上下文（http 且非 localhost）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ---------------------------------------------------------------------------
// 业务客户端
// ---------------------------------------------------------------------------

let businessClient: AxiosInstance | null = null

function buildBusinessClient(): AxiosInstance {
  const config = getApiConfig()
  const client = axios.create({
    baseURL: config.apiBaseUrl,
    timeout: config.timeout ?? 25_000,
  })

  client.interceptors.request.use((requestConfig) => {
    const token = getToken()
    if (token) {
      // 后端网关 `GlobalJWTFilter` 读的就是 `token` 这个头
      requestConfig.headers.set('token', token)
    }
    return requestConfig
  })

  client.interceptors.response.use(
    (response) => {
      const body = response.data as ApiResult | undefined

      // 后端即使业务失败也返回 HTTP 200，必须看 body.code
      if (!body || typeof body.code !== 'number') {
        return response
      }

      if (isSuccessCode(body.code)) {
        return response
      }

      if (body.code === HTTP_STATUS.UNAUTHORIZED) {
        clearToken()
        getApiConfig().onUnauthorized?.()
      }

      throw new ApiError(body.code, body.message || '请求失败', body)
    },
    (error) => {
      // HTTP 层的 401（网关直接拒绝，body 不是 JsonResult）
      if (error?.response?.status === 401) {
        clearToken()
        getApiConfig().onUnauthorized?.()
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, '登录已失效，请重新登录', error.response.data)
      }
      throw new ApiError(-1, error?.message ?? '网络异常', error)
    },
  )

  return client
}

export function getHttp(): AxiosInstance {
  businessClient ??= buildBusinessClient()
  return businessClient
}

/**
 * 发一个业务请求，直接拿到 `data` 字段。
 *
 * 老工程每个调用点都要自己写 `res.data.rows` 这种取值，
 * 且失败时拿到的 Error 里没有 code。这里统一：
 *   成功 → 返回泛型 T（就是响应体的 data）
 *   失败 → 抛 ApiError（带 code / message / 原始 payload）
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await getHttp().request<ApiResult<T>>(config)
  return response.data.data
}

export function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'GET', params })
}

export function post<T>(url: string, data?: unknown): Promise<T> {
  return request<T>({ url, method: 'POST', data })
}

// ---------------------------------------------------------------------------
// 鉴权中心客户端
// ---------------------------------------------------------------------------

let authClient: AxiosInstance | null = null

function buildAuthClient(): AxiosInstance {
  const config = getApiConfig()
  const client = axios.create({
    baseURL: config.authBaseUrl,
    timeout: config.timeout ?? 25_000,
  })

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      throw new ApiError(-1, error?.message ?? '鉴权中心不可达', error)
    },
  )

  return client
}

export function getAuthHttp(): AxiosInstance {
  authClient ??= buildAuthClient()
  return authClient
}

/**
 * 走鉴权中心的请求。
 *
 * 关键差异：鉴权中心的响应可能是 `code = 307 (REDIRECT)`，
 * 此时不是失败，而是要求浏览器**整页跳转**到统一登录页。
 * 这里把这个副作用集中处理，业务代码不用关心。
 */
export async function authRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await getAuthHttp().request<ApiResult<T>>(config)
  const body = response.data

  if (body?.code === HTTP_STATUS.REDIRECT) {
    performRedirect(body.data as unknown as AuthRedirectPayload)
    // 页面即将跳走，返回一个永不 resolve 的 Promise，避免调用方继续跑后续逻辑
    return new Promise<T>(() => {})
  }

  if (!body || !isSuccessCode(body.code)) {
    throw new ApiError(body?.code ?? -1, body?.message || '鉴权中心返回异常', body)
  }

  return body.data
}

/**
 * 跳转到统一鉴权中心。
 *
 * 流程（与 Vue2 版保持一致，后端约定不能改）：
 *   1. 生成一个 uuid 作为一次性 code，存本地
 *   2. 跳到 `${redirectUrl}#/redirect?code=<uuid>&sendUrl=<本应用地址>`
 *   3. 用户在鉴权中心登录完成后，会带着 code 回跳到本应用
 *   4. 应用启动时用这个 code 调 `/auth/authCenter/tokenEx` 换真正的 token
 */
function performRedirect(payload: AuthRedirectPayload): void {
  const code = createTokenCode()
  writeStorage(STORAGE_KEYS.TOKEN_CODE, code)

  const sendUrl = payload.sendUrl
  const url = `${payload.redirectUrl}#/redirect?code=${code}&sendUrl=${encodeURIComponent(sendUrl)}`

  const redirect = getApiConfig().onRedirect
  if (redirect) {
    redirect(url)
  } else {
    window.location.assign(url)
  }
}
