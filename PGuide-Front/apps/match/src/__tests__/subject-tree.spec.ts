import { describe, expect, it } from 'vitest'
import { buildSubjectTree } from '@pguide/api'
import type { SubjectAdjacencyList } from '@pguide/api'

/**
 * 学科树转换的单元测试。
 *
 * 优先测这个函数的原因：它是全项目最容易搞错的一处 ——
 * 后端返回的**不是**嵌套树，而是按父 id 索引的**邻接表**：
 *   { '0': [一级...], '1': [subjectId=1 的子节点...], ... }
 * 老工程在组件里手工拼这个结构，没有任何测试，改错了也不会有提示。
 */
describe('buildSubjectTree', () => {
  it('把邻接表转成嵌套树', () => {
    const adjacency: SubjectAdjacencyList = {
      '0': [
        { subjectId: 1, subjectName: '数学建模', subjectLevel: 1 },
        { subjectId: 2, subjectName: '创新创业', subjectLevel: 1 },
      ],
      '1': [{ subjectId: 4, subjectName: '算法与程序', subjectLevel: 2 }],
      '4': [{ subjectId: 7, subjectName: '动态规划', subjectLevel: 3 }],
    }

    const tree = buildSubjectTree(adjacency)

    expect(tree).toHaveLength(2)
    expect(tree[0]!.subjectName).toBe('数学建模')
    expect(tree[0]!.children).toHaveLength(1)
    expect(tree[0]!.children[0]!.subjectName).toBe('算法与程序')
    // 三级
    expect(tree[0]!.children[0]!.children[0]!.subjectName).toBe('动态规划')
    // 没有子节点的分支是空数组，不是 undefined（模板里 v-if="node.children.length" 依赖这点）
    expect(tree[1]!.children).toEqual([])
  })

  it('没有根节点（0 号 key）时返回空数组', () => {
    expect(buildSubjectTree({})).toEqual([])
    expect(buildSubjectTree({ '1': [{ subjectId: 1, subjectName: 'x', subjectLevel: 1 }] })).toEqual(
      [],
    )
  })

  it('子节点引用了不存在的父 id 时不会抛错', () => {
    const adjacency: SubjectAdjacencyList = {
      '0': [{ subjectId: 1, subjectName: '父', subjectLevel: 1 }],
      // 这个 key 对应的节点不在 0 号列表里，属于脏数据
      '99': [{ subjectId: 100, subjectName: '孤儿', subjectLevel: 2 }],
    }

    const tree = buildSubjectTree(adjacency)

    expect(tree).toHaveLength(1)
    expect(tree[0]!.children).toEqual([])
  })
})
