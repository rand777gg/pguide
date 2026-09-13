import { createCrudApi } from './crud'
import { http } from '../request'
import type { SysLogininfor, SysOperlog } from '../types'

/**
 * 系统监控里的两个日志模块。
 *
 *   SysOperlogController     /monitor/operlog     monitor:operlog:*
 *   SysLogininforController  /monitor/logininfor  monitor:logininfor:*
 *
 * 这两个模块**只能看、删、导出**，没有新增和修改接口 ——
 * 页面用 `hide-add` / `hide-edit` 把按钮去掉，删除与导出保留。
 * 日志的排查价值主要靠时间区间 + 关键字筛选，所以页面上都配了 daterange。
 */

/** 操作日志 */
export const operlogCrudApi = createCrudApi<SysOperlog>('/monitor/operlog')

/** 登录日志 */
export const logininforCrudApi = createCrudApi<SysLogininfor>('/monitor/logininfor')

/**
 * 清空操作日志。
 *
 * RuoYi 把「清空」也做成了 DELETE：`/monitor/operlog/clean`，
 * 权限点与删除相同（monitor:operlog:remove）。
 */
export function cleanOperlog() {
  return http.delete<void>('/monitor/operlog/clean')
}

/** 清空登录日志：`/monitor/logininfor/clean` */
export function cleanLogininfor() {
  return http.delete<void>('/monitor/logininfor/clean')
}

/**
 * 账户解锁。
 *
 * RuoYi 的登录失败计数存在 Redis（`pwd_err_cnt:<用户名>`），
 * 连续输错达到上限后账号会被锁一段时间 —— 这个接口就是清掉那个计数。
 * 适用于「用户确定是本人但被锁了」的场景。
 */
export function unlockLogininfor(userName: string) {
  return http.get<void>(`/monitor/logininfor/unlock/${encodeURIComponent(userName)}`)
}
