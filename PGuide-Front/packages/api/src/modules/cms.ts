/**
 * CMS（竞赛信息）接口 —— 对应后端 pguide-competition-manage 服务。
 * 网关路由前缀：/api/cms/**
 */

/** 学科树节点 */
export interface SubjectNode {
  subjectId: number
  subjectName: string
  /**
   * 层级，1 开始。
   *
   * ⚠️ 类型是 **string 而不是 number**，这是实测出来的：
   * 后端实体 `CmsSubjectDict.subjectLevel` 声明为 String（数据库列却是 int），
   * 所以接口返回的是 `"subjectLevel":"1"`（带引号的字符串）。
   *
   * 踩坑记录：第一版按 number 写的，导致 subjectLevel === 1 这种比较永远为 false，
   * 兜底逻辑变成死代码。比较层级时请用 `Number(node.subjectLevel)`。
   */
  subjectLevel: string
  parentId?: number
}

/**
 * 学科树接口的**原始**返回结构。
 *
 * ⚠️ 注意：后端返回的不是嵌套树，而是**按父 id 索引的邻接表**：
 *   {
 *     "0":  [ {subjectId:1,...}, {subjectId:2,...} ],   // 一级
 *     "1":  [ {subjectId:4,...} ],                      // subjectId=1 的子节点
 *     "4":  [ ... ]                                     // subjectId=4 的子节点
 *   }
 * 老工程 HomeBody.vue 就是按 `r.data[0]` 取一级、`allSearchBoxItems[id]` 取下一级拼的。
 */
export type SubjectAdjacencyList = Record<string, SubjectNode[]>

/** 转换成嵌套树，UI 层直接用这个 */
export interface SubjectTreeNode extends SubjectNode {
  children: SubjectTreeNode[]
}

export function buildSubjectTree(adjacency: SubjectAdjacencyList): SubjectTreeNode[] {
  const toNode = (node: SubjectNode): SubjectTreeNode => ({
    ...node,
    children: (adjacency[String(node.subjectId)] ?? []).map(toNode),
  })
  // 约定：0 这个 key 下挂的是一级节点
  return (adjacency['0'] ?? []).map(toNode)
}

/** 竞赛信息（cms_cpt_info） */
export interface CompetitionInfo {
  cptId: number
  cptName: string
  cptStartTime?: string
  cptEndTime?: string
  cptArea?: string
  cptSubject?: string
  orgId?: number
}
