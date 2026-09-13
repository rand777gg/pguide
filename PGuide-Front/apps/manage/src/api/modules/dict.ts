import { http } from '../request'
import type { SysDictData, SysDictType } from '../types'

/** 字典管理（`SysDictTypeController` / `SysDictDataController`） */

export interface DictTypeQuery {
  pageNum?: number
  pageSize?: number
  dictName?: string
  dictType?: string
  status?: string
}

export function listDictTypes(query: DictTypeQuery) {
  return http.page<SysDictType>('/system/dict/type/list', query)
}

export function addDictType(data: SysDictType) {
  return http.post<void>('/system/dict/type', data)
}

export function updateDictType(data: SysDictType) {
  return http.put<void>('/system/dict/type', data)
}

export function deleteDictTypes(dictIds: number | number[]) {
  const ids = Array.isArray(dictIds) ? dictIds.join(',') : dictIds
  return http.delete<void>(`/system/dict/type/${ids}`)
}

export interface DictDataQuery {
  pageNum?: number
  pageSize?: number
  dictType?: string
  dictLabel?: string
  status?: string
}

export function listDictData(query: DictDataQuery) {
  return http.page<SysDictData>('/system/dict/data/list', query)
}

/** 按字典类型取全部可用项（下拉框用） */
export function fetchDictByType(dictType: string) {
  return http.get<SysDictData[]>(`/system/dict/data/type/${dictType}`)
}

export function addDictData(data: SysDictData) {
  return http.post<void>('/system/dict/data', data)
}

export function updateDictData(data: SysDictData) {
  return http.put<void>('/system/dict/data', data)
}

export function deleteDictData(dictCodes: number | number[]) {
  const ids = Array.isArray(dictCodes) ? dictCodes.join(',') : dictCodes
  return http.delete<void>(`/system/dict/data/${ids}`)
}
