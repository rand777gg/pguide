/**
 * 本地存储 key 常量。
 *
 * 老工程（Vue2）里的问题，这里一并修掉：
 *   - token 在 `request.js` 里读的是 localStorage，
 *     而 `utils/auth.js` 读写的却是 sessionStorage —— 两套存储不一致。
 *   - "tokenCode"、"token" 这些字符串散落在多个文件里硬编码。
 *
 * 新工程统一走 localStorage（跨标签页共享会话），key 集中在这里。
 */
export const STORAGE_KEYS = {
  /** 业务接口用的访问令牌 */
  TOKEN: 'PGUIDE_TOKEN',
  /** 跳转统一鉴权中心时携带的一次性 code，回来用它换 token */
  TOKEN_CODE: 'PGUIDE_TOKEN_CODE',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
