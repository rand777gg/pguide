import { describe, expect, it } from 'vitest'
import {
  AUTH_REDIRECT_PATH,
  buildAuthRedirectUrl,
  parseAuthRedirectParams,
} from '../modules/auth-redirect'

/**
 * SSO 重定向协议的测试。
 *
 * 这是两个应用之间的约定：apps/match 生成链接，apps/auth 解析。
 * 出过真实的 bug，所以必须有测试守住。
 */
describe('buildAuthRedirectUrl', () => {
  it('base 带结尾斜杠', () => {
    const url = buildAuthRedirectUrl('http://localhost:99/', {
      code: 'abc-123',
      sendUrl: 'http://localhost:4000/',
    })
    expect(url).toBe(`http://localhost:99/${AUTH_REDIRECT_PATH}?code=abc-123&sendUrl=http%3A%2F%2Flocalhost%3A4000%2F`)
  })

  it('base 不带结尾斜杠也能拼对', () => {
    const url = buildAuthRedirectUrl('http://localhost:99', {
      code: 'x',
      sendUrl: 'http://localhost:4000/',
    })
    expect(url.startsWith('http://localhost:99/redirect?')).toBe(true)
  })

  it('sendUrl 由 URLSearchParams 编码，调用方不需要手动 encode', () => {
    const url = buildAuthRedirectUrl('http://a/', { code: 'c', sendUrl: 'http://b/?x=1&y=2' })
    // & 被编码成 %26，不会被解析成参数分隔符
    expect(url).toContain('sendUrl=http%3A%2F%2Fb%2F%3Fx%3D1%26y%3D2')
  })
})

describe('parseAuthRedirectParams', () => {
  it('解析新形式（history 路由，参数在 ? 之后）', () => {
    const result = parseAuthRedirectParams(
      'http://localhost:99/redirect?code=abc&sendUrl=http%3A%2F%2Flocalhost%3A4000%2F',
    )
    expect(result).toEqual({ code: 'abc', sendUrl: 'http://localhost:4000/' })
  })

  /**
   * 这一条专门守住老 auth-ui 的 bug。
   *
   * 老代码：`new URL(location.href).searchParams.get('code')`
   * 而 `searchParams` 只读 `?` 到 `#` **之间**的部分，
   * 参数在 `#` **之后**，所以永远拿到 null。
   */
  it('解析老形式（hash 路由，参数在 # 之后）—— 老版本在这里是坏的', () => {
    const result = parseAuthRedirectParams(
      'http://localhost:99/#/redirect?code=legacy-code&sendUrl=http%3A%2F%2Flocalhost%3A4000%2F',
    )
    expect(result).toEqual({ code: 'legacy-code', sendUrl: 'http://localhost:4000/' })
  })

  it('对照：用原生 searchParams 解析老形式会失败（说明为什么必须自己解析）', () => {
    const href = 'http://localhost:99/#/redirect?code=legacy&sendUrl=http%3A%2F%2Fb%2F'
    // 这就是老代码的做法，拿不到东西
    expect(new URL(href).searchParams.get('code')).toBeNull()
    // 我们的实现能拿到
    expect(parseAuthRedirectParams(href)?.code).toBe('legacy')
  })

  it('缺参数时返回 null', () => {
    expect(parseAuthRedirectParams('http://localhost:99/')).toBeNull()
    expect(parseAuthRedirectParams('http://localhost:99/redirect?code=only-code')).toBeNull()
    expect(parseAuthRedirectParams('http://localhost:99/redirect?sendUrl=http%3A%2F%2Fb%2F')).toBeNull()
  })

  it('多余参数不影响解析', () => {
    const result = parseAuthRedirectParams(
      'http://localhost:99/redirect?foo=1&code=c1&sendUrl=http%3A%2F%2Fb%2F&bar=2',
    )
    expect(result).toEqual({ code: 'c1', sendUrl: 'http://b/' })
  })

  it('往返一致：build 出来的 URL 能被 parse 还原', () => {
    const original = { code: 'round-trip-code', sendUrl: 'http://localhost:4000/user?a=1&b=2' }
    const url = buildAuthRedirectUrl('http://localhost:99/', original)
    expect(parseAuthRedirectParams(url)).toEqual(original)
  })
})
