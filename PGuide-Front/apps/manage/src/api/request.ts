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

/**
 * 读 Blob 的文本内容。
 *
 * 优先用 `Blob.prototype.text()`；拿不到就用 FileReader 兜底 ——
 * 浏览器都支持前者，但 jsdom（测试环境）的部分版本没有实现，
 * 不兜底的话这段错误识别逻辑在测试里根本跑不起来。
 */
async function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('读取响应内容失败'))
    reader.readAsText(blob)
  })
}

/**
 * 下载类接口（导出 Excel）。
 *
 * 两个坑：
 *
 * 1. RuoYi 的导出是 **POST + query 参数**（不是 body），
 *    和 ruoyi-ui 的 `download('system/user/export', queryParams, filename)` 一致。
 * 2. 导出成功返回的是 xlsx 二进制，**失败时却返回 JSON**
 *    （全局异常处理器把 `AjaxResult` 写进了响应体，HTTP 状态码可能还是 200）。
 *    这种响应如果原样当文件下载，用户会得到一个文件名很像 Excel、
 *    打开却报损坏的文件。所以这里嗅探一下 content-type，是 JSON 就抛异常。
 *
 * 另外：ExcelUtil 是直接把字节写进响应流的，**不设置 Content-Disposition**，
 * 文件名只能由调用方自己拼（见 utils/file.ts 的 buildExportFilename）。
 */
export async function download(url: string, params?: object): Promise<Blob> {
  const response = await getHttp().request<Blob>({
    url,
    method: 'POST',
    params,
    responseType: 'blob',
  })

  const blob = response.data
  if (blob.type.includes('json')) {
    const text = await readBlobText(blob)
    let body: RuoYiResult | undefined
    try {
      body = JSON.parse(text) as RuoYiResult
    } catch {
      body = undefined
    }
    if (!body) {
      throw new RuoYiError(-1, '导出失败：后端返回的不是 Excel 文件')
    }
    // code 非 200 时 ensureSuccess 会抛出带 msg 的 RuoYiError
    ensureSuccess(body)
    throw new RuoYiError(body.code, body.msg || '导出失败')
  }

  return blob
}

/**
 * 上传类接口（Excel 导入）。
 *
 * 注意**不要手动设置 `Content-Type: multipart/form-data`** ——
 * 边界串（boundary）由浏览器/axios 生成，手写会漏掉 boundary，
 * 后端会报 "Current request is not a multipart request"。
 *
 * RuoYi 的 `SysUserController.importData(MultipartFile file, boolean updateSupport)`
 * 把 `updateSupport` 当普通请求参数读，所以走 `params`，文件走 form-data。
 * 返回值里导入结果文案在 `msg` 字段（`success(message)`）。
 */
export async function upload<T = unknown>(
  url: string,
  formData: FormData,
  params?: object,
): Promise<RuoYiResult<T>> {
  const response = await getHttp().request<RuoYiResult<T>>({
    url,
    method: 'POST',
    data: formData,
    params,
  })
  ensureSuccess(response.data)
  return response.data
}
