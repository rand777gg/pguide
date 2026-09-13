import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@pguide/shared'

/**
 * 本地存储封装的测试。
 *
 * 为什么要测：这个封装存在的唯一理由就是「统一 token 的读写位置」。
 * 老工程 token 写进 sessionStorage、读却从 localStorage 读，
 * 导致登录状态随机失效 —— 这类问题靠 code review 很难发现，靠测试很便宜。
 */
describe('storage 封装', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('写入的是 JSON，读出来是原类型', () => {
    writeStorage(STORAGE_KEYS.TOKEN, 'abc123')
    expect(readStorage<string>(STORAGE_KEYS.TOKEN)).toBe('abc123')

    writeStorage(STORAGE_KEYS.TOKEN_CODE, { a: 1 })
    expect(readStorage(STORAGE_KEYS.TOKEN_CODE)).toEqual({ a: 1 })
  })

  it('key 不存在时返回 null', () => {
    expect(readStorage(STORAGE_KEYS.TOKEN)).toBeNull()
  })

  it('能兼容没经过 JSON.stringify 的历史裸字符串', () => {
    // 老工程是 localStorage.setItem('token', token)，存的是裸字符串
    window.localStorage.setItem(STORAGE_KEYS.TOKEN, 'raw-token-without-quotes')
    expect(readStorage<string>(STORAGE_KEYS.TOKEN)).toBe('raw-token-without-quotes')
  })

  it('removeStorage 后读不到', () => {
    writeStorage(STORAGE_KEYS.TOKEN, 'x')
    removeStorage(STORAGE_KEYS.TOKEN)
    expect(readStorage(STORAGE_KEYS.TOKEN)).toBeNull()
  })

  it('key 名的字面值不能随意改（后端/老前端都认这个值）', () => {
    expect(STORAGE_KEYS.TOKEN).toBe('PGUIDE_TOKEN')
    expect(STORAGE_KEYS.TOKEN_CODE).toBe('PGUIDE_TOKEN_CODE')
  })
})
