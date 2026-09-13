import { http, requestRaw } from '../request'
import type { CaptchaImageResult, DynamicRoute, UserInfoResult } from '../types'

/**
 * 认证相关接口（RuoYi `SysLoginController` / `CaptchaController`）。
 *
 * 注意登录请求体是 `{username, password, code, uuid}`，
 * 字段名是 **username** 而不是 pguide 那边的 account。
 */
export interface LoginBody {
  username: string
  password: string
  code: string
  uuid: string
}

/** 获取验证码。`captchaEnabled` 为 false 时后端关闭了验证码，img 不返回。 */
export function fetchCaptchaImage() {
  return requestRaw<CaptchaImageResult>({ url: '/captchaImage', method: 'GET' })
}

/** 登录，返回 JWT token（在响应体顶层的 token 字段） */
export function login(body: LoginBody) {
  return requestRaw<{ token: string }>({ url: '/login', method: 'POST', data: body })
}

/** 退出登录 */
export function logout() {
  return http.post<void>('/logout')
}

/** 获取当前登录用户信息、角色、权限（三者平铺在响应体顶层） */
export function getInfo() {
  return requestRaw<UserInfoResult>({ url: '/getInfo', method: 'GET' })
}

/** 获取当前用户可见的动态路由（菜单由后端 sys_menu 驱动） */
export function getRouters() {
  return http.get<DynamicRoute[]>('/getRouters')
}
