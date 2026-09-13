import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { useTagsStore, type TagView } from '../tags'

/**
 * 多标签页 store 的测试。
 *
 * 两份数据容易搞混，所以这里把它们的**关系**也钉下来：
 * 关标签要顺手丢缓存，但「别的标签还在用同一个组件」时不能丢。
 */

function route(
  path: string,
  title: string,
  extra: { name?: string; fullPath?: string; noCache?: boolean; hidden?: boolean } = {},
): RouteLocationNormalizedLoaded {
  return {
    path,
    fullPath: extra.fullPath ?? path,
    name: extra.name ?? path.replace(/\W+/g, ''),
    meta: { title, noCache: extra.noCache, hidden: extra.hidden },
  } as unknown as RouteLocationNormalizedLoaded
}

describe('useTagsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始只有固定的「首页」标签', () => {
    const tags = useTagsStore()

    expect(tags.visitedViews.map((v) => v.title)).toEqual(['首页'])
    expect(tags.visitedViews[0]!.affix).toBe(true)
    expect(tags.cachedNames).toEqual([])
  })

  it('addView 追加标签并把名字放进缓存名单', () => {
    const tags = useTagsStore()

    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))

    expect(tags.visitedViews.map((v) => v.path)).toEqual(['/index', '/system/user'])
    expect(tags.cachedNames).toEqual(['SystemUser'])
  })

  it('重复进入同一个页面不会加出两个标签', () => {
    const tags = useTagsStore()

    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))
    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))

    expect(tags.visitedViews).toHaveLength(2)
    expect(tags.cachedNames).toEqual(['SystemUser'])
  })

  it('同一页面换了查询条件时更新 fullPath（点标签要回到当前条件）', () => {
    const tags = useTagsStore()

    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))
    tags.addView(
      route('/system/user', '用户管理', {
        name: 'SystemUser',
        fullPath: '/system/user?pageNum=3',
      }),
    )

    expect(tags.visitedViews).toHaveLength(2)
    expect(tags.visitedViews[1]!.fullPath).toBe('/system/user?pageNum=3')
  })

  it('meta.noCache 的页面不进缓存名单，但仍然有标签', () => {
    const tags = useTagsStore()

    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser', noCache: true }))

    expect(tags.visitedViews.map((v) => v.path)).toContain('/system/user')
    expect(tags.cachedNames).toEqual([])
  })

  it('hidden 的路由（如 /redirect）不进标签栏', () => {
    const tags = useTagsStore()

    tags.addView(route('/redirect/system/user', '跳转中', { name: 'Redirect', hidden: true }))

    expect(tags.visitedViews.map((v) => v.path)).toEqual(['/index'])
  })

  it('关闭标签会同时丢掉它的缓存', () => {
    const tags = useTagsStore()
    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))

    tags.removeView(tags.visitedViews[1]!)

    expect(tags.visitedViews.map((v) => v.path)).toEqual(['/index'])
    expect(tags.cachedNames).toEqual([])
  })

  it('固定标签关不掉（首页永远在）', () => {
    const tags = useTagsStore()
    const affix = tags.visitedViews[0] as TagView

    tags.removeView(affix)

    expect(tags.visitedViews.map((v) => v.path)).toEqual(['/index'])
  })

  it('还有别的标签用同一个组件名时，保留缓存', () => {
    const tags = useTagsStore()
    // 两个菜单指向同一个组件（sys_menu 可以这么配），路由名相同、路径不同
    tags.addView(route('/pguide/project', '项目管理', { name: 'MmsProject' }))
    tags.addView(route('/pguide/project-other', '项目（另一入口）', { name: 'MmsProject' }))

    tags.removeView(tags.visitedViews[1]!)

    expect(tags.cachedNames).toEqual(['MmsProject'])
  })

  it('removeView 返回剩下的标签，供调用方决定跳哪里', () => {
    const tags = useTagsStore()
    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))
    tags.addView(route('/system/role', '角色管理', { name: 'SystemRole' }))

    const rest = tags.removeView(tags.visitedViews[2]!)

    expect(rest.map((v) => v.path)).toEqual(['/index', '/system/user'])
  })

  it('removeOthers 保留固定标签与目标标签', () => {
    const tags = useTagsStore()
    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))
    tags.addView(route('/system/role', '角色管理', { name: 'SystemRole' }))
    tags.addView(route('/system/menu', '菜单管理', { name: 'SystemMenu' }))

    tags.removeOthers(tags.visitedViews[1]!)

    expect(tags.visitedViews.map((v) => v.path)).toEqual(['/index', '/system/user'])
    expect(tags.cachedNames).toEqual(['SystemUser'])
  })

  it('removeAll 只留下固定标签', () => {
    const tags = useTagsStore()
    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))
    tags.addView(route('/system/role', '角色管理', { name: 'SystemRole' }))

    tags.removeAll()

    expect(tags.visitedViews.map((v) => v.path)).toEqual(['/index'])
    expect(tags.cachedNames).toEqual([])
  })

  it('invalidate 即使标签还在也强制丢缓存（「刷新」用）', () => {
    const tags = useTagsStore()
    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))

    tags.invalidate('SystemUser')

    expect(tags.cachedNames).toEqual([])
    // 标签本身还在
    expect(tags.visitedViews.map((v) => v.path)).toContain('/system/user')
  })

  it('reset 回到初始状态（退出登录时用）', () => {
    const tags = useTagsStore()
    tags.addView(route('/system/user', '用户管理', { name: 'SystemUser' }))

    tags.reset()

    expect(tags.visitedViews.map((v) => v.title)).toEqual(['首页'])
    expect(tags.cachedNames).toEqual([])
  })
})
