import { describe, expect, it } from 'vitest'
import { readQueryRange, writeQueryRange } from '../query-range'
import type { CrudColumn } from '@/composables/crud-config'
import type { CrudQuery } from '@/composables/useCrud'

/**
 * 日期区间搜索的换算测试。
 *
 * 这里值得单独测的原因：daterange 的界面值是**一个数组**，
 * 而查询条件是**两个标量参数**，键名还是 RuoYi 那种 `params[beginTime]`。
 * 第一版把数组直接塞进 query，发给后端的是
 * `params[beginTime]=2026-01-01,2026-01-31` —— 后端解析不了，筛选静默失效。
 */

interface Row extends Record<string, unknown> {
  operTime?: string
}

const RANGE_COLUMN: CrudColumn<Row> = {
  prop: 'operTime',
  label: '操作时间',
  searchable: true,
  searchType: 'daterange',
  searchKey: 'params[beginTime]',
  searchKeyEnd: 'params[endTime]',
}

function makeQuery(extra: Record<string, unknown> = {}): CrudQuery {
  return { pageNum: 1, pageSize: 10, ...extra } as CrudQuery
}

describe('writeQueryRange', () => {
  it('把区间写成 RuoYi 需要的一对参数', () => {
    const query = makeQuery()

    writeQueryRange(query, RANGE_COLUMN, ['2026-01-01', '2026-01-31'])

    expect(query['params[beginTime]']).toBe('2026-01-01 00:00:00')
    expect(query['params[endTime]']).toBe('2026-01-31 23:59:59')
  })

  it('纯日期补上时分秒，否则「当天的数据」会被漏掉', () => {
    // 字符串比较下 '2026-01-31' < '2026-01-31 10:20:30'，
    // 不补 23:59:59 的话结束当天上午的数据永远查不出来
    const query = makeQuery()

    writeQueryRange(query, RANGE_COLUMN, ['2026-01-31', '2026-01-31'])

    expect(query['params[beginTime]']).toBe('2026-01-31 00:00:00')
    expect(query['params[endTime]']).toBe('2026-01-31 23:59:59')
  })

  it('已经是完整时间的不再补', () => {
    const query = makeQuery()

    writeQueryRange(query, RANGE_COLUMN, ['2026-01-01 08:00:00', '2026-01-31 18:00:00'])

    expect(query['params[beginTime]']).toBe('2026-01-01 08:00:00')
    expect(query['params[endTime]']).toBe('2026-01-31 18:00:00')
  })

  it('清空（点小叉）时两个参数都清掉，不留半截区间', () => {
    const query = makeQuery({
      'params[beginTime]': '2026-01-01 00:00:00',
      'params[endTime]': '2026-01-31 23:59:59',
    })

    writeQueryRange(query, RANGE_COLUMN, null)

    expect(query['params[beginTime]']).toBeUndefined()
    expect(query['params[endTime]']).toBeUndefined()
  })

  it('没配 searchKey 时退化成用字段名（普通 daterange 也能用）', () => {
    const query = makeQuery()
    const plain: CrudColumn<Row> = { prop: 'operTime', label: '时间', searchType: 'daterange' }

    writeQueryRange(query, plain, ['2026-02-01', '2026-02-02'])

    expect(query.operTime).toBe('2026-02-01 00:00:00')
    expect(query.operTimeEnd).toBe('2026-02-02 23:59:59')
  })
})

describe('readQueryRange', () => {
  it('从查询条件里读回区间给日期选择器', () => {
    const query = makeQuery({
      'params[beginTime]': '2026-01-01 00:00:00',
      'params[endTime]': '2026-01-31 23:59:59',
    })

    expect(readQueryRange(query, RANGE_COLUMN)).toEqual([
      '2026-01-01 00:00:00',
      '2026-01-31 23:59:59',
    ])
  })

  it('没有区间时返回 undefined（选择器显示为空）', () => {
    expect(readQueryRange(makeQuery(), RANGE_COLUMN)).toBeUndefined()
  })

  it('只有半截区间时也当没有（避免选择器显示一个假的区间）', () => {
    const query = makeQuery({ 'params[beginTime]': '2026-01-01 00:00:00' })

    expect(readQueryRange(query, RANGE_COLUMN)).toBeUndefined()
  })

  it('写入再读回是同一个区间', () => {
    const query = makeQuery()
    writeQueryRange(query, RANGE_COLUMN, ['2026-03-05', '2026-03-06'])

    expect(readQueryRange(query, RANGE_COLUMN)).toEqual([
      '2026-03-05 00:00:00',
      '2026-03-06 23:59:59',
    ])
  })
})
