/**
 * 用户相关类型。
 *
 * 对应后端：
 *   - PGuide-Back 的 `org.pguide.user.entity.vo.UserInfoVo`（存 Redis，token 换出来的就是这个）
 *   - `org.pguide.user.entity.UsercenterStudentInfo` / `UsercenterTeacherInfo`
 */

/** 用户所属组织（项目系统 / 云平台等），对应 `UserGroup` */
export interface UserGroup {
  groupName: string
  groupId: string
}

/**
 * 登录用户的会话信息。
 * 后端字段名以 `user` 为前缀，这里保持原样，避免前后端对不上。
 */
export interface UserInfoVo {
  userName: string
  userSchool: string
  userAccount: string
  userAcademy: string
  /**
   * 用户类型。取值见后端 `AuthConst.UserTypeConst`：
   *   student | teacher | spd-user
   */
  userType: string
  userId: number
  /** 学号 / 工号 */
  workId: string
  /** 年级（学生） */
  studentYear: string | null
  userGroup: UserGroup[] | null
}

/** 登录请求体，对应 `org.pguide.auth.controller.vo.LoginBody` */
export interface LoginBody {
  account: string
  password: string
  /** 系统类型，见 `AuthConst.SystemTypeConst`：pguide | spd */
  sysType: string
  /** 用户类型，见 `AuthConst.UserTypeConst` */
  userType: string
  /** 验证码 */
  code: string
  /** 验证码对应的 uuid */
  uuid: string
  redirectUrl?: string
}

/** 验证码响应（`GET /auth/getCaptch`） */
export interface CaptchaResult {
  uuid: string
  /** base64 编码的 jpg，可直接拼成 data:image/jpeg;base64, */
  img: string
}
