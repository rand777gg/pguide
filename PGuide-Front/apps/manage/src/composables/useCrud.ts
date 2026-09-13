import { computed, reactive, ref, type Ref } from 'vue'
// Element Plus 的这两个是**函数式 API**，不能靠模板自动解析，必须显式引入。
// 从 `element-plus/es` 具名引入是可以被 tree-shaking 的；
// 而 `from 'element-plus'`（根入口 barrel）会把整个组件库拉进产物，
// 明确不要那样写（见 dev-manual/07）。
import { ElMessage, ElMessageBox } from 'element-plus/es'
import type { CrudApi } from '@/api'
import { RuoYiError } from '@/api'
import { buildExportFilename, saveBlobAsFile } from '@/utils/file'

/**
 * 通用 CRUD 组合式函数 —— 列表页的全部状态与行为。
 *
 * 存在的意义：PGuide-Manage 的业务模块全是 RuoYi 生成器产物，约定一致，
 * 所以「查询 + 分页 + 多选 + 新增/编辑弹窗 + 删除确认」这套逻辑
 * 只需要写一遍。页面文件因此可以缩到几十行配置。
 *
 * 老 ruoyi-ui 是每个页面各拷一份这套逻辑（67 个页面），
 * 改一个交互要改 67 处。
 */

export interface UseCrudOptions<T extends object> {
  /** 由 createCrudApi 生成的接口集合 */
  api: CrudApi<T>
  /** 主键字段名，用于选中、编辑、删除 */
  idKey: keyof T & string
  /** 搜索区初始条件（不含分页） */
  defaultQuery?: Record<string, QueryValue>
  /** 新增时的表单初值 */
  formDefaults?: () => Record<string, FormValue>
  /** 资源名，用于提示文案，如「项目」 */
  resourceName?: string
}

export interface CrudDialogState {
  visible: boolean
  isEdit: boolean
  title: string
}

/**
 * 查询条件。
 *
 * 索引签名定为 `string | number | undefined` 而不是 `unknown`：
 * 这些值会直接绑到 el-input / el-select / el-date-picker 的 v-model 上，
 * `unknown` 不可赋值给那些组件的 prop 类型，模板会报类型错误。
 * 而查询参数本来也只有字符串和数字两种（加 undefined 表示未填）。
 */
export interface CrudQuery {
  pageNum: number
  pageSize: number
  [key: string]: QueryValue
}

/**
 * 表单字段值。
 *
 * 只保留 `string | number | undefined`，刻意不含 `null` 和 `boolean`：
 * Element Plus 的表单组件 v-model 都不接受这两种
 * （el-date-picker 不接受 boolean、el-input 不接受 null），
 * 带上会让模板报类型错误。需要清空就赋 `undefined`；
 * 布尔语义的字段（如状态）项目里统一用 '0' / '1' 字符串表示。
 */
export type FormValue = string | number | undefined

/**
 * 查询条件的值类型。
 * 单独抽出来是因为 UseCrudOptions.defaultQuery 与 CrudQuery 的索引签名
 * 必须是同一个类型，否则 reset() 里 `query[key] = initial[key]` 会不可赋值。
 */
export type QueryValue = string | number | undefined

export function useCrud<T extends object>(options: UseCrudOptions<T>) {
  const { api, idKey, resourceName = '记录' } = options

  const loading = ref(false)
  const submitting = ref(false)
  const exporting = ref(false)
  const importing = ref(false)
  const list: Ref<T[]> = ref([]) as Ref<T[]>
  const total = ref(0)
  const selectedIds = ref<Array<number | string>>([])

  /** 接口层有没有导出能力（菜单/部门没有 /export，所以要看接口而不是看配置） */
  const canExport = computed(() => typeof api.exportFile === 'function')
  /** 同一份判断，导入同理 —— CrudPage 用它决定要不要渲染按钮 */
  const canImport = computed(() => typeof api.importFile === 'function')

  const query = reactive<CrudQuery>({
    pageNum: 1,
    pageSize: 10,
    ...options.defaultQuery,
  })

  const dialog = reactive<CrudDialogState>({ visible: false, isEdit: false, title: '' })
  const form: Ref<Record<string, FormValue>> = ref(options.formDefaults?.() ?? {})

  /** 把错误转成给用户看的提示 */
  function notifyError(error: unknown, fallback: string): void {
    if (error instanceof RuoYiError) {
      ElMessage.error(error.message || fallback)
      return
    }
    ElMessage.error(error instanceof Error ? error.message : fallback)
  }

  /** 查询列表 */
  async function load(): Promise<void> {
    loading.value = true
    try {
      const { total: t, rows } = await api.list({ ...query })
      list.value = rows as T[]
      total.value = t
    } catch (error) {
      notifyError(error, '查询失败')
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /** 点查询：回到第一页 */
  function search(): void {
    query.pageNum = 1
    void load()
  }

  /** 重置搜索条件。需要保留的字段（如固定字典类型）由 defaultQuery 给。 */
  function reset(): void {
    const initial = options.defaultQuery ?? {}
    for (const key of Object.keys(query)) {
      if (key === 'pageNum' || key === 'pageSize') continue
      query[key] = key in initial ? initial[key] : undefined
    }
    query.pageNum = 1
    void load()
  }

  function handleSelectionChange(rows: T[]): void {
    selectedIds.value = rows.map((row) => row[idKey] as number | string)
  }

  /** 打开新增弹窗 */
  function openAdd(): void {
    dialog.isEdit = false
    dialog.title = `新增${resourceName}`
    form.value = options.formDefaults?.() ?? {}
    dialog.visible = true
  }

  /** 打开编辑弹窗。会先把详情拉回来（列表接口通常不返回全部字段）。 */
  async function openEdit(row: T): Promise<void> {
    dialog.isEdit = true
    dialog.title = `修改${resourceName}`
    // 列表行是泛型 T，表单是宽松的键值袋，中间要过一次 unknown
    form.value = { ...row } as unknown as Record<string, FormValue>
    dialog.visible = true

    const id = row[idKey] as number | string
    try {
      const detail = await api.get(id)
      form.value = { ...detail } as unknown as Record<string, FormValue>
    } catch (error) {
      notifyError(error, '获取详情失败')
    }
  }

  /** 提交新增或修改 */
  async function submit(): Promise<boolean> {
    submitting.value = true
    try {
      if (dialog.isEdit) {
        await api.update(form.value as unknown as Partial<T>)
        ElMessage.success('修改成功')
      } else {
        await api.add(form.value as unknown as Partial<T>)
        ElMessage.success('新增成功')
      }
      dialog.visible = false
      await load()
      return true
    } catch (error) {
      notifyError(error, dialog.isEdit ? '修改失败' : '新增失败')
      return false
    } finally {
      submitting.value = false
    }
  }

  /** 删除（带二次确认）。不传参数时删除表格中已勾选的行。 */
  async function remove(ids?: Array<number | string>): Promise<void> {
    const target = ids ?? selectedIds.value
    if (target.length === 0) {
      ElMessage.warning(`请先选择要删除的${resourceName}`)
      return
    }

    try {
      await ElMessageBox.confirm(
        `确认删除选中的 ${target.length} 条${resourceName}吗？`,
        '提示',
        { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' },
      )
    } catch {
      // 用户取消，不是错误
      return
    }

    try {
      await api.remove(target)
      ElMessage.success('删除成功')
      selectedIds.value = []
      // 删完当前页可能空了，回退一页
      if (query.pageNum > 1 && list.value.length === target.length) {
        query.pageNum -= 1
      }
      await load()
    } catch (error) {
      notifyError(error, '删除失败')
    }
  }

  function handleSizeChange(size: number): void {
    query.pageSize = size
    query.pageNum = 1
    void load()
  }

  function handleCurrentChange(page: number): void {
    query.pageNum = page
    void load()
  }

  /**
   * 导出用的查询条件。
   *
   * 与列表条件一致，但**去掉 pageNum / pageSize**、丢掉空值：
   * 导出的是「符合条件的所有数据」而不是当前页，带上分页参数
   * 会让人以为导出受当前页限制（后端其实也不读这两个参数）。
   */
  function exportQuery(): Record<string, QueryValue> {
    const result: Record<string, QueryValue> = {}
    for (const [key, value] of Object.entries(query)) {
      if (key === 'pageNum' || key === 'pageSize') continue
      if (value === undefined || value === '') continue
      result[key] = value
    }
    return result
  }

  /** 导出当前查询结果为 Excel */
  async function exportData(): Promise<void> {
    if (!api.exportFile) {
      ElMessage.warning(`${resourceName}不支持导出`)
      return
    }

    exporting.value = true
    try {
      const blob = await api.exportFile(exportQuery())
      saveBlobAsFile(blob, buildExportFilename(resourceName))
      ElMessage.success('导出成功')
    } catch (error) {
      notifyError(error, '导出失败')
    } finally {
      exporting.value = false
    }
  }

  /** 下载导入模板 */
  async function downloadTemplate(): Promise<void> {
    if (!api.downloadTemplate) {
      ElMessage.warning(`${resourceName}不支持导入`)
      return
    }

    try {
      const blob = await api.downloadTemplate()
      saveBlobAsFile(blob, buildExportFilename(`${resourceName}导入模板`))
    } catch (error) {
      notifyError(error, '模板下载失败')
    }
  }

  /**
   * 导入 Excel。
   *
   * 成功返回后端给的文案（如「导入成功 3 条」），由调用方决定怎么展示；
   * 失败返回 null 并已给出错误提示 —— 让调用方只需处理「拿到文案」这一种情况。
   */
  async function importData(file: File, updateSupport: boolean): Promise<string | null> {
    if (!api.importFile) {
      ElMessage.warning(`${resourceName}不支持导入`)
      return null
    }

    importing.value = true
    try {
      const message = await api.importFile(file, updateSupport)
      // 导入会改动数据，列表要重新拉，否则用户看到的还是旧数据
      await load()
      return message
    } catch (error) {
      notifyError(error, '导入失败')
      return null
    } finally {
      importing.value = false
    }
  }

  return {
    // 状态
    loading,
    submitting,
    exporting,
    importing,
    list,
    total,
    selectedIds,
    query,
    dialog,
    form,
    // 能力
    canExport,
    canImport,
    // 行为
    load,
    search,
    reset,
    handleSelectionChange,
    openAdd,
    openEdit,
    submit,
    remove,
    handleSizeChange,
    handleCurrentChange,
    exportData,
    downloadTemplate,
    importData,
  }
}
