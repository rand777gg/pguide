import { createCrudApi } from './crud'
import { http } from '../request'
import type { SysConfig, SysNotice, SysPost } from '../types'

/**
 * 系统管理里的三个补充模块：岗位、参数配置、通知公告。
 *
 * 都是 RuoYi 标准 Controller，路径与权限前缀一起列在这里：
 *
 *   SysPostController    /system/post     system:post:*
 *   SysConfigController  /system/config   system:config:*
 *   SysNoticeController  /system/notice   system:notice:*
 *
 * 老 ruoyi-ui 里对应的三个页面（`views/system/post`、`config`、`notice`）
 * 在 `20-ruoyi-vue-3.8.6-baseline.sql` 的菜单里**一直有入口**，
 * 但新前端之前没实现，点进去是占位页。
 */

/** 岗位 */
export const postCrudApi = createCrudApi<SysPost>('/system/post')

/**
 * 参数配置。
 *
 * 注意 `configType`：Y 表示系统内置，RuoYi 不允许删除内置参数
 * （后端 `SysConfigServiceImpl.checkConfigAllowed` 会拦），
 * 界面上用 tag 标出来，避免误删时才报错。
 */
export const configCrudApi = createCrudApi<SysConfig>('/system/config')

/** 清空参数缓存（改了配置值之后要手动刷，否则后端还读旧值） */
export function refreshConfigCache() {
  return http.delete<void>('/system/config/refreshCache')
}

/**
 * 通知公告。
 *
 * `SysNoticeController` **没有** /export —— 用 `exportable: false` 关掉导出能力，
 * 不然界面上会多一个点了就报错的按钮。
 */
export const noticeCrudApi = createCrudApi<SysNotice>('/system/notice', { exportable: false })
