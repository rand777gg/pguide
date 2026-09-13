import { http, requestRaw } from '../request'
import { createTreeCrudApi } from './crud'
import type { SysMenu, TreeSelectNode } from '../types'

/** 菜单管理（`SysMenuController`，前缀 /system/menu） */

export interface MenuQuery {
  menuName?: string
  status?: string
}

/**
 * 菜单列表。
 *
 * 注意：**不分页**。RuoYi 在服务端把平铺的 sys_menu 拼成树后返回
 * `{code, msg, data: SysMenu[]}`，而不是分页的 `{total, rows}`。
 * 菜单总数量很少（几十条），一次返回是合理的。
 */
export async function listMenus(query: MenuQuery = {}): Promise<SysMenu[]> {
  const result = await requestRaw<{ data: SysMenu[] }>({
    url: '/system/menu/list',
    method: 'GET',
    params: query,
  })
  return result.data ?? []
}

/** 供 CrudPage 复用的 CRUD 接口 */
export const menuCrudApi = createTreeCrudApi<SysMenu>('/system/menu', (query) =>
  listMenus(query as MenuQuery),
)

/** 上级菜单下拉树 */
export function getMenuTreeSelect() {
  return requestRaw<{ menus: TreeSelectNode[] }>({ url: '/system/menu/treeselect', method: 'GET' })
}

/** 编辑角色时：菜单树 + 该角色已勾选的菜单 id */
export function getRoleMenuTreeSelect(roleId: number) {
  return requestRaw<{ menus: TreeSelectNode[]; checkedKeys: number[] }>({
    url: `/system/menu/roleMenuTreeselect/${roleId}`,
    method: 'GET',
  })
}

export function addMenu(data: Partial<SysMenu>) {
  return http.post<void>('/system/menu', data)
}

export function updateMenu(data: Partial<SysMenu>) {
  return http.put<void>('/system/menu', data)
}

export function deleteMenu(menuId: number) {
  return http.delete<void>(`/system/menu/${menuId}`)
}
