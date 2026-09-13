import { createCrudApi } from './crud'

/**
 * PGuide 业务模块接口。
 *
 * 路径与权限前缀都取自对应的 Controller（`pguide-back-manage` 下四个子模块）。
 * 因为全部是 RuoYi 生成器产物，这里用 `createCrudApi` 一行搞定一个模块。
 *
 * 新增业务模块时：先看 Controller 的 @RequestMapping 与 @PreAuthorize，
 * 然后把路径填到这里，前端页面就能用通用 CrudPage 渲染出来。
 */

// ---------------------------------------------------------------------------
// mms —— 项目匹配（pguide-back-mms-manage）
// ---------------------------------------------------------------------------

export interface MmsProjectInfo {
  projectId: number
  projectName: string
  projectTypeId?: number
  projectSubjectType?: string
  projectOpenLevel?: string
  projectStatusId?: number
  createTime?: string
  updateTime?: string
}

export interface MmsProjectDetailInfo {
  projectId: number
  projectIntroduction?: string
  projectDetails?: string
}

export interface MmsProjectMemberInfo {
  id?: number
  projectId: number
  memberId: number
  memberTypeId: number
}

export interface MmsProjectBelongInfo {
  belongId?: number
  projectId: number
  schoolId?: number
  academyId?: number
  orgId?: number
}

export interface MmsNeedRecruitInfo {
  recruitId: number
  projectId?: number
  recruitName?: string
  needTypeId?: number
  recruitStartTime?: string
  recruitEndTime?: string
  userId?: number
  recruitRw?: number
}

export interface MmsMemberTypeDict {
  memberTypeId: number
  memberTypeName: string
  memberTypeKey: string
}

export interface MmsNeedTypeDict {
  needTypeId: number
  needTypeName: string
}

/** 项目信息主表 */
export const mmsProjectApi = createCrudApi<MmsProjectInfo>('/manage/projectinfo')
/** 项目成员 */
export const mmsMemberApi = createCrudApi<MmsProjectMemberInfo>('/manage/memberinfo')
/** 项目归属（学校/学院/组织） */
export const mmsBelongApi = createCrudApi<MmsProjectBelongInfo>('/manage/belonginfo')
/** 招募需求 */
export const mmsRecruitApi = createCrudApi<MmsNeedRecruitInfo>('/manage/recruitinfo')
/** 成员类型字典 */
export const mmsMemberTypeApi = createCrudApi<MmsMemberTypeDict>('/manage/memtypedict')
/** 需求类型字典 */
export const mmsNeedTypeApi = createCrudApi<MmsNeedTypeDict>('/manage/needtypedict')

// ---------------------------------------------------------------------------
// cms —— 竞赛信息（pguide-back-cms-manage）
// ---------------------------------------------------------------------------

export interface CmsCptInfo {
  cptId: number
  cptName: string
  cptStartTime?: string
  cptEndTime?: string
  cptArea?: string
  cptSubject?: string
  orgId?: number
}

export interface CmsOrgDict {
  orgId: number
  orgName: string
  orgStartTime?: string
  orgParentId?: number
}

export interface CmsSubjectDict {
  subjectId: number
  subjectName: string
  /** 后端实体是 String（数据库列是 int），见 dev-manual/04 的说明 */
  subjectLevel?: string
  parentId?: number
}

export const cmsCompetitionApi = createCrudApi<CmsCptInfo>('/cmsmanage/cptinfo')
export const cmsOrgApi = createCrudApi<CmsOrgDict>('/cmsmanage/orgdict')
export const cmsSubjectApi = createCrudApi<CmsSubjectDict>('/cmsmanage/subjectdict')

// ---------------------------------------------------------------------------
// usercenter —— 学生 / 教师信息（pguide-back-user-manage）
// ---------------------------------------------------------------------------

export interface UsercenterStudentInfo {
  studentId: number
  studentName?: string
  studentNick?: string
  studentAccount?: string
  workId?: string
  studentSex?: string
  studentPhonenumber?: string
  studentEmail?: string
  studentSchool?: string
  studentAcademy?: string
  studentYear?: string
  studentProfession?: string
}

export interface UsercenterTeacherInfo {
  teacherId: number
  teacherName?: string
  teacherNick?: string
  workId?: string
  teacherAccount?: string
  teacherSex?: string
  teacherPhonenumber?: string
  teacherEmail?: string
  teacherUnit?: string
  teacherAcademy?: string
  teacherProfession?: string
}

export const studentApi = createCrudApi<UsercenterStudentInfo>('/project/info/student')
export const teacherApi = createCrudApi<UsercenterTeacherInfo>('/project/info/teacher')
