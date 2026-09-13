import { http } from '../request'

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
}

export function createCrudApi<T extends object>(basePath: string): CrudApi<T> {
  return {
    list: (query) => http.page<T>(`${basePath}/list`, query),
    get: (id) => http.get<T>(`${basePath}/${id}`),
    add: (data) => http.post<void>(basePath, data),
    update: (data) => http.put<void>(basePath, data),
    remove: (ids) => {
      const value = Array.isArray(ids) ? ids.join(',') : ids
      return http.delete<void>(`${basePath}/${value}`)
    },
  }
}

/**
 * 树形数据的 CRUD 工厂。
 *
 * 菜单、部门这类接口**不分页**：RuoYi 在服务端就把平铺结果拼成了树，
 * 直接返回 `{code, msg, data: [...]}`（不是 `{total, rows}`）。
 * 为了复用 CrudPage，这里把它适配成 `{total, rows}` 的形状 ——
 * total 取数组长度，CrudPage 树形模式下不显示分页，所以没有意义。
 */
export function createTreeCrudApi<T extends object>(
  basePath: string,
  listFn: (query: object) => Promise<T[]>,
): CrudApi<T> {
  return {
    list: async (query) => {
      const rows = await listFn(query)
      return { total: rows.length, rows }
    },
    get: (id) => http.get<T>(`${basePath}/${id}`),
    add: (data) => http.post<void>(basePath, data),
    update: (data) => http.put<void>(basePath, data),
    remove: (ids) => {
      const value = Array.isArray(ids) ? ids.join(',') : ids
      return http.delete<void>(`${basePath}/${value}`)
    },
  }
}
