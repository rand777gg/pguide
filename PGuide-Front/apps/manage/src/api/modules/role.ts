import { http, requestRaw } from '../request'
import { createCrudApi } from './crud'
import type { SysRole, TreeSelectNode } from '../types'

/** 角色管理（`SysRoleController`，前缀 /system/role） */

export interface RoleQuery {
  pageNum?: number
  pageSize?: number
  roleName?: string
  roleKey?: string
  status?: string
}

/** 供 CrudPage 复用的 CRUD 接口 */
export const roleCrudApi = createCrudApi<SysRole>('/system/role')

export function changeRoleStatus(roleId: number, status: string) {
  return http.put<void>('/system/role/changeStatus', { roleId, status })
}

/**
 * 编辑角色时一次性拿到菜单树 + 该角色已勾选的菜单 id。
 * 对应 `SysMenuController.roleMenuTreeselect`。
 */
export function getRoleMenuTree(roleId: number) {
  return requestRaw<{ menus: TreeSelectNode[]; checkedKeys: number[] }>({
    url: `/system/menu/roleMenuTreeselect/${roleId}`,
    method: 'GET',
  })
}
