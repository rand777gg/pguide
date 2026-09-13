/**
 * 统一鉴权中心的重定向协议。
 *
 * 放在 `@pguide/api` 而不是某个 app 里，是因为它是**两个应用之间的约定**：
 * 业务应用（apps/match）生成跳转链接，鉴权中心（apps/auth）负责解析。
 * 两边共用一份实现，才不会各写各的。
 */

/** 重定向落地路径 */
export const AUTH_REDIRECT_PATH = 'redirect'

/** 重定向携带的参数 */
export interface AuthRedirectParams {
  /** 一次性 code（uuid），鉴权中心登录后用它把 token 关联给子系统 */
  code: string
  /** 登录完成后要跳回的子应用地址 */
  sendUrl: string
}

/**
 * 构造跳转到鉴权中心的 URL。
 *
 * 用 `new URL(path, base)` 而不是字符串拼接，这样 base 带不带结尾斜杠都对：
 *   'http://localhost:99/'  → http://localhost:99/redirect?code=..&sendUrl=..
 *   'http://localhost:99'   → http://localhost:99/redirect?code=..&sendUrl=..
 *
 * sendUrl 由 URLSearchParams 负责编码，不需要手动 encodeURIComponent。
 */
export function buildAuthRedirectUrl(authCenterUrl: string, params: AuthRedirectParams): string {
  const url = new URL(AUTH_REDIRECT_PATH, authCenterUrl)
  url.searchParams.set('code', params.code)
  url.searchParams.set('sendUrl', params.sendUrl)
  return url.toString()
}

/**
 * 解析重定向参数。**兼容两种 URL 形式**：
 *
 *   新形式（history 路由）：http://localhost:99/redirect?code=xxx&sendUrl=yyy
 *   老形式（hash 路由）：    http://localhost:99/#/redirect?code=xxx&sendUrl=yyy
 *
 * ⚠️ 这里修的是老 auth-ui 的一个真实 bug：
 * 老代码写的是 `new URL(location.href).searchParams.get('code')`，
 * 但 `searchParams` 读的是 `?` 到 `#` **之间**的部分。
 * 而参数恰恰在 `#` **之后**，所以永远取到 null ——
 * 整段子系统登录判断因此失效，只是没人发现
 * （因为回跳后换 token 用的是 localStorage 而不是这个参数，链路碰巧还能跑通）。
 *
 * 正确做法就是下面这样：先把 `#` 之后的部分取出来单独解析。
 */
export function parseAuthRedirectParams(href: string): AuthRedirectParams | null {
  const search = extractSearch(href)
  if (!search) return null

  const params = new URLSearchParams(search)
  const code = params.get('code')
  const sendUrl = params.get('sendUrl')

  if (!code || !sendUrl) return null
  return { code, sendUrl }
}

/** 从任意形式的 URL / href 里取出查询串 */
function extractSearch(href: string): string | null {
  const hashIndex = href.indexOf('#')

  // 优先看 # 之后（老形式的参数在这里）
  if (hashIndex >= 0) {
    const hash = href.slice(hashIndex + 1)
    const queryIndex = hash.indexOf('?')
    if (queryIndex >= 0) {
      return hash.slice(queryIndex + 1)
    }
  }

  // 再看 # 之前（新形式）
  const queryIndex = href.indexOf('?')
  if (queryIndex >= 0) {
    const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href
    const scoped = beforeHash.indexOf('?')
    if (scoped >= 0) return beforeHash.slice(scoped + 1)
  }

  return null
}

/** 把 base64 的验证码图片拼成可以直接给 <img src> 的 data URL */
export function toCaptchaDataUrl(base64: string): string {
  // 后端返回的是 jpg（见 CaptchaServiceImpl 的 ImageIO.write(image, "jpg", os)）。
  // 老工程拼的是 data:image/gif —— 浏览器多数情况下能容错，
  // 但声明成正确的 mime 更稳妥。
  return `data:image/jpeg;base64,${base64}`
}
