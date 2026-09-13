import type { ApiResult, CaptchaResult, LoginBody, UserInfoVo } from '@pguide/shared'
import { getApiConfig } from '../config'
import { authRequest, get, post, request } from '../http'

/**
 * 鉴权中心（pguide-auth，网关端口 666）
 *
 * 两类接口要分清：
 *   - 走 `authRequest`：可能返回 307 REDIRECT，需要整页跳转统一登录页
 *   - 走 `get` / `post`：普通业务接口，返回统一 JsonResult
 */

/** 从后端拿验证码图片 */
export function fetchCaptcha() {
  return request<CaptchaResult>({ url: '/auth/getCaptch', method: 'GET' })
}

/**
 * 账号密码登录（鉴权中心自己的登录页在用）。
 * 返回的是 token 字符串本身。
 */
export function login(body: LoginBody) {
  return request<string>({ url: '/auth/login', method: 'POST', data: body })
}

/**
 * 子系统跳转到鉴权中心。
 *
 * 老工程是 `GET /auth/authCenter/redirect?sendUrl=<本应用地址>`，
 * 通过 `loginRequest` 实例发出 —— 因为它的响应可能是 307，需要跳转。
 */
export function redirectToAuthCenter() {
  const { selfUrl } = getApiConfig()
  return authRequest<unknown>({
    url: '/auth/authCenter/redirect',
    method: 'GET',
    params: { sendUrl: selfUrl },
  })
}

/**
 * 用一次性 code 换 token。
 * code 是跳转前生成并存在本地的，鉴权中心回来后用它换取真正的访问令牌。
 */
export function exchangeToken(tokenCode: string) {
  return request<string>({
    url: '/auth/authCenter/tokenEx',
    method: 'GET',
    params: { tokenCode },
  })
}

/** 用 token 换当前登录用户的会话信息（后端从 Redis 里取 UserInfoVo） */
export function fetchUserInfoVo() {
  return get<UserInfoVo>('/auth/userinfo/vo')
}

/** 校验验证码（一般不单独调，登录时后端会校验） */
export function checkCaptcha(uuid: string, code: string) {
  return get<string>('/auth/checkCaptch', { uuid, code })
}

/** 子系统登录（带 tokenCode 的版本），保留以兼容旧流程 */
export function subSystemLogin(body: LoginBody) {
  return post<{ token: string; redirectUrl?: string }>('/auth/login/other', body)
}

export type { ApiResult }
