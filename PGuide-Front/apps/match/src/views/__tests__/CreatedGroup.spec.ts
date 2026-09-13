import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { configureApi, ApiError } from '@pguide/api'
import type * as PguideApi from '@pguide/api'

/**
 * 创建队伍页的渲染测试。
 *
 * 这是整个 match 应用里**唯一同时具备真实交互和真实接口**的页面：
 * 三步流程 + 表单校验 + 类型联动 + 两个真实后端调用。
 * 其它页面要么是纯展示，要么数据是占位，所以这个页面最值得测。
 *
 * 断言尽量落在 DOM 状态变化上（步骤切换、按钮可用性），
 * 而不是 toast 文案 —— ElMessage 是自动导入的，mock 它比较绕，
 * 而且断言"界面进入了下一步"比断言"弹了个提示"更贴近真实行为。
 */

const checkProjectQuota = vi.fn()
const submitProjectForCheck = vi.fn()

vi.mock('@pguide/api', async (importOriginal) => {
  const actual = await importOriginal<typeof PguideApi>()
  return {
    ...actual,
    mmsApi: {
      ...actual.mmsApi,
      checkProjectQuota: () => checkProjectQuota(),
      submitProjectForCheck: (vo: unknown) => submitProjectForCheck(vo),
    },
  }
})

const CreatedGroup = (await import('@/views/user/CreatedGroup.vue')).default

async function mountPage() {
  configureApi({
    apiBaseUrl: 'http://test/api',
    authBaseUrl: 'http://test/api',
    selfUrl: 'http://test/',
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/user', name: 'userCenter', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(CreatedGroup, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return wrapper
}

/** 页面用 v-show 切换步骤，所以要通过可见性判断当前在第几步 */
function visibleStepText(wrapper: Awaited<ReturnType<typeof mountPage>>): string {
  const steps = wrapper.findAll('.created-group__step')
  return steps
    .filter((s) => s.attributes('style')?.includes('display: none') !== true)
    .map((s) => s.text())
    .join(' ')
}

describe('CreatedGroup 渲染与流程', () => {
  beforeEach(() => {
    checkProjectQuota.mockReset().mockResolvedValue(undefined)
    submitProjectForCheck.mockReset().mockResolvedValue(undefined)
    window.localStorage.clear()
  })

  it('挂载后进入第一步并调用额度检查接口', async () => {
    const wrapper = await mountPage()

    expect(checkProjectQuota).toHaveBeenCalledTimes(1)
    const text = visibleStepText(wrapper)
    expect(text).toContain('可以创建项目')
    expect(text).toContain('开始填写')
  })

  it('额度已满时禁用「开始填写」并说明原因', async () => {
    checkProjectQuota.mockRejectedValue(new ApiError(500, '超过项目创建上限'))

    const wrapper = await mountPage()

    const text = visibleStepText(wrapper)
    expect(text).toContain('无法创建新项目')
    expect(text).toContain('超过项目创建上限')

    const startButton = wrapper.findAll('button').find((b) => b.text().includes('开始填写'))
    expect(startButton?.attributes('disabled')).toBeDefined()
  })

  it('点「开始填写」切到表单步骤，渲染出全部字段', async () => {
    const wrapper = await mountPage()

    const startButton = wrapper.findAll('button').find((b) => b.text().includes('开始填写'))
    await startButton!.trigger('click')
    await flushPromises()

    const text = visibleStepText(wrapper)
    expect(text).toContain('项目名称')
    expect(text).toContain('项目等级')
    expect(text).toContain('项目方向')
    expect(text).toContain('学校')
    expect(text).toContain('学院')
    expect(text).toContain('学科')
    expect(text).toContain('开放状态')
    expect(text).toContain('项目描述')
  })

  it('提交时把表单字段按后端约定发出去', async () => {
    const wrapper = await mountPage()
    ;(wrapper.findAll('button').find((b) => b.text().includes('开始填写'))!).trigger('click')
    await flushPromises()

    // 直接改组件内部状态比逐个驱动 el-input 稳（Element Plus 的 v-model 事件链较长）
    const vm = wrapper.vm as unknown as {
      form: Record<string, string>
    }
    vm.form.name = '基于深度学习的校园垃圾分类识别'
    vm.form.school = '示例大学'
    vm.form.academy = '计算机学院'
    vm.form.detail = '一个用于演示的项目简介'
    vm.form.subject = '人工智能'
    vm.form.openLevel = 'public'
    await flushPromises()

    ;(wrapper.findAll('button').find((b) => b.text().includes('提交审核'))!).trigger('click')
    await flushPromises()

    expect(submitProjectForCheck).toHaveBeenCalledTimes(1)
    expect(submitProjectForCheck).toHaveBeenCalledWith({
      name: '基于深度学习的校园垃圾分类识别',
      // 默认等级是 free，方向取 PROJECT_TYPES.free 的第一个
      type: '数学建模',
      typeLevel: 'free',
      school: '示例大学',
      academy: '计算机学院',
      detail: '一个用于演示的项目简介',
      subject: '人工智能',
      openLevel: 'public',
    })
  })

  it('提交成功后进入第三步', async () => {
    const wrapper = await mountPage()
    ;(wrapper.findAll('button').find((b) => b.text().includes('开始填写'))!).trigger('click')
    await flushPromises()

    const vm = wrapper.vm as unknown as { form: Record<string, string> }
    vm.form.name = '测试项目'
    await flushPromises()

    ;(wrapper.findAll('button').find((b) => b.text().includes('提交审核'))!).trigger('click')
    await flushPromises()

    expect(visibleStepText(wrapper)).toContain('提交成功')
  })

  it('提交失败时留在表单步骤，不假装成功', async () => {
    submitProjectForCheck.mockRejectedValue(new ApiError(500, '项目名已存在'))

    const wrapper = await mountPage()
    ;(wrapper.findAll('button').find((b) => b.text().includes('开始填写'))!).trigger('click')
    await flushPromises()

    const vm = wrapper.vm as unknown as { form: Record<string, string> }
    vm.form.name = '重名项目'
    await flushPromises()

    ;(wrapper.findAll('button').find((b) => b.text().includes('提交审核'))!).trigger('click')
    await flushPromises()

    const text = visibleStepText(wrapper)
    expect(text).not.toContain('提交成功')
    // 仍在表单步骤，用户可以直接改完再提交
    expect(text).toContain('项目名称')
  })

  it('项目名为空时本地就拦下，不发请求', async () => {
    const wrapper = await mountPage()
    ;(wrapper.findAll('button').find((b) => b.text().includes('开始填写'))!).trigger('click')
    await flushPromises()

    ;(wrapper.findAll('button').find((b) => b.text().includes('提交审核'))!).trigger('click')
    await flushPromises()

    expect(submitProjectForCheck).not.toHaveBeenCalled()
  })

  /**
   * 类型联动是这里唯一的"业务规则"逻辑：
   * 后端按 (project_type_name, project_type_level) 精确匹配且必须命中恰好一条，
   * 所以切换等级后如果当前选中的方向在新等级里不存在，必须自动回退，
   * 否则提交会被后端拒绝（"项目竞赛类别有误"）。
   */
  it('切换项目等级时，不合法已选方向会自动回退到该等级的第一个', async () => {
    const wrapper = await mountPage()
    ;(wrapper.findAll('button').find((b) => b.text().includes('开始填写'))!).trigger('click')
    await flushPromises()

    const vm = wrapper.vm as unknown as { form: Record<string, string>; typeLevel: string; type: string }

    // free 等级下选「创新实验」（只在 free 里存在）
    vm.type = '创新实验'
    await flushPromises()
    expect(vm.type).toBe('创新实验')

    // 切到 unfree —— 「创新实验」不在 unfree 的候选里，应自动回退
    vm.typeLevel = 'unfree'
    await flushPromises()
    expect(vm.type).toBe('数学建模')
  })
})
