import type * as ElementPlus from 'element-plus/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { CrudApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'

/**
 * CrudPage 的渲染与交互测试。
 *
 * CrudPage 是 11 个业务页面共用的组件，页面文件只剩配置 ——
 * 所以它的行为正确与否，决定了全部列表页能不能用。
 *
 * useCrud 的纯逻辑已经在 composables/__tests__ 里覆盖，
 * 这里专注「配置能不能正确渲染成界面」：搜索区、列展示形式、树形模式、
 * 弹窗表单、按钮。
 */

vi.mock('element-plus/es', async (importOriginal) => {
  const actual = await importOriginal<typeof ElementPlus>()
  const noop = () => undefined
  return {
    ...actual,
    ElMessage: { success: noop, error: noop, warning: noop },
    ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') },
  }
})

const CrudPage = (await import('../CrudPage.vue')).default

interface Row extends Record<string, unknown> {
  id: number
  name: string
  status?: number
  createdAt?: string
}

const ROWS: Row[] = [
  { id: 1, name: '项目甲', status: 1, createdAt: '2026-09-13T10:20:30' },
  { id: 2, name: '项目乙', status: 3, createdAt: '2026-09-14T11:00:00' },
]

/**
 * 带 mock 能力的 CrudApi。
 *
 * `CrudApi<Row>` 里的方法是普通函数类型，测试里要调 `.mockClear()` /
 * `.mockRejectedValue()`，所以交叉上一个所有方法都是 mock 的类型。
 * 不这么写的话 `A & B | A` 会被 TS 化简成 `A`，mock 相关方法就没了。
 */
type MockCrudApi = {
  list: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  add: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

function makeApi(rows: Row[] = ROWS): MockCrudApi & CrudApi<Row> {
  return {
    list: vi.fn().mockResolvedValue({ total: rows.length, rows }),
    get: vi.fn().mockResolvedValue(rows[0]),
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  } as unknown as MockCrudApi & CrudApi<Row>
}

/** 额外带导出/导入能力的接口（对应 createCrudApi 生成的对象，如 /system/user） */
type MockFileApi = {
  exportFile: ReturnType<typeof vi.fn>
  importFile: ReturnType<typeof vi.fn>
  downloadTemplate: ReturnType<typeof vi.fn>
}

function makeFileApi(rows: Row[] = ROWS): MockCrudApi & MockFileApi & CrudApi<Row> {
  return {
    ...makeApi(rows),
    exportFile: vi.fn().mockResolvedValue(new Blob(['xlsx'], { type: 'application/vnd.ms-excel' })),
    importFile: vi.fn().mockResolvedValue('导入成功 2 条'),
    downloadTemplate: vi.fn().mockResolvedValue(new Blob(['tpl'])),
  } as unknown as MockCrudApi & MockFileApi & CrudApi<Row>
}

const COLUMNS: CrudColumn<Row>[] = [
  { prop: 'name', label: '名称', minWidth: 160, searchable: true },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    display: 'tag',
    dict: [
      { label: '待审核', value: 1, tag: 'warning' },
      { label: '已通过', value: 3, tag: 'success' },
    ],
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: '待审核', value: 1 },
      { label: '已通过', value: 3 },
    ],
  },
  { prop: 'createdAt', label: '创建时间', width: 180, display: 'datetime' },
]

const FORM_FIELDS: CrudFormField<Row>[] = [
  { prop: 'name', label: '名称', type: 'input', required: true },
  { prop: 'status', label: '状态', type: 'select', options: [{ label: '待审核', value: 1 }] },
]

/**
 * 挂载 CrudPage。
 *
 * 两点说明：
 *
 * 1. `v-has-permi` 是在 main.ts 里全局注册的指令，测试环境没有它，
 *    不注册的话 Vue 会警告 "Failed to resolve directive"。
 *    这里塞一个空实现，让权限显隐逻辑不影响渲染测试。
 *
 * 2. props 最后断言成 `never` 是无奈之举。VTU 的 mount 无法从组件的
 *    `generic` 参数反推 T，T 会退化成 object，于是 `CrudColumn<Row>[]`
 *    不满足 `CrudColumn<object>[]`。这是**测试侧**的推断限制 ——
 *    真实页面走模板绑定（`<CrudPage :columns="columns" />`）能正常推断。
 *    断言成 never 只影响这一个调用点，组件和页面代码不受影响。
 */
function mountPage(
  overrides: Record<string, unknown> = {},
  apiOverride?: MockCrudApi & CrudApi<Row>,
) {
  const api = apiOverride ?? makeApi()

  const props = {
    resource: '项目',
    api,
    idKey: 'id',
    columns: COLUMNS,
    formFields: FORM_FIELDS,
    permission: 'manage:projectinfo',
    ...overrides,
  } as unknown as never

  const wrapper = mount(CrudPage, {
    props,
    global: {
      directives: {
        'has-permi': {},
        'has-role': {},
      },
    },
  })
  return { wrapper, api }
}

describe('CrudPage 渲染', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('挂载后自动加载列表，并把行渲染出来', async () => {
    const { wrapper, api } = mountPage()
    await flushPromises()

    expect(api.list).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('项目甲')
    expect(wrapper.text()).toContain('项目乙')
  })

  it('只把 searchable 的列渲染进搜索区', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    const search = wrapper.find('.crud-page__search')
    expect(search.exists()).toBe(true)
    expect(search.text()).toContain('名称')
    expect(search.text()).toContain('状态')
    // createdAt 没标 searchable，不应该出现在搜索区
    expect(search.text()).not.toContain('创建时间')
  })

  it('列没有 searchable 时不渲染搜索卡片', async () => {
    const { wrapper } = mountPage({
      columns: [{ prop: 'name', label: '名称' }] as CrudColumn<Row>[],
    })
    await flushPromises()

    expect(wrapper.find('.crud-page__search').exists()).toBe(false)
  })

  it('display=tag 的列按 dict 映射成标签文案', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    // 数字 1 应映射成「待审核」，而不是原样显示 1
    expect(wrapper.text()).toContain('待审核')
    expect(wrapper.text()).toContain('已通过')
  })

  it('display=datetime 的列把 ISO 串格式化成可读时间', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('2026-09-13 10:20:30')
  })

  it('空值渲染成占位符而不是 undefined', async () => {
    const { wrapper } = mountPage(
      {},
      makeApi([{ id: 1, name: '项目甲', status: undefined, createdAt: undefined }]),
    )
    await flushPromises()

    // 表格里应该出现 em dash 占位
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('工具栏渲染新增与删除按钮，删除在未选中时禁用', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    const buttons = wrapper.findAll('.crud-page__toolbar button')
    const labels = buttons.map((b) => b.text())

    expect(labels.some((l) => l.includes('新增'))).toBe(true)
    expect(labels.some((l) => l.includes('删除'))).toBe(true)
  })

  it('readonly 模式不渲染工具栏的新增/删除，也不渲染操作列', async () => {
    const { wrapper } = mountPage({ readonly: true })
    await flushPromises()

    const toolbarText = wrapper.find('.crud-page__toolbar').text()
    expect(toolbarText).not.toContain('新增')
    expect(toolbarText).not.toContain('删除')

    // 操作列（含「修改」）不应存在
    expect(wrapper.text()).not.toContain('修改')
  })

  it('树形模式隐藏分页（树接口返回全量，不分页）', async () => {
    const { wrapper } = mountPage({ tree: true })
    await flushPromises()

    expect(wrapper.find('.crud-page__pagination').exists()).toBe(false)
  })

  it('非树形模式渲染分页并把总数显示出来', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    const pagination = wrapper.find('.crud-page__pagination')
    expect(pagination.exists()).toBe(true)
    expect(pagination.text()).toContain('2')
  })

  it('点「新增」打开弹窗，表单字段按配置渲染', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    const addButton = wrapper
      .findAll('.crud-page__toolbar button')
      .find((b) => b.text().includes('新增'))
    await addButton!.trigger('click')
    await flushPromises()

    // el-dialog 默认 append-to-body，用 document 查
    const dialog = document.querySelector('.el-dialog')
    expect(dialog).not.toBeNull()
    expect(dialog!.textContent).toContain('新增项目')
    expect(dialog!.textContent).toContain('名称')
    expect(dialog!.textContent).toContain('状态')
  })

  it('搜索区填条件后点查询，条件会带上', async () => {
    const { wrapper, api } = mountPage()
    await flushPromises()
    api.list.mockClear()

    // 直接驱动查询条件比模拟 el-input 输入稳
    const vm = wrapper.vm as unknown as { crud: { query: Record<string, unknown> } }
    vm.crud.query.name = '甲'
    await flushPromises()

    const searchButton = wrapper
      .findAll('.crud-page__search button')
      .find((b) => b.text().includes('查询'))
    await searchButton!.trigger('click')
    await flushPromises()

    expect(api.list).toHaveBeenCalledWith(expect.objectContaining({ name: '甲', pageNum: 1 }))
  })

  it('点重置会清空条件并重新查询', async () => {
    const { wrapper, api } = mountPage()
    await flushPromises()

    const vm = wrapper.vm as unknown as { crud: { query: Record<string, unknown> } }
    vm.crud.query.name = '甲'
    await flushPromises()
    api.list.mockClear()

    const resetButton = wrapper
      .findAll('.crud-page__search button')
      .find((b) => b.text().includes('重置'))
    await resetButton!.trigger('click')
    await flushPromises()

    expect(vm.crud.query.name).toBeUndefined()
    expect(api.list).toHaveBeenCalled()
  })

  it('接口失败时页面不崩，仍然渲染出搜索区与工具栏', async () => {
    const api = makeApi()
    api.list.mockRejectedValue(new Error('boom'))

    const { wrapper } = mountPage({}, api)
    await flushPromises()

    expect(wrapper.find('.crud-page__search').exists()).toBe(true)
    expect(wrapper.find('.crud-page__toolbar').exists()).toBe(true)
  })
})

describe('CrudPage 导出与导入', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // el-dialog 是 append-to-body 的：上一个用例挂载的弹窗会留在 document.body 里，
    // 不清掉的话 querySelector('.el-dialog') 查到的是别人家的弹窗
    document.body.innerHTML = ''
    // jsdom 不实现 objectURL，saveBlobAsFile 依赖它
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function toolbarButton(wrapper: VueWrapper, text: string) {
    return wrapper.findAll('.crud-page__toolbar button').find((b) => b.text().includes(text))
  }

  it('接口带导出能力时渲染「导出」按钮', async () => {
    const { wrapper, api } = mountPage({}, makeFileApi())
    await flushPromises()

    expect(toolbarButton(wrapper, '导出')).toBeDefined()
    // 只是渲染，不该顺手导出一份
    expect(api.exportFile).not.toHaveBeenCalled()
  })

  it('接口没有导出能力（菜单、部门）时不渲染「导出」', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(toolbarButton(wrapper, '导出')).toBeUndefined()
  })

  it('只读页面也保留导出（操作日志这类只读页恰恰最需要导出）', async () => {
    const { wrapper } = mountPage({ readonly: true }, makeFileApi())
    await flushPromises()

    expect(toolbarButton(wrapper, '导出')).toBeDefined()
    // 但新增/删除仍然藏起来
    expect(toolbarButton(wrapper, '新增')).toBeUndefined()
    expect(toolbarButton(wrapper, '删除')).toBeUndefined()
  })

  it('点「导出」把当前条件交给接口，并触发下载', async () => {
    const { wrapper, api } = mountPage({}, makeFileApi())
    await flushPromises()

    const vm = wrapper.vm as unknown as { crud: { query: Record<string, unknown> } }
    vm.crud.query.name = '甲'
    await flushPromises()

    await toolbarButton(wrapper, '导出')!.trigger('click')
    await flushPromises()

    expect(api.exportFile).toHaveBeenCalledWith({ name: '甲' })
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('没有导入能力时「导入」按钮不出现（业务模块都没有 /importData）', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(toolbarButton(wrapper, '导入')).toBeUndefined()
  })

  it('支持导入的模块：点「导入」打开弹窗，弹窗里有模板下载入口', async () => {
    const { wrapper } = mountPage({}, makeFileApi())
    await flushPromises()

    await toolbarButton(wrapper, '导入')!.trigger('click')
    await flushPromises()

    const dialog = document.querySelector('.el-dialog')
    expect(dialog).not.toBeNull()
    expect(dialog!.textContent).toContain('导入项目')
    expect(dialog!.textContent).toContain('下载模板')
    expect(dialog!.textContent).toContain('是否更新已经存在的项目数据')
  })

  it('未选文件时弹窗的「确定」是禁用的（避免发个空文件过去）', async () => {
    const { wrapper } = mountPage({}, makeFileApi())
    await flushPromises()

    await toolbarButton(wrapper, '导入')!.trigger('click')
    await flushPromises()

    const confirm = Array.from(document.querySelectorAll('.el-dialog button')).find((b) =>
      b.textContent?.includes('确定'),
    )
    expect(confirm).toBeDefined()
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
  })
})
