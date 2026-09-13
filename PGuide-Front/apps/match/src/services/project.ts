/**
 * 首页项目 / 需求列表服务。
 *
 * ⚠️ 重要说明：这两个列表目前返回的是**占位数据**，不是真实接口。
 *
 * 原因：后端目前没有对应接口。
 *   - `pguide-project-match` 只提供了创建项目的接口
 *     （/mms/create/student/project/check 等），没有"项目列表 / 需求列表"查询接口
 *   - 老工程的 HomeBody.vue 里这两块也是硬编码的
 *     （`infoCardItems` 10 条 `{infoCardId, InfoCardSchool:"cqmu"}`，
 *       `taskCards` 7 条 `{taskName:"b", taskDetail:"c", reward:"100"}`）
 *
 * 为什么仍然包一层 service 而不是把假数据写在组件里：
 *   后端接口一旦就绪，只需要把下面两个函数的实现换成真实调用，
 *   组件一行都不用改。这是老工程最缺的一层抽象。
 *
 * TODO(后端): 需要 `GET /mms/project/list`（分页 + 关键词 + 学科筛选）
 * TODO(后端): 需要 `GET /mms/recruit/list`（招募需求列表）
 */

export interface ProjectCard {
  id: number
  name: string
  school: string
  academy: string
  /** 项目方向，对应 mms_project_type_info.project_type_name */
  subject: string
  /** 已招募 / 目标人数 */
  memberCount: number
  memberTarget: number
}

export interface RecruitCard {
  id: number
  name: string
  detail: string
  /** 奖励积分（后端字段 recruit_rw 语义待确认） */
  reward: number
  deadline: string | null
}

/** 是否是占位数据（UI 上会显示"示例数据"角标，避免误导） */
export const IS_PLACEHOLDER_DATA = true

const MOCK_PROJECTS: ProjectCard[] = [
  {
    id: 1,
    name: '基于深度学习的校园垃圾分类识别',
    school: '示例大学',
    academy: '计算机学院',
    subject: '创新实验',
    memberCount: 2,
    memberTarget: 5,
  },
  {
    id: 2,
    name: '乡村振兴背景下的农产品电商平台',
    school: '示例大学',
    academy: '商学院',
    subject: '创新创业',
    memberCount: 3,
    memberTarget: 6,
  },
  {
    id: 3,
    name: '数学建模竞赛集训队',
    school: '示例大学',
    academy: '数学学院',
    subject: '数学建模',
    memberCount: 1,
    memberTarget: 3,
  },
  {
    id: 4,
    name: '智能车竞赛嵌入式控制系统',
    school: '示例大学',
    academy: '电子工程学院',
    subject: '电子设计',
    memberCount: 4,
    memberTarget: 5,
  },
]

const MOCK_RECRUITS: RecruitCard[] = [
  {
    id: 1,
    name: '招募前端开发',
    detail: '负责管理端页面开发，熟悉 Vue3 + TypeScript 优先',
    reward: 100,
    deadline: '2026-10-31',
  },
  {
    id: 2,
    name: '招募算法工程师',
    detail: '负责模型训练与调优，有 PyTorch 经验',
    reward: 150,
    deadline: '2026-11-15',
  },
  {
    id: 3,
    name: '招募 UI 设计',
    detail: '负责移动端视觉稿与设计规范',
    reward: 80,
    deadline: '2026-10-20',
  },
]

export async function loadHotProjects(limit = 8): Promise<ProjectCard[]> {
  // TODO(后端): 换成 mmsApi.fetchProjectList({ pageNum: 1, pageSize: limit })
  return Promise.resolve(MOCK_PROJECTS.slice(0, limit))
}

export async function loadRecruitDemands(limit = 8): Promise<RecruitCard[]> {
  // TODO(后端): 换成 mmsApi.fetchRecruitList({ pageNum: 1, pageSize: limit })
  return Promise.resolve(MOCK_RECRUITS.slice(0, limit))
}
