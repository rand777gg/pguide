import type { StorageKey } from '../constants/storage-keys'

/**
 * 本地存储的类型安全封装。
 *
 * 直接裸用 localStorage 的问题：
 *   - 值永远是 string，取出来要自己 parse，忘了就得到 "[object Object]"
 *   - key 靠手写字符串，拼错了不会报错
 *   - SSR / 隐私模式下 localStorage 可能直接抛异常
 *
 * 这里统一收口，任何模块都不应直接碰 window.localStorage。
 */

function getStorage(): Storage | null {
  try {
    // 隐私模式下访问 localStorage 可能抛 SecurityError
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function readStorage<T = string>(key: StorageKey): T | null {
  const storage = getStorage()
  if (!storage) return null

  const raw = storage.getItem(key)
  if (raw === null) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    // 老数据可能是裸字符串（没经过 JSON.stringify），原样返回
    return raw as unknown as T
  }
}

export function writeStorage(key: StorageKey, value: unknown): void {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(key, JSON.stringify(value))
}

export function removeStorage(key: StorageKey): void {
  getStorage()?.removeItem(key)
}

export function clearStorage(): void {
  getStorage()?.clear()
}
