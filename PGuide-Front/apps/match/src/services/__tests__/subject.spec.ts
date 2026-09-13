import { beforeEach, describe, expect, it, vi } from 'vitest'
// 用顶层 `import type * as` 而不是内联 typeof import('...')：
// ESLint 的 @typescript-eslint/consistent-type-imports 禁止 import() 类型注解
import type * as PguideApi from '@pguide/api'
import type { SubjectAdjacencyList } from '@pguide/api'

/**
 * `loadSubjectTree` 的测试。
 *
 * 测的是**我们自己的 service 层**（`apps/match/src/services/subject.ts`），
 * 不是 `@pguide/api` 里的纯函数。重点覆盖它的兜底分支。
 *
 * 兜底分支存在的理由：`buildSubjectTree` 约定根节点挂在邻接表的 `'0'` 下，
 * 但线上数据不一定守这个约定。兜底逻辑按 `subjectLevel === 1` 找根节点。
 *
 * ⚠️ 这个文件专门守住一个实测踩到的坑：
 * 后端 `CmsSubjectDict.subjectLevel` 声明为 String（数据库列是 int），
 * 接口实际返回 `"subjectLevel": "1"`（字符串）。
 * 第一版写的是 `node.subjectLevel === 1`，永远为 false，
 * 兜底分支变成死代码 —— 而且 lint 和类型检查都不会报错。
 */

const fetchSubjectTree = vi.fn<() => Promise<SubjectAdjacencyList>>()

vi.mock('@pguide/api', async (importOriginal) => {
  const actual = await importOriginal<typeof PguideApi>()
  return {
    ...actual,
    subjectApi: {
      ...actual.subjectApi,
      fetchSubjectTree: () => fetchSubjectTree(),
    },
  }
})

// mock 必须在 import 被测模块之前生效，所以这里用动态 import
const { loadSubjectTree } = await import('../subject')

describe('loadSubjectTree', () => {
  beforeEach(() => {
    fetchSubjectTree.mockReset()
  })

  it('正常情况：邻接表有 0 号 key，直接转成嵌套树', async () => {
    fetchSubjectTree.mockResolvedValue({
      '0': [{ subjectId: 1, subjectName: '数学建模', subjectLevel: '1' }],
      '1': [{ subjectId: 4, subjectName: '算法', subjectLevel: '2' }],
    })

    const { tree, flat } = await loadSubjectTree()

    expect(tree).toHaveLength(1)
    expect(tree[0]!.children[0]!.subjectName).toBe('算法')
    // flat 应该是扁平的 2 个节点
    expect(flat.map((n) => n.subjectName)).toEqual(['数学建模', '算法'])
  })

  it('兜底：没有 0 号 key 时，用**字符串**层级 "1" 也能找出根节点', async () => {
    // 刻意没有 '0' 这个 key，会走兜底分支
    fetchSubjectTree.mockResolvedValue({
      '7': [
        { subjectId: 1, subjectName: '数学建模', subjectLevel: '1', parentId: 0 },
        { subjectId: 2, subjectName: '创新创业', subjectLevel: '1', parentId: 0 },
      ],
      '8': [{ subjectId: 4, subjectName: '算法', subjectLevel: '2', parentId: 1 }],
    })

    const { tree } = await loadSubjectTree()

    // 如果代码里写的是 === 1（数字比较），这里会是 []，测试失败
    expect(tree.map((n) => n.subjectName)).toEqual(['数学建模', '创新创业'])
  })

  it('空数据返回空数组，不抛错', async () => {
    fetchSubjectTree.mockResolvedValue({})

    const { tree, flat } = await loadSubjectTree()

    expect(tree).toEqual([])
    expect(flat).toEqual([])
  })
})
