import type * as ElementPlus from 'element-plus/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CrudApi } from '@/api'

/**
 * useCrud 的单元测试。
 *
 * 这是管理端最关键的一层：11 个业务页面全部建立在它之上。
 * 它一旦有问题，所有列表页一起坏 —— 所以值得把行为固定下来。
 *
 * ElMessage / ElMessageBox 是 element-plus 的函数式 API，
 * 这里替换成可断言的假实现，否则 remove() 的二次确认流程没法测。
 */

const messageSuccess = vi.fn()
const messageError = vi.fn()
const messageWarning = vi.fn()
const boxConfirm = vi.fn()

vi.mock('element-plus/es', async (importOriginal) => {
  const actual = await importOriginal<typeof ElementPlus>()
  return {
    ...actual,
    ElMessage: {
      success: (...args: unknown[]) => messageSuccess(...args),
      error: (...args: unknown[]) => messageError(...args),
      warning: (...args: unknown[]) => messageWarning(...args),
    },
    ElMessageBox: {
      confirm: (...args: unknown[]) => boxConfirm(...args),
    },
  }
})

const { useCrud } = await import('../useCrud')
const { RuoYiError } = await import('@/api')

interface Row extends Record<string, unknown> {
  id: number
  name: string
  status?: string
}

/**
 * 带 mock 能力的 CrudApi。
 *
 * 交叉类型是必要的：`CrudApi<Row>` 的方法是普通函数类型，
 * 而测试要调 `.mockResolvedValue()`；直接写 `A & B | A` 会被化简掉。
 */
type MockCrudApi = {
  list: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  add: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

/** 带导出/导入的接口（对应 createCrudApi 生成的对象） */
type MockFileApi = {
  exportFile: ReturnType<typeof vi.fn>
  importFile: ReturnType<typeof vi.fn>
  downloadTemplate: ReturnType<typeof vi.fn>
}

function makeApi(rows: Row[] = []): MockCrudApi & CrudApi<Row> {
  return {
    list: vi.fn().mockResolvedValue({ total: rows.length, rows }),
    get: vi.fn().mockResolvedValue({ id: 1, name: '详情名称' }),
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  } as unknown as MockCrudApi & CrudApi<Row>
}

/** 额外带 export / import 能力的接口（如 /system/user） */
function makeFileApi(rows: Row[] = []): MockCrudApi & MockFileApi & CrudApi<Row> {
  return {
    ...makeApi(rows),
    exportFile: vi.fn().mockResolvedValue(new Blob(['xlsx'], { type: 'application/vnd.ms-excel' })),
    importFile: vi.fn().mockResolvedValue('导入成功 2 条'),
    downloadTemplate: vi.fn().mockResolvedValue(new Blob(['tpl'])),
  } as unknown as MockCrudApi & MockFileApi & CrudApi<Row>
}

describe('useCrud', () => {
  beforeEach(() => {
    messageSuccess.mockReset()
    messageError.mockReset()
    messageWarning.mockReset()
    // 默认用户点了确认
    boxConfirm.mockReset().mockResolvedValue('confirm')
  })

  it('load 填充列表与总数', async () => {
    const api = makeApi([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ])
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })

    await crud.load()

    expect(crud.list.value).toHaveLength(2)
    expect(crud.total.value).toBe(2)
    expect(crud.loading.value).toBe(false)
    expect(api.list).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 })
  })

  it('load 失败时给出提示并清空列表，不把异常抛给调用方', async () => {
    const api = makeApi()
    api.list.mockRejectedValue(new RuoYiError(500, '服务异常'))
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })

    await expect(crud.load()).resolves.toBeUndefined()

    expect(crud.list.value).toEqual([])
    expect(crud.total.value).toBe(0)
    expect(messageError).toHaveBeenCalledWith('服务异常')
  })

  it('search 回到第一页后查询', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({ api, idKey: 'id' })
    crud.query.pageNum = 3

    crud.search()

    expect(crud.query.pageNum).toBe(1)
    await vi.waitFor(() => expect(api.list).toHaveBeenCalled())
  })

  it('reset 清空查询条件但保留 defaultQuery 里的固定值', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({
      api,
      idKey: 'id',
      defaultQuery: { status: '0' },
    })
    crud.query.name = '临时输入'
    crud.query.pageNum = 5

    crud.reset()

    expect(crud.query.name).toBeUndefined()
    // defaultQuery 里的值要保留（比如固定字典类型）
    expect(crud.query.status).toBe('0')
    expect(crud.query.pageNum).toBe(1)
  })

  it('handleSelectionChange 收集主键', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({ api, idKey: 'id' })

    crud.handleSelectionChange([
      { id: 7, name: 'x' },
      { id: 8, name: 'y' },
    ])

    expect(crud.selectedIds.value).toEqual([7, 8])
  })

  it('openAdd 使用 formDefaults 打开新增弹窗', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({
      api,
      idKey: 'id',
      resourceName: '项目',
      formDefaults: () => ({ status: '0' }),
    })

    crud.openAdd()

    expect(crud.dialog.visible).toBe(true)
    expect(crud.dialog.isEdit).toBe(false)
    expect(crud.dialog.title).toBe('新增项目')
    expect(crud.form.value).toEqual({ status: '0' })
  })

  it('openEdit 先用行数据填充，再用详情接口覆盖（列表接口字段往往不全）', async () => {
    const api = makeApi()
    api.get.mockResolvedValue({ id: 1, name: '详情名称', status: '1' })
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })

    await crud.openEdit({ id: 1, name: '列表里的名字' })

    expect(crud.dialog.isEdit).toBe(true)
    expect(crud.dialog.title).toBe('修改项目')
    expect(api.get).toHaveBeenCalledWith(1)
    expect(crud.form.value.name).toBe('详情名称')
    expect(crud.form.value.status).toBe('1')
  })

  it('新增成功：调 add、关弹窗、刷新列表', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })
    crud.openAdd()
    crud.form.value.name = '新项目'

    const ok = await crud.submit()

    expect(ok).toBe(true)
    expect(api.add).toHaveBeenCalledWith({ name: '新项目' })
    expect(api.update).not.toHaveBeenCalled()
    expect(crud.dialog.visible).toBe(false)
    expect(api.list).toHaveBeenCalled()
    expect(messageSuccess).toHaveBeenCalledWith('新增成功')
  })

  it('修改成功：调 update 而不是 add', async () => {
    const api = makeApi()
    // 注意 openEdit 会用详情接口的返回值**覆盖**行数据，
    // 所以这里要让 get 返回和行一致的主键，否则断言的是详情里的 id
    api.get.mockResolvedValue({ id: 5, name: '详情名称' })
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })
    await crud.openEdit({ id: 5, name: '旧名字' })
    crud.form.value.name = '新名字'

    await crud.submit()

    expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ id: 5, name: '新名字' }))
    expect(api.add).not.toHaveBeenCalled()
    expect(messageSuccess).toHaveBeenCalledWith('修改成功')
  })

  it('提交失败：弹窗保持打开，让用户能改完再提交', async () => {
    const api = makeApi()
    api.add.mockRejectedValue(new RuoYiError(500, '项目名已存在'))
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })
    crud.openAdd()
    crud.form.value.name = '重名'

    const ok = await crud.submit()

    expect(ok).toBe(false)
    expect(crud.dialog.visible).toBe(true)
    expect(messageError).toHaveBeenCalledWith('项目名已存在')
    expect(crud.submitting.value).toBe(false)
  })

  it('删除：没有选中时只提示，不发请求', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })

    await crud.remove()

    expect(messageWarning).toHaveBeenCalledWith('请先选择要删除的项目')
    expect(api.remove).not.toHaveBeenCalled()
  })

  it('删除：用户在确认框点取消时什么都不做', async () => {
    const api = makeApi()
    boxConfirm.mockRejectedValue('cancel')
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })
    crud.handleSelectionChange([{ id: 1, name: 'A' }])

    await crud.remove()

    expect(api.remove).not.toHaveBeenCalled()
    expect(messageError).not.toHaveBeenCalled()
  })

  it('删除成功：清空选中并刷新', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })
    crud.handleSelectionChange([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ])

    await crud.remove()

    expect(api.remove).toHaveBeenCalledWith([1, 2])
    expect(crud.selectedIds.value).toEqual([])
    expect(messageSuccess).toHaveBeenCalledWith('删除成功')
    expect(api.list).toHaveBeenCalled()
  })

  it('删完当前页只剩空页时回退一页', async () => {
    const rows: Row[] = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]
    const api = makeApi(rows)
    const crud = useCrud<Row>({ api, idKey: 'id' })
    await crud.load()
    crud.query.pageNum = 2
    // 第 2 页刚好有 2 条，且两条都被选中删除
    crud.handleSelectionChange(rows)

    await crud.remove()

    expect(crud.query.pageNum).toBe(1)
  })

  it('分页：改每页条数会回到第一页，翻页只改页码', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({ api, idKey: 'id' })
    crud.query.pageNum = 4

    crud.handleSizeChange(50)
    expect(crud.query.pageSize).toBe(50)
    expect(crud.query.pageNum).toBe(1)

    crud.handleCurrentChange(3)
    expect(crud.query.pageNum).toBe(3)
  })

  it('非 RuoYiError 的异常也能转成可读提示', async () => {
    const api = makeApi()
    api.list.mockRejectedValue(new Error('网络断了'))
    const crud = useCrud<Row>({ api, idKey: 'id' })

    await crud.load()

    expect(messageError).toHaveBeenCalledWith('网络断了')
  })
})

describe('useCrud 导出与导入', () => {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  let clickSpy: ReturnType<typeof vi.spyOn>

  /**
   * 抓取真正被点的那次下载的文件名。
   *
   * 返回值是个读取器而不是字符串：`click` 是**稍后**才发生的，
   * 直接返回变量会在点击前就读到空串。
   */
  function filenameCapture(): () => string {
    let name = ''
    clickSpy.mockImplementation(function (this: HTMLAnchorElement) {
      name = this.download
    })
    return () => name
  }

  beforeEach(() => {
    messageSuccess.mockReset()
    messageError.mockReset()
    messageWarning.mockReset()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    createObjectURL.mockClear()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('canExport / canImport 看接口有没有对应能力，而不是看页面配置', () => {
    const plain = useCrud<Row>({ api: makeApi(), idKey: 'id', resourceName: '菜单' })
    expect(plain.canExport.value).toBe(false)
    expect(plain.canImport.value).toBe(false)

    const full = useCrud<Row>({ api: makeFileApi(), idKey: 'id', resourceName: '用户' })
    expect(full.canExport.value).toBe(true)
    expect(full.canImport.value).toBe(true)
  })

  it('导出：用当前查询条件，但**不带分页参数**（导出的是全部命中数据）', async () => {
    const api = makeFileApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })
    crud.query.name = '甲'
    crud.query.pageNum = 3
    crud.query.pageSize = 20

    await crud.exportData()

    expect(api.exportFile).toHaveBeenCalledWith({ name: '甲' })
    expect(messageSuccess).toHaveBeenCalledWith('导出成功')
    expect(crud.exporting.value).toBe(false)
  })

  it('导出：空条件不带过去（空串在后端会成为多余的过滤条件）', async () => {
    const api = makeFileApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })
    crud.query.name = ''
    crud.query.status = '0'

    await crud.exportData()

    expect(api.exportFile).toHaveBeenCalledWith({ status: '0' })
  })

  it('导出：文件名是「资源名_时间戳.xlsx」', async () => {
    const api = makeFileApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '用户' })
    const readName = filenameCapture()

    await crud.exportData()

    expect(readName()).toMatch(/^用户_\d{14}\.xlsx$/)
    expect(createObjectURL).toHaveBeenCalled()
  })

  it('导出：接口没有导出能力时只提示，不报错', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '菜单' })

    await crud.exportData()

    expect(messageWarning).toHaveBeenCalledWith('菜单不支持导出')
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('导出失败：给出提示，不把异常抛给调用方', async () => {
    const api = makeFileApi()
    api.exportFile.mockRejectedValue(new RuoYiError(500, '导出数据量过大'))
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '用户' })

    await expect(crud.exportData()).resolves.toBeUndefined()

    expect(messageError).toHaveBeenCalledWith('导出数据量过大')
    expect(crud.exporting.value).toBe(false)
  })

  it('下载模板：保存成「资源名导入模板_时间戳.xlsx」', async () => {
    const api = makeFileApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '用户' })
    const readName = filenameCapture()

    await crud.downloadTemplate()

    expect(api.downloadTemplate).toHaveBeenCalledTimes(1)
    expect(readName()).toMatch(/^用户导入模板_\d{14}\.xlsx$/)
  })

  it('导入成功：返回后端文案并刷新列表', async () => {
    const api = makeFileApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '用户' })
    const file = new File(['x'], 'users.xlsx')

    const message = await crud.importData(file, true)

    expect(api.importFile).toHaveBeenCalledWith(file, true)
    expect(message).toBe('导入成功 2 条')
    // 导入改了数据，列表必须重新拉
    expect(api.list).toHaveBeenCalled()
    expect(crud.importing.value).toBe(false)
  })

  it('导入失败：返回 null 并提示，弹窗由调用方决定是否关闭', async () => {
    const api = makeFileApi()
    api.importFile.mockRejectedValue(new RuoYiError(500, '第 3 行手机号格式错误'))
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '用户' })

    const message = await crud.importData(new File(['x'], 'users.xlsx'), false)

    expect(message).toBeNull()
    expect(messageError).toHaveBeenCalledWith('第 3 行手机号格式错误')
    // 失败不刷新列表
    expect(api.list).not.toHaveBeenCalled()
  })

  it('导入：接口不支持时返回 null 并提示', async () => {
    const api = makeApi()
    const crud = useCrud<Row>({ api, idKey: 'id', resourceName: '项目' })

    const message = await crud.importData(new File(['x'], 'a.xlsx'), false)

    expect(message).toBeNull()
    expect(messageWarning).toHaveBeenCalledWith('项目不支持导入')
  })
})
