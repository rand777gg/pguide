import { http } from '../request'
import { createCrudApi } from './crud'
import type { SysUser, TreeSelectNode } from '../types'

/** 用户管理（`SysUserController`，前缀 /system/user） */

export interface UserQuery {
  pageNum?: number
  pageSize?: number
  userName?: string
  phonenumber?: string
  status?: string
  deptId?: number
}

/**
 * 供 CrudPage 复用的 CRUD 接口。
 *
 * 用户是**唯一**支持导入的模块：`SysUserController` 有 `/importData` 与
 * `/importTemplate`（权限点 `system:user:import`），其它 Controller 只有导出。
 */
export const userCrudApi = createCrudApi<SysUser>('/system/user', { importable: true })

/**
 * 左侧部门树。
 *
 * ⚠️ 这个接口返回的是 `{code, msg, data: [...]}`，**不是**分页结构，
 * 也不能走 `http.page`。
 */
export async function fetchDeptTree(): Promise<TreeSelectNode[]> {
  const result = await http.raw<{ data?: TreeSelectNode[] }>('/system/user/deptTree')
  return (result as unknown as { data?: TreeSelectNode[] }).data ?? []
}

/**
 * 新增/编辑用户时的表单元数据。
 *
 * RuoYi 的 `GET /system/user/{id}` 返回的是 `{code, msg, data, roles, posts}`
 * —— data 是用户本身，roles / posts 是可选角色与岗位，**平铺在顶层**。
 */
export async function getUserFormMeta(userId?: number) {
  const url = userId ? `/system/user/${userId}` : '/system/user/'
  return http.raw<{
    data?: SysUser
    roles?: { rows?: Array<{ roleId: number; roleName: string }> }
    posts?: { rows?: Array<{ postId: number; postName: string }> }
  }>(url)
}

export function resetUserPwd(userId: number, password: string) {
  return http.put<void>('/system/user/resetPwd', { userId, password })
}

export function changeUserStatus(userId: number, status: string) {
  return http.put<void>('/system/user/changeStatus', { userId, status })
}
