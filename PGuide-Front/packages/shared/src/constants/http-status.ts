/**
 * 后端统一响应体。
 *
 * 对应 PGuide-Back 的 `org.pguide.common.core.result.JsonResult`：
 *   private Integer code; private String message; private T data;
 *
 * 注意后端约定和 HTTP 状态码是**两套东西**：
 * 业务失败时 HTTP 仍然是 200，靠 body 里的 code 判断。
 */
export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
}

/** 分页响应。后端由 PageHelper / MyBatis-Plus 分页产出。 */
export interface PageResult<T> {
  total: number
  rows: T[]
}

/** 后端 HttpStatus 常量（org.pguide.common.core.constant.HttpStatus）。 */
export const HTTP_STATUS = {
  SUCCESS: 200,
  ACCEPTED: 202,
  /** 需要跳转到统一鉴权中心换 token —— 本项目自定义的约定 */
  REDIRECT: 307,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_METHOD: 405,
  UNSUPPORTED_TYPE: 415,
  ERROR: 500,
  WARN: 601,
} as const

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]
