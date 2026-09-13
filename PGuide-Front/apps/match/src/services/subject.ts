import { subjectApi, buildSubjectTree } from '@pguide/api'
import type { SubjectTreeNode } from '@pguide/api'

/**
 * 学科树服务。
 *
 * 把后端的**邻接表**结构转换成 UI 直接可用的**嵌套树**。
 * 转换逻辑放在这里而不是组件里，是因为老工程在 HomeBody.vue 里
 * 用 `r.data[0]`、`allSearchBoxItems[id]` 手工拼三级，既难读也难复用。
 */
export interface SubjectTreeResult {
  tree: SubjectTreeNode[]
  /** 扁平化后的节点列表，便于做搜索 */
  flat: SubjectTreeNode[]
}

function flatten(nodes: SubjectTreeNode[], acc: SubjectTreeNode[] = []): SubjectTreeNode[] {
  for (const node of nodes) {
    acc.push(node)
    if (node.children.length) flatten(node.children, acc)
  }
  return acc
}

export async function loadSubjectTree(): Promise<SubjectTreeResult> {
  const adjacency = await subjectApi.fetchSubjectTree()
  const tree = buildSubjectTree(adjacency)

  // 兜底：某些数据可能不带 parentId，只有一级节点的邻接表。
  // 若邻接表里没有 '0' 这个 key，就退化成用 level === 1 的节点当根。
  //
  // 注意 Number(...)：后端返回的 subjectLevel 是**字符串** "1"，
  // 直接写 === 1 永远是 false（这个坑实测踩过）。
  if (tree.length === 0) {
    const all = Object.values(adjacency).flat()
    const roots: SubjectTreeNode[] = all
      .filter((node) => Number(node.subjectLevel) === 1)
      .map((node) => ({ ...node, children: [] }))
    return { tree: roots, flat: roots }
  }

  return { tree, flat: flatten(tree) }
}
