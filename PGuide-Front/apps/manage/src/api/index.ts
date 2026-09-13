/**
 * 管理后台 API 层入口。
 *
 * 组件里**只允许**从这里 import，不允许直接碰 axios。
 * 详见 dev-manual/04-API层与数据流.md。
 */

export * from './request'
export * from './types'

export * as authApi from './modules/auth'
export * as userApi from './modules/user'
export * as roleApi from './modules/role'
export * as menuApi from './modules/menu'
export * as deptApi from './modules/dept'
export * as dictApi from './modules/dict'
export * as businessApi from './modules/business'
export * as monitorApi from './modules/monitor'

export { createCrudApi, createTreeCrudApi } from './modules/crud'
export type { CrudApi, CrudApiOptions } from './modules/crud'
export { userCrudApi } from './modules/user'
export { roleCrudApi } from './modules/role'
export { menuCrudApi } from './modules/menu'
export { deptCrudApi } from './modules/dept'
export { postCrudApi, configCrudApi, noticeCrudApi, refreshConfigCache } from './modules/system'
export { operlogCrudApi, logininforCrudApi } from './modules/monitor'
export { cleanOperlog, cleanLogininfor, unlockLogininfor } from './modules/monitor'
export type { LoginBody } from './modules/auth'
export type { UserQuery } from './modules/user'
export type { RoleQuery } from './modules/role'
export type { MenuQuery } from './modules/menu'
export type { DeptQuery } from './modules/dept'
export type { DictTypeQuery, DictDataQuery } from './modules/dict'
