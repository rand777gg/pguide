/**
 * @pguide/api —— 项导前端 API 层
 *
 * 设计要点：
 *   1. 两个 axios 实例：业务（带 token）与鉴权中心（可能 307 跳转），
 *      对应老工程里 request.js / loginRequest.js 的分工，但职责边界写清楚了。
 *   2. 响应统一拆壳：成功直接返回 `data`，失败抛带 code 的 `ApiError`。
 *      老工程让每个调用点自己写 `res.data.xxx`，且失败时拿不到 code。
 *   3. token 与会话失效回调由 app 注入（configureApi），
 *      本包不 import 任何 app 的 router / store。
 *
 * 用法：
 *   import { configureApi } from '@pguide/api'
 *   configureApi({ apiBaseUrl: import.meta.env.VITE_API_BASE_URL, ... })
 */

export { configureApi, getApiConfig, resetApiConfig } from './config'
export type { ApiConfig, AuthRedirectPayload, TokenExchangeResult } from './config'

export {
  ApiError,
  authRequest,
  clearToken,
  get,
  getAuthHttp,
  getHttp,
  getToken,
  post,
  request,
  setToken,
} from './http'

export * as authApi from './modules/auth'
export * as cmsApi from './modules/cms'
export * as subjectApi from './modules/subject'
export * as mmsApi from './modules/mms'

export {
  AUTH_REDIRECT_PATH,
  buildAuthRedirectUrl,
  parseAuthRedirectParams,
  toCaptchaDataUrl,
} from './modules/auth-redirect'
export type { AuthRedirectParams } from './modules/auth-redirect'
export type { SubSystemLoginBody, SubSystemLoginResult, ThirdPartyItem } from './modules/auth'

export { buildSubjectTree } from './modules/cms'
export type { SubjectAdjacencyList, SubjectNode, SubjectTreeNode, CompetitionInfo } from './modules/cms'
export type { ProjectCreatedVo, ProjectTypeLevel, ProjectOpenLevel } from './modules/mms'
