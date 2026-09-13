import { http, requestRaw } from '../request'
import { createTreeCrudApi } from './crud'
import type { SysDept, TreeSelectNode } from '../types'

/** 部门管理（`SysDeptController`，前缀 /system/dept） */

export interface DeptQuery {
  deptName?: string
  status?: string
}

/**
 * 部门列表。与菜单一样**不分页**，后端返回拼好的树：
 * `{code, msg, data: SysDept[]}`。
 */
export async function listDepts(query: DeptQuery = {}): Promise<SysDept[]> {
  const result = await requestRaw<{ data: SysDept[] }>({
    url: '/system/dept/list',
    method: 'GET',
    params: query,
  })
  return result.data ?? []
}

/** 供 CrudPage 复用的 CRUD 接口 */
export const deptCrudApi = createTreeCrudApi<SysDept>('/system/dept', (query) =>
  listDepts(query as DeptQuery),
)

/** 上级部门下拉树 */
export async function getDeptTreeSelect(): Promise<TreeSelectNode[]> {
  const result = await requestRaw<{ data?: TreeSelectNode[] }>({
    url: '/system/dept/treeselect',
    method: 'GET',
  })
  return result.data ?? []
}

export function addDept(data: Partial<SysDept>) {
  return http.post<void>('/system/dept', data)
}

export function updateDept(data: Partial<SysDept>) {
  return http.put<void>('/system/dept', data)
}

export function deleteDept(deptId: number) {
  return http.delete<void>(`/system/dept/${deptId}`)
}
