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

/**
 * 子系统登录请求体，对应后端 `SubSystemLoginBody`。
 *
 * 注意后端那边 `SubSystemLoginBody extends LoginBody` 并且**重复声明**了
 * account / password / code / uuid / redirectUrl，同时新增 tokenCode。
 * 也就是实际需要的字段就是下面这些。
 */
export interface SubSystemLoginBody {
  account: string
  password: string
  /** 验证码 */
  code: string
  /** 验证码对应的 uuid */
  uuid: string
  /** 登录完成后要跳回的子应用地址 */
  redirectUrl: string
  /** 子系统传来的一次性 code */
  tokenCode: string
  /** 系统类型，见后端 AuthConst.SystemTypeConst */
  sysType?: string
  /** 用户类型，见后端 AuthConst.UserTypeConst */
  userType?: string
}

/** 子系统登录响应，对应后端 `SubSystemLoginDTO` */
export interface SubSystemLoginResult {
  token: string
  redirectUrl: string
}

/** 第三方登录方式，对应 `ThirdPartyLogin` 实体 */
export interface ThirdPartyItem {
  thirdPartyId: number
  thirdPartyName: string
  thirdPartyImg?: string
  thirdPartyLinkUrl?: string
}

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

/**
 * 子系统登录（在鉴权中心页面上完成）。
 *
 * ⚠️ 修正记录：第一版这里写的是 `POST /auth/login/other`，是错的。
 * 真实端点是 `POST /api/auth/authCenter/login`
 * （`SubSystemLoginController.loginInAuthCenter`），
 * 请求体是 `SubSystemLoginBody`，返回 `{ token, redirectUrl }`。
 *
 * 与鉴权中心自身登录的区别：多一个 `tokenCode`，
 * 它是子系统跳转过来时生成的一次性 code，用来把 token 关联给子系统。
 */
export function subSystemLogin(body: SubSystemLoginBody) {
  return post<SubSystemLoginResult>('/auth/authCenter/login', body)
}

/**
 * 第三方登录方式列表（`ThirdPartyController`，GET /api/auth/third）。
 * 对应 third_party_login 表。
 */
export function fetchThirdPartyList() {
  return get<ThirdPartyItem[]>('/auth/third')
}

export type { ApiResult }
