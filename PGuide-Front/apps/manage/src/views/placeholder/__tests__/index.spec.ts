import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PlaceholderView from '../index.vue'

/**
 * 兜底页的两种文案。
 *
 * 这个页面存在的意义就是「把问题显式说出来」，所以文案分错类等于没解决问题：
 *
 *   meta.unimplemented = true → 功能有意没做（代码生成器、定时任务…），
 *                               下一步是「要不要实现它」
 *   否则                       → sys_menu.component 写错了，
 *                               下一步是去菜单管理里改路径
 *
 * 两种情况在界面上必须一眼能分清。
 */

async function mountWithMeta(meta: Record<string, unknown>, path = '/some/path') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/some/path', component: PlaceholderView, meta }],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(PlaceholderView, { global: { plugins: [router] } })
  return wrapper
}

describe('未实现菜单的兜底页', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('已知未实现：说清「有意没做」并给出实现方式', async () => {
    const wrapper = await mountWithMeta({
      title: '代码生成',
      unimplemented: true,
      missingComponent: 'tool/gen/index',
    })

    const text = wrapper.text()
    expect(text).toContain('该功能尚未实现')
    expect(text).toContain('/some/path')
    expect(text).toContain('views/tool/gen/index.vue')
    expect(text).toContain('要实现它')
  })

  it('组件路径配错：提示去菜单管理改 sys_menu.component', async () => {
    const wrapper = await mountWithMeta({
      title: '某菜单',
      unimplemented: false,
      missingComponent: 'system/usre/index',
    })

    const text = wrapper.text()
    expect(text).toContain('菜单配置有误')
    expect(text).toContain('views/system/usre/index.vue')
    expect(text).toContain('sys_menu.component')
    // 不能把「配错了」说成「尚未实现」，那会让人以为只是没开发
    expect(text).not.toContain('该功能尚未实现')
  })

  it('没有 meta 信息时也能渲染（直接手敲 URL 进来）', async () => {
    const wrapper = await mountWithMeta({})

    expect(wrapper.text()).toContain('菜单配置有误')
    expect(wrapper.text()).toContain('/some/path')
  })
})
