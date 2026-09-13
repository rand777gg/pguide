/**
 * 鉴权相关常量。
 *
 * 值必须与后端 `org.pguide.common.security.constant.AuthConst` 保持一致，
 * 改了要两边一起改。
 */

/** 系统类型，对应 `AuthConst.SystemTypeConst` */
export const AUTH_SYSTEM_TYPE = {
  /** 项导主站 */
  PGUIDE: 'pguide',
  /** SPD 云平台 */
  PGUIDE_SPD: 'spd',
} as const

export type AuthSystemType = (typeof AUTH_SYSTEM_TYPE)[keyof typeof AUTH_SYSTEM_TYPE]

/** 用户类型，对应 `AuthConst.UserTypeConst` */
export const AUTH_USER_TYPE = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  SPD_USER: 'spd-user',
} as const

export type AuthUserType = (typeof AUTH_USER_TYPE)[keyof typeof AUTH_USER_TYPE]

/**
 * 用户类型的中文名，用于 UI 展示。
 *
 * 放在这里而不是各页面自己写，避免同类选项在不同页面文案不一致
 * （老工程里身份切换按钮的文案就是各处硬编码的）。
 */
export const AUTH_USER_TYPE_LABEL: Record<string, string> = {
  [AUTH_USER_TYPE.STUDENT]: '学生',
  [AUTH_USER_TYPE.TEACHER]: '教师',
  [AUTH_USER_TYPE.SPD_USER]: '云平台用户',
}

/**
 * 允许在本鉴权中心登录的用户类型。
 *
 * `spd-user` 不在其中：后端 `SubSystemSpdStrategy` 里写的是
 * "SPD系统暂未开放"，选它只会拿到一个 NPE（见该策略的 doAction）。
 * 与其让用户点了报错，不如不给这个选项。
 */
export const SELECTABLE_USER_TYPES: AuthUserType[] = [
  AUTH_USER_TYPE.STUDENT,
  AUTH_USER_TYPE.TEACHER,
]
