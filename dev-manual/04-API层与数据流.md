# 04 · API 层与数据流

## 1. 铁律

> **组件里不允许出现 `axios`。**

数据流永远是这一条：

```
view  →  services/  →  packages/api  →  axios  →  网关  →  微服务
         (视图模型)      (接口定义)
```

| 层 | 位置 | 职责 |
|---|---|---|
| 视图 | `apps/match/src/views/` | 组合组件、处理交互、展示 |
| 视图模型 | `apps/match/src/services/` | 组合多个接口、结构转换、兜底数据 |
| 接口定义 | `packages/api/src/modules/` | URL、参数、响应类型 |
| 传输 | `packages/api/src/http.ts` | axios 实例、拦截器、错误类型 |

---

## 2. 后端响应约定（必须先理解这个）

后端 `JsonResult<T>` 的结构：

```json
{ "code": 200, "message": "操作成功", "data": { } }
```

**关键点：业务失败时 HTTP 状态码仍然是 200。** 必须看 body 里的 `code`。

| code | 含义 |
|---|---|
| 200 | 成功 |
| 202 | 成功（已接受） |
| 307 | **需要跳转统一鉴权中心**（不是 HTTP 307） |
| 400 / 401 / 403 / 404 / 405 / 415 | 各类错误 |
| 500 | 服务端异常 |
| 601 | 警告 |

### `ApiError`

`@pguide/api` 会把失败统一转成 `ApiError`：

```ts
import { ApiError } from '@pguide/api'

try {
  await mmsApi.submitProjectForCheck(vo)
} catch (error) {
  if (error instanceof ApiError) {
    error.code     // 后端业务码
    error.message  // 后端 message
    error.payload  // 原始响应体
  }
}
```

**不要用 `error.message.includes('xxx')` 判断错误类型** —— 后端改文案就失效。

### ⚠️ 实体类型声明 ≠ 接口实际返回

写类型时**必须以实测的响应体为准**，不能照抄后端实体类的字段类型。

真实案例（2026-09 实测）：`GET /api/cms/subject/tree` 返回

```json
{ "subjectId": 1, "subjectName": "数学建模", "subjectLevel": "1", "parentId": 0 }
```

注意 **`subjectLevel` 是字符串 `"1"`**，因为后端实体
`CmsSubjectDict.subjectLevel` 声明成了 `String`（而数据库列是 `int`）。

第一版前端按 `number` 定义，结果 `node.subjectLevel === 1` 永远为 false，
兜底分支成了死代码 —— **lint 和类型检查都不会报错**，
因为类型是我们自己写错的"权威来源"。

**做法**：

1. 新增接口时先 `curl` 一次真实响应，照着响应写类型
2. 类型来源可疑时用联合类型或宽松类型 + 注释说明，别硬断言
3. 为这类"格式不确定"的字段补一条测试（参考
   `apps/match/src/services/__tests__/subject.spec.ts`）

```bash
# 拿真实响应（token 从浏览器 localStorage 里取）
curl.exe -s "http://localhost:666/api/cms/subject/tree" -H "token: <token>"
```

---

## 3. 新增一个接口的完整流程

假设要加"查询项目列表"。

### 第 1 步：在 `packages/api/src/modules/` 里定义类型和函数

```ts
// packages/api/src/modules/mms.ts
import { get } from '../http'
import type { PageResult } from '@pguide/shared'

/** 项目列表项。字段名对应 mms_project_info 表 */
export interface ProjectListItem {
  projectId: number
  projectName: string
  projectTypeId: number
  projectStatusId: number
}

export interface ProjectListQuery {
  pageNum?: number
  pageSize?: number
  /** 学科筛选 */
  subject?: string
  keyword?: string
}

export function fetchProjectList(query: ProjectListQuery = {}) {
  return get<PageResult<ProjectListItem>>('/mms/project/list', query)
}
```

要点：
- **URL 不带 `/api` 前缀**。baseURL 已经包含了（开发是 `/api`，走 Vite 代理）
- 每个函数都显式写泛型 `get<T>`，让调用方有类型
- 参数类型单独定义，不要用 `any` 或匿名对象

### 第 2 步：在 `packages/api/src/index.ts` 里导出

```ts
export * as mmsApi from './modules/mms'
export type { ProjectListItem, ProjectListQuery } from './modules/mms'
```

### 第 3 步：需要转换就在 `services/` 里加一层

```ts
// apps/match/src/services/project.ts
import { mmsApi } from '@pguide/api'
import type { ProjectListItem } from '@pguide/api'

export interface ProjectCard {
  id: number
  name: string
  statusLabel: string
}

/** 把后端结构转成 UI 需要的结构 */
export async function loadHotProjects(limit = 8): Promise<ProjectCard[]> {
  const page = await mmsApi.fetchProjectList({ pageNum: 1, pageSize: limit })
  return page.rows.map((item) => ({
    id: item.projectId,
    name: item.projectName,
    statusLabel: STATUS_LABEL[item.projectStatusId] ?? '未知',
  }))
}
```

**为什么要转换而不是直接用后端结构？**
后端字段名是数据库风格（`project_id` → `projectId`），而且状态是 id 不是文案。
把这层转换关在 service 里，后端一旦改结构只改一个文件，
组件里的 `project.name` 不用动。

### 第 4 步：组件只调 service

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadHotProjects, type ProjectCard } from '@/services/project'

const projects = ref<ProjectCard[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    projects.value = await loadHotProjects()
  } finally {
    loading.value = false
  }
})
</script>
```

---

## 4. mock 数据怎么放

后端接口没就绪时，**不要**把假数据写在组件里。放在 service 里，
并且满足三个要求：

1. 导出 `IS_PLACEHOLDER_DATA = true` 常量，让 UI 能显示"示例数据"角标
2. 用 TODO 标清楚**谁来补这个接口**
3. 保持函数签名与真实实现完全一致，将来替换时组件不用改

参考 `apps/match/src/services/project.ts`：

```ts
/** 是否是占位数据（UI 上会显示"示例数据"角标，避免误导） */
export const IS_PLACEHOLDER_DATA = true

// TODO(后端): 需要 GET /mms/project/list（分页 + 关键词 + 学科筛选）
export async function loadHotProjects(limit = 8): Promise<ProjectCard[]> {
  return Promise.resolve(MOCK_PROJECTS.slice(0, limit))
}
```

这样做的好处是**假数据是可见的**。老工程把假数据直接写死在 `HomeBody.vue`
里，页面上看起来像真在跑，实际一个接口都没调。

---

## 5. 两个 axios 实例的区别

| | 业务实例 | 鉴权中心实例 |
|---|---|---|
| 导出 | `get` / `post` / `request` | `authRequest` |
| baseURL | `VITE_API_BASE_URL` | `VITE_AUTH_API_BASE_URL` |
| 注入 token | ✅ 请求头 `token` | ❌ 不注入 |
| 处理 307 跳转 | ❌ | ✅ 会整页跳转 |
| 处理 401 | ✅ 清 token + 触发 `onUnauthorized` | ❌ |

**什么时候用 `authRequest`**：只有当响应可能是 `code=307` 需要跳转时。
目前只有 `redirectToAuthCenter()` 一个。

其余接口（包括登录、换 token、验证码）都用普通的 `get` / `post`。

---

## 6. 配置注入

`packages/api` **不读 `import.meta.env`**，环境值由 app 注入：

```ts
// apps/match/src/api/setup.ts
export function setupApi(): void {
  configureApi({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    authBaseUrl: import.meta.env.VITE_AUTH_API_BASE_URL,
    selfUrl: import.meta.env.VITE_SELF_URL,
    onUnauthorized: () => { /* 清用户态 + 跳登录 */ },
    onRedirect: (url) => window.location.assign(url),
  })
}
```

**为什么这样设计：**

1. 共享包不应该绑定某个构建工具的环境变量机制（换成 Vitest 跑测试就没有 `import.meta.env`）
2. `window.location.assign` 这种副作用无法测试，做成可注入的回调后可以替换成 spy
3. `packages/api` 不 import 任何 app 的 router / store，删掉某个 app 它依然可用

**必须在 mount 之前调用 `setupApi()`**（见 `main.ts`），
否则第一次发请求会抛"尚未调用 configureApi()"。

---

## 7. 请求约定速查

| 项 | 约定 |
|---|---|
| URL 前缀 | 不写 `/api`，baseURL 已含 |
| token 头 | `token`（不是 `Authorization`，无 `Bearer`） |
| 超时 | 25 秒（与原后端慢查询容忍度对齐） |
| 分页参数 | `pageNum` / `pageSize`（PageHelper 约定） |
| 分页响应 | `{ total, rows }` |
| 开发代理 | `/api` → `http://localhost:666`（Vite proxy，见 `vite.config.ts`） |
| 生产前缀 | `/prod-api`，由 nginx 转发到网关 |
