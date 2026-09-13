import { download, http, upload } from '../request'

/**
 * 通用 CRUD 接口工厂。
 *
 * PGuide-Manage 的业务模块全部是 RuoYi 代码生成器的产物，
 * 约定完全一致（见 `MmsProjectInfoController`）：
 *
 *   GET    {base}/list            分页列表（TableDataInfo: {total, rows}）
 *   GET    {base}/{id}            详情
 *   POST   {base}                 新增
 *   PUT    {base}                 修改
 *   DELETE {base}/{ids}           删除（ids 逗号分隔）
 *   POST   {base}/export          导出 Excel（走 query 参数，返回二进制）
 *   权限   {perm}:list|query|add|edit|remove|export
 *
 * 所以一个模块只需要一行配置，不必写五遍样板。
 */
export interface CrudApi<T> {
  list: (query: object) => Promise<{ total: number; rows: T[] }>
  get: (id: number | string) => Promise<T>
  add: (data: Partial<T>) => Promise<void>
  update: (data: Partial<T>) => Promise<void>
  remove: (ids: number | string | Array<number | string>) => Promise<void>
  /**
   * 导出当前查询结果为 Excel。
   *
   * 只负责把 Blob 拿回来，**保存成文件由调用方做**
   * （见 `utils/file.ts` 的 saveBlobAsFile）——
   * api 层不碰 DOM，才好测。
   */
  exportFile?: (query: object) => Promise<Blob>
  /** 导入 Excel，返回后端给的导入结果文案（如「导入成功 3 条」） */
  importFile?: (file: File, updateSupport: boolean) => Promise<string>
  /** 下载导入模板 */
  downloadTemplate?: () => Promise<Blob>
}

export interface CrudApiOptions {
  /**
   * 是否提供导出接口，默认 true。
   *
   * RuoYi 生成器产物（含 pguide 业务模块）都有 `POST {base}/export`，
   * 但**通知公告没有**（`SysNoticeController` 里没有这个方法）。
   * 那种模块要显式关掉，否则界面上会多一个点了就报错的「导出」按钮。
   */
  exportable?: boolean
  /**
   * 是否提供导入接口。
   *
   * 默认关闭：RuoYi 只有 `SysUserController` 有 `/importData` 与 `/importTemplate`，
   * 其它模块即使打开也没有后端接口。
   */
  importable?: boolean
}

/** get / add / update / remove 这段是每个模块都一样的部分 */
function commonMethods<T extends object>(basePath: string): Pick<
  CrudApi<T>,
  'get' | 'add' | 'update' | 'remove'
> {
  return {
    get: (id) => http.get<T>(`${basePath}/${id}`),
    add: (data) => http.post<void>(basePath, data),
    update: (data) => http.put<void>(basePath, data),
    remove: (ids) => {
      const value = Array.isArray(ids) ? ids.join(',') : ids
      return http.delete<void>(`${basePath}/${value}`)
    },
  }
}

/** 导出：RuoYi 生成器产物都带 `POST {base}/export`（少数模块没有，用 exportable 关掉） */
function exportMethod<T extends object>(
  basePath: string,
  options: CrudApiOptions,
): Pick<CrudApi<T>, 'exportFile'> {
  if (options.exportable === false) return {}
  return { exportFile: (query) => download(`${basePath}/export`, query) }
}

/** 导入相关的接口只在配置了 importable 的模块上出现 */
function importMethods<T extends object>(
  basePath: string,
  options: CrudApiOptions,
): Pick<CrudApi<T>, 'importFile' | 'downloadTemplate'> {
  if (!options.importable) return {}

  return {
    importFile: async (file, updateSupport) => {
      const formData = new FormData()
      formData.append('file', file)
      const result = await upload(`${basePath}/importData`, formData, { updateSupport })
      return result.msg ?? '导入完成'
    },
    downloadTemplate: () => download(`${basePath}/importTemplate`),
  }
}

export function createCrudApi<T extends object>(
  basePath: string,
  options: CrudApiOptions = {},
): CrudApi<T> {
  return {
    list: (query) => http.page<T>(`${basePath}/list`, query),
    ...commonMethods<T>(basePath),
    ...exportMethod<T>(basePath, options),
    ...importMethods<T>(basePath, options),
  }
}

/**
 * 树形数据的 CRUD 工厂。
 *
 * 菜单、部门这类接口**不分页**：RuoYi 在服务端就把平铺结果拼成了树，
 * 直接返回 `{code, msg, data: [...]}`（不是 `{total, rows}`）。
 * 为了复用 CrudPage，这里把它适配成 `{total, rows}` 的形状 ——
 * total 取数组长度，CrudPage 树形模式下不显示分页，所以没有意义。
 *
 * 也**不带导出**：`SysMenuController` / `SysDeptController` 没有 `/export`
 * （对比 `SysRoleController` 是有的），接了也没用。
 */
export function createTreeCrudApi<T extends object>(
  basePath: string,
  listFn: (query: object) => Promise<T[]>,
  options: CrudApiOptions = {},
): CrudApi<T> {
  return {
    list: async (query) => {
      const rows = await listFn(query)
      return { total: rows.length, rows }
    },
    ...commonMethods<T>(basePath),
    ...importMethods<T>(basePath, options),
  }
}
