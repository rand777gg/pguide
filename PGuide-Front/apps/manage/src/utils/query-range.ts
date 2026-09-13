import type { CrudColumn } from '@/composables/crud-config'
import type { CrudQuery } from '@/composables/useCrud'

/**
 * 日期区间搜索。
 *
 * ── 为什么单独抽出来 ──
 *
 * el-date-picker 的 daterange 绑定的是**一个数组**，而查询条件里要放的是
 * **两个标量参数**。RuoYi 的时间区间查询还用 `params[beginTime]` 这种
 * 带中括号的怪名字（对应后端 `BaseEntity` 的 `Map<String, Object> params`），
 * 所以键名不能从字段名推。这里把「数组 ↔ 两个查询参数」的换算固定下来，
 * 也能单独写单元测试（el-date-picker 在 jsdom 里很难驱动）。
 *
 * 第一版把数组直接塞进了 `query[prop]`，结果发给后端的是
 * `params[beginTime]=2026-01-01,2026-01-31` —— 后端解析不了，等于筛选失效。
 */

export type QueryRange = [string, string] | undefined

/** 区间起止对应的查询参数名。没配 searchKeyEnd 时退化成 `${searchKey}End`。 */
export function rangeKeys<T extends object>(column: CrudColumn<T>): [string, string] {
  const begin = column.searchKey ?? column.prop
  return [begin, column.searchKeyEnd ?? `${begin}End`]
}

/** 纯日期（`2026-01-01`）补上时分秒，避免「同一天的数据被排除」 */
function normalizeBound(value: string, edge: 'start' | 'end'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return `${value} ${edge === 'start' ? '00:00:00' : '23:59:59'}`
}

/** 从查询条件里读回区间，用来给 el-date-picker 的 model-value 赋值 */
export function readQueryRange<T extends object>(
  query: CrudQuery,
  column: CrudColumn<T>,
): QueryRange {
  const [beginKey, endKey] = rangeKeys(column)
  const begin = query[beginKey]
  const end = query[endKey]

  if (typeof begin !== 'string' || typeof end !== 'string') return undefined
  if (begin === '' || end === '') return undefined

  return [begin, end]
}

/**
 * 把 el-date-picker 抛出来的值写进查询条件。
 *
 * 清空（用户点小叉）时会把两个参数都置成 undefined —— 否则残留的
 * 半截区间会一直挂在查询条件上。
 */
export function writeQueryRange<T extends object>(
  query: CrudQuery,
  column: CrudColumn<T>,
  value: unknown,
): void {
  const [beginKey, endKey] = rangeKeys(column)
  const range = Array.isArray(value) ? value : []

  const rawBegin = range[0]
  const rawEnd = range[1]

  query[beginKey] =
    typeof rawBegin === 'string' && rawBegin !== ''
      ? normalizeBound(rawBegin, 'start')
      : undefined
  query[endKey] =
    typeof rawEnd === 'string' && rawEnd !== '' ? normalizeBound(rawEnd, 'end') : undefined
}
