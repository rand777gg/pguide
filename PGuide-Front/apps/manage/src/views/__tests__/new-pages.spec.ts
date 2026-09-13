import type * as ElementPlus from 'element-plus/es'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type * as ManageApi from '@/api'

/**
 * 新增五个页面的冒烟测试。
 *
 * 这五个页面（岗位、参数配置、通知公告、操作日志、登录日志）在
 * `20-ruoyi-vue-3.8.6-baseline.sql` 的菜单里一直有入口，
 * 但之前新前端没实现，点进去落到占位页。
 *
 * 这里不重复测 CrudPage 的内部行为（那在 components/__tests__ 里），
 * 只验证**每个页面的配置本身是对的**：
 *
 *   1. 组件能挂载（列定义/表单定义的字段名与真实实体对得上，类型检查之外再兜一层）
 *   2. 挂载后会去拉列表（说明 api 传对了）
 *   3. 导出/新增/删除按钮按预期出现（比如日志页不该有新增，公告页不该有导出）
 *
 * 顺带覆盖了「公告没有 /export」这个容易搞错的点。
 */

const messageError = vi.fn()
const messageSuccess = vi.fn()
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
    ElMessageBox: { confirm: (...args: unknown[]) => boxConfirm(...args) },
  }
})

/** 每个模块一个假的 CrudApi，记录调用 */
function fakeCrudApi() {
  return {
    list: vi.fn().mockResolvedValue({ total: 0, rows: [] }),
    get: vi.fn().mockResolvedValue({}),
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    exportFile: vi.fn().mockResolvedValue(new Blob(['x'])),
  }
}

const apis = {
  postCrudApi: fakeCrudApi(),
  configCrudApi: fakeCrudApi(),
  /** 公告关掉了导出：这里刻意不给 exportFile，与 createCrudApi({exportable:false}) 一致 */
  noticeCrudApi: (() => {
    const api = fakeCrudApi()
    return { ...api, exportFile: undefined }
  })(),
  operlogCrudApi: fakeCrudApi(),
  logininforCrudApi: fakeCrudApi(),
}

const cleanOperlog = vi.fn().mockResolvedValue(undefined)
const cleanLogininfor = vi.fn().mockResolvedValue(undefined)
const unlockLogininfor = vi.fn().mockResolvedValue(undefined)

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ManageApi>()
  return {
    ...actual,
    ...apis,
    // 页面用命名导入这些函数（与其它模块一致），所以这里也要在顶层提供
    cleanOperlog,
    cleanLogininfor,
    unlockLogininfor,
    monitorApi: { cleanOperlog, cleanLogininfor, unlockLogininfor },
  }
})

const PostPage = (await import('../system/post/index.vue')).default
const ConfigPage = (await import('../system/config/index.vue')).default
const NoticePage = (await import('../system/notice/index.vue')).default
const OperlogPage = (await import('../monitor/operlog/index.vue')).default
const LogininforPage = (await import('../monitor/logininfor/index.vue')).default

/** 页面里用的是与当前用户一致的权限字符串，测试里放行所有指令 */
const global = {
  plugins: [createPinia()],
  directives: { 'has-permi': {}, 'has-role': {} },
}

async function mountPage(component: unknown) {
  const wrapper = mount(component as never, { global })
  await flushPromises()
  return wrapper
}

function toolbarText(wrapper: Awaited<ReturnType<typeof mountPage>>): string {
  return wrapper.find('.crud-page__toolbar').text()
}

describe('岗位 / 参数 / 公告页面', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('岗位管理：渲染列、挂载即查询、有新增与导出', async () => {
    const wrapper = await mountPage(PostPage)

    expect(apis.postCrudApi.list).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('岗位编码')
    expect(wrapper.text()).toContain('岗位名称')
    expect(toolbarText(wrapper)).toContain('新增')
    expect(toolbarText(wrapper)).toContain('导出')
  })

  it('参数设置：搜索区带参数键名与创建时间区间', async () => {
    const wrapper = await mountPage(ConfigPage)

    expect(apis.configCrudApi.list).toHaveBeenCalledTimes(1)
    const search = wrapper.find('.crud-page__search')
    expect(search.text()).toContain('参数键名')
    expect(search.text()).toContain('创建时间')
    // 时间区间用的是日期选择器，不是输入框
    expect(search.find('.el-date-editor').exists()).toBe(true)
  })

  it('通知公告：没有导出按钮（SysNoticeController 没有 /export）', async () => {
    const wrapper = await mountPage(NoticePage)

    expect(apis.noticeCrudApi.list).toHaveBeenCalledTimes(1)
    expect(toolbarText(wrapper)).toContain('新增')
    expect(toolbarText(wrapper)).not.toContain('导出')
  })
})

describe('操作日志 / 登录日志页面', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    boxConfirm.mockResolvedValue('confirm')
  })

  it('操作日志：只读页面，保留删除与导出，没有新增/修改', async () => {
    const wrapper = await mountPage(OperlogPage)

    expect(apis.operlogCrudApi.list).toHaveBeenCalledTimes(1)
    const toolbar = toolbarText(wrapper)
    expect(toolbar).not.toContain('新增')
    expect(toolbar).toContain('删除')
    expect(toolbar).toContain('导出')
    expect(wrapper.text()).not.toContain('修改')
  })

  it('操作日志：搜索区能按模块、业务类型、操作时间筛选', async () => {
    const wrapper = await mountPage(OperlogPage)

    const search = wrapper.find('.crud-page__search').text()
    expect(search).toContain('模块')
    expect(search).toContain('业务类型')
    expect(search).toContain('操作时间')
  })

  it('操作日志：点「清空」会二次确认，确认后调接口并刷新列表', async () => {
    const wrapper = await mountPage(OperlogPage)
    apis.operlogCrudApi.list.mockClear()

    const cleanButton = wrapper
      .findAll('.crud-page__toolbar button')
      .find((b) => b.text().includes('清空'))
    expect(cleanButton).toBeDefined()

    await cleanButton!.trigger('click')
    await flushPromises()

    expect(boxConfirm).toHaveBeenCalled()
    expect(cleanOperlog).toHaveBeenCalledTimes(1)
    expect(messageSuccess).toHaveBeenCalledWith('清空成功')
    expect(apis.operlogCrudApi.list).toHaveBeenCalledTimes(1)
  })

  it('操作日志：用户在确认框点取消时不清空', async () => {
    boxConfirm.mockRejectedValue('cancel')
    const wrapper = await mountPage(OperlogPage)

    const cleanButton = wrapper
      .findAll('.crud-page__toolbar button')
      .find((b) => b.text().includes('清空'))
    await cleanButton!.trigger('click')
    await flushPromises()

    expect(cleanOperlog).not.toHaveBeenCalled()
    expect(messageError).not.toHaveBeenCalled()
  })

  it('登录日志：每行有「解锁」按钮，点了会调解锁接口', async () => {
    apis.logininforCrudApi.list.mockResolvedValue({
      total: 1,
      rows: [{ infoId: 1, userName: 'perm_test', status: '1', msg: '密码错误' }],
    })
    const wrapper = await mountPage(LogininforPage)

    // ⚠️ 必须限定在 .el-table__row 里找：Element Plus 对固定列（fixed="right"）
    // 会额外渲染一份「隐藏列」（div.hidden-columns）用于测量宽度，
    // 那份里的行数据是空的，直接 findAll('button') 会先拿到它 ——
    // 表现就是「点了解锁但什么都没发生」。
    const unlockButton = wrapper
      .findAll('.el-table__row button')
      .find((b) => b.text().includes('解锁'))
    expect(unlockButton).toBeDefined()

    await unlockButton!.trigger('click')
    await flushPromises()

    expect(unlockLogininfor).toHaveBeenCalledWith('perm_test')
    expect(messageSuccess).toHaveBeenCalledWith('账号 perm_test 解锁成功')
  })

  it('登录日志：没有新增/修改，但有删除与导出', async () => {
    const wrapper = await mountPage(LogininforPage)

    const toolbar = toolbarText(wrapper)
    expect(toolbar).not.toContain('新增')
    expect(toolbar).toContain('删除')
    expect(toolbar).toContain('导出')
    expect(wrapper.text()).not.toContain('修改')
  })
})
