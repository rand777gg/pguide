import { get } from '../http'
import type { SubjectAdjacencyList, CompetitionInfo } from './cms'

/**
 * 竞赛信息 / 学科字典接口。
 * 后端：pguide-competition-manage，网关路由 /api/cms/**
 */

/** 学科分类树（邻接表结构，用 buildSubjectTree 转成嵌套树） */
export function fetchSubjectTree() {
  return get<SubjectAdjacencyList>('/cms/subject/tree')
}

/** 竞赛列表（分页） */
export function fetchCompetitionList(params?: { pageNum?: number; pageSize?: number }) {
  return get<{ total: number; rows: CompetitionInfo[] }>('/cms/cptinfo/list', params)
}
