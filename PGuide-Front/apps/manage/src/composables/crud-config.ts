/**
 * 配置驱动表格/表单的类型定义。
 *
 * 页面文件只写配置，不写模板逻辑 —— 这是把 67 个页面压缩到可维护规模的关键。
 *
 * 泛型约束用 `object` 而不是 `Record<string, unknown>`：
 * TypeScript 只给 **type alias** 隐式索引签名，**interface 没有**。
 * 我们的业务实体（MmsProjectInfo 等）都是 interface，
 * 用 `Record<string, unknown>` 会让它们全部不满足约束。
 */

/** Element Plus el-tag 支持的 type 取值 */
export type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

/** 表格列 + 搜索项 */
export interface CrudColumn<T extends object = Record<string, unknown>> {
  prop: keyof T & string
  label: string
  width?: number | string
  minWidth?: number | string
  /** 对齐 */
  align?: 'left' | 'center' | 'right'
  /**
   * 展示形式：
   *   text     纯文本
   *   tag      带颜色的标签（配合 dict 用）
   *   dict     按 dict 映射成文案
   *   datetime 时间（截断到秒）
   *   bool     0/1 或 Y/N 转成「是/否」
   */
  display?: 'text' | 'tag' | 'dict' | 'datetime' | 'bool'
  /** display 为 tag/dict 时的取值映射 */
  dict?: Array<{ label: string; value: string | number; tag?: TagType }>
  /** 是否出现在搜索区 */
  searchable?: boolean
  /** 搜索控件类型，默认 input */
  searchType?: 'input' | 'select' | 'daterange'
  /**
   * 搜索参数名（与字段名不同时才需要）。
   *
   * 最常见的场景是 RuoYi 的时间区间：后端读的是 `BaseEntity.params` 里的
   * `beginTime` / `endTime`，前端要发 `params[beginTime]` 这种键。
   * 展示用的 `prop`（如 `createTime`）和查询键并不相同。
   */
  searchKey?: string
  /** 区间搜索的结束参数名（searchType=daterange 时用） */
  searchKeyEnd?: string
  /** 搜索下拉的选项（searchType=select 时用） */
  searchOptions?: Array<{ label: string; value: string | number }>
  /** 搜索框占位文案 */
  placeholder?: string
}

/** 弹窗表单字段 */
export interface CrudFormField<T extends object = Record<string, unknown>> {
  prop: keyof T & string
  label: string
  type: 'input' | 'textarea' | 'number' | 'select' | 'radio' | 'datetime'
  options?: Array<{ label: string; value: string | number }>
  required?: boolean
  placeholder?: string
  /** 栅格宽度，默认 24（整行）；12 = 一行两列 */
  span?: number
  /** 只读（编辑时不允许改，比如主键） */
  readonly?: boolean
  /** 仅新增时出现 */
  onlyOnCreate?: boolean
  maxlength?: number
}
