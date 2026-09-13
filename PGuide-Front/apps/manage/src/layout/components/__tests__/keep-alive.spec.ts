import { KeepAlive, defineComponent, h, nextTick, ref, type Component } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

/**
 * keep-alive 的匹配语义测试（AppMain 的缓存能不能生效就靠这个）。
 *
 * ── 为什么值得单独测 ──
 *
 * `<KeepAlive :include>` 是按**组件名**匹配的，而 `<script setup>` 的组件名
 * 默认从**文件名**推断 —— 我们的页面全叫 `index.vue`，推断出来都叫 "Index"。
 * 于是「include 里写路由名」这个看着没问题的写法，实际一个页面都缓存不住，
 * 而且不报任何错：只表现为「切走再切回来，查询条件和滚动位置全没了」。
 *
 * 这里用两个**合成组件**把两种情形都钉下来：
 *   - 注入了 name → include 命中 → 切走再切回来，setup 只跑一次
 *   - 没注入 → include 落空 → 每次回来都重新 setup
 *
 * 真实的注入在 `utils/dynamic-route.ts` 的 viewName / withName，
 * 那边的测试负责断言「解析出来的组件确实带了名字」，两边合起来才完整。
 */

interface Counter {
  mounts: number
}

/** 模拟 `<script setup>` 的编译结果：只有 __name（来自文件名），没有 name */
function makePage(label: string, counter: Counter): Component {
  return {
    __name: 'Index',
    setup() {
      counter.mounts += 1
      return () => h('div', label)
    },
  } as unknown as Component
}

/** 模拟 dynamic-route 的注入方式 */
function withInjectedName(component: Component, name: string): Component {
  return { ...(component as object), name } as Component
}

/**
 * 一个最小的「AppMain」：KeepAlive + 按当前页切换组件。
 * 与真实 AppMain 的差别只是把路由换成了 props，缓存语义完全一致。
 * 返回的 `include` 是响应式的，用来模拟「关标签时把组件名移出缓存名单」。
 */
function makeHarness(pageA: Component, pageB: Component, initialInclude: string[]) {
  const include = ref(initialInclude)

  const Harness = defineComponent({
    props: { current: { type: String, required: true } },
    setup(props) {
      return () =>
        h(
          KeepAlive,
          { include: include.value },
          { default: () => h(props.current === 'a' ? pageA : pageB) },
        )
    },
  })

  return { Harness, include }
}

describe('KeepAlive 的 include 按组件名匹配', () => {
  it('注入了 name 的组件会被缓存：切走再切回来 setup 只跑一次', async () => {
    const counterA: Counter = { mounts: 0 }
    const pageA = withInjectedName(makePage('A', counterA), 'SystemUser')
    const pageB = makePage('B', { mounts: 0 })

    const { Harness } = makeHarness(pageA, pageB, ['SystemUser'])
    const wrapper = mount(Harness, { props: { current: 'a' } })
    expect(counterA.mounts).toBe(1)

    await wrapper.setProps({ current: 'b' })
    await wrapper.setProps({ current: 'a' })

    expect(counterA.mounts).toBe(1)
    expect(wrapper.text()).toContain('A')
  })

  it('没注入 name（只有文件名推断出的 "Index"）时缓存不生效', async () => {
    const counterA: Counter = { mounts: 0 }
    // 这就是修复前的状态：include 里写的是 'SystemUser'，组件名却是 'Index'
    const pageA = makePage('A', counterA)
    const pageB = makePage('B', { mounts: 0 })

    const { Harness } = makeHarness(pageA, pageB, ['SystemUser'])
    const wrapper = mount(Harness, { props: { current: 'a' } })
    expect(counterA.mounts).toBe(1)

    await wrapper.setProps({ current: 'b' })
    await wrapper.setProps({ current: 'a' })

    // 名字对不上 → 每次回来都重建（用户看到的就是「筛选条件没了」）
    expect(counterA.mounts).toBe(2)
  })

  it('把组件名移出 include 后，缓存实例被丢弃（关标签即释放）', async () => {
    const counterA: Counter = { mounts: 0 }
    const pageA = withInjectedName(makePage('A', counterA), 'SystemUser')
    const pageB = makePage('B', { mounts: 0 })

    const { Harness, include } = makeHarness(pageA, pageB, ['SystemUser'])
    const wrapper = mount(Harness, { props: { current: 'a' } })
    await wrapper.setProps({ current: 'b' })
    expect(counterA.mounts).toBe(1)

    // 模拟关标签：tags store 把组件名从 cachedNames 里去掉，
    // KeepAlive 监听到 include 变化会把不再匹配的缓存实例清掉
    include.value = []
    await nextTick()
    await wrapper.setProps({ current: 'a' })

    expect(counterA.mounts).toBe(2)
  })
})
