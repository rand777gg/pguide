import { post } from '../http'

/**
 * 项目组队（MMS）接口 —— 对应后端 pguide-project-match 服务。
 * 网关路由前缀：/api/mms/**
 */

/**
 * 创建项目的提交体。
 *
 * 字段名严格对应后端 `MMSProjectCreatedController.checkBySys` 里读的
 * `org.pguide.project.match.controller.vo.ProjectCreatedVo`：
 *
 *   name       项目名（后端会查重）
 *   type       项目小类 / 竞赛偏好，必须能在 mms_project_type_info
 *              里按 (type, typeLevel) 精确命中一条
 *   typeLevel  项目等级：free（自由项目，平台审核）/ unfree（非自由项目，校方审核）
 *   school     学校
 *   academy    学院
 *   detail     项目简介
 *   subject    项目学科
 *   openLevel  开放级别
 */
export interface ProjectCreatedVo {
  name: string
  type: string
  typeLevel: ProjectTypeLevel
  school: string
  academy: string
  detail: string
  subject: string
  openLevel: ProjectOpenLevel
}

/** 项目等级。后端 mms_project_type_info.project_type_level */
export type ProjectTypeLevel = 'free' | 'unfree'

/** 开放级别 */
export type ProjectOpenLevel = 'public' | 'school' | 'academy' | 'private'

/**
 * 提交项目审核。
 * 后端会做三件事：查用户项目数上限（3）、查项目名是否重复、按字典校验项目类型。
 */
export function submitProjectForCheck(vo: ProjectCreatedVo) {
  return post<void>('/mms/create/student/project/check', vo)
}

/** 检查当前用户是否已达项目创建上限（3 个），进创建页时调用 */
export function checkProjectQuota() {
  return post<void>('/mms/create/check/max')
}

/** 非自由项目提交（需要校方审核） */
export function submitUnfreeProject() {
  return post<void>('/mms/create/check/unfree')
}
