# apps/manage · 项导管理后台

Vue 3 + Vite + TypeScript 重写版管理端，**替代 `PGuide-Manage/ruoyi-ui`**（Vue2 + Element UI）。

对接的是 **PGuide-Manage（RuoYi 3.8.6 单体，:8080）**，不是 PGuide-Back 微服务。

---

## 快速开始

```bash
cd PGuide-Front
pnpm install

# 先起 RuoYi 后端（在仓库根目录）
docker compose --profile manage up -d

pnpm dev:manage     # → http://localhost:81
```

默认账号 `admin` / `admin123`（来自 `docker/init/20-ruoyi-vue-3.8.6-baseline.sql`）。

---

## 为什么端口是 81、代理前缀是 /dev-api

本项目有两个后端，路径风格不同：

| | PGuide-Back（微服务网关） | PGuide-Manage（RuoYi 单体） |
|---|---|---|
| 接口前缀 | `/api/auth`、`/api/cms`… | 根路径：`/login`、`/system/user/list` |
| 响应体 | `{code, message, data}` | `{code, msg, data}` |
| 列表响应 | `{code, message, data:{rows}}` | `{code, msg, rows, total}` ← 平铺 |
| 认证头 | `token` | `Authorization: Bearer xxx` |
| 成功码 | 200 / 202 | 200 |

所以：

- 代理用 **`/dev-api`** 并**去掉前缀**后再转发（沿用 RuoYi 原有约定，部署脚本不用改）
- **不复用 `@pguide/api`**，本应用自带客户端 `src/api/request.ts`

> 老 `ruoyi-ui` 跑在 80 端口；这里用 **81**，避开 Windows 上 80 的常见占用。

---

## 目录结构

```
apps/manage/src/
├── api/
│   ├── request.ts         RuoYi 专用 axios 客户端（{code,msg,data} 与平铺分页）
│   ├── types.ts           RuoYi 实体类型（SysUser / SysRole / SysMenu / SysOperlog …）
│   └── modules/
│       ├── auth.ts        login / logout / getInfo / getRouters / captchaImage
│       ├── user.ts role.ts menu.ts dept.ts dict.ts
│       ├── system.ts      ★ 岗位 / 参数配置 / 通知公告
│       ├── monitor.ts     ★ 操作日志 / 登录日志 / 清空 / 账户解锁
│       ├── crud.ts        ★ createCrudApi / createTreeCrudApi 工厂
│       └── business.ts    ★ pguide 业务模块（mms / cms / usercenter），一行一个
├── components/
│   └── CrudPage.vue       ★ 配置驱动的完整列表页
├── composables/
│   ├── useCrud.ts         ★ 列表页的全部状态与行为
│   └── crud-config.ts     列 / 表单字段的类型定义
├── layout/                侧边栏 + 顶栏 + 主内容
├── router/index.ts        静态路由 + 动态路由守卫
├── stores/                user / permission / app
├── utils/
│   ├── dynamic-route.ts   ★ 菜单树 → vue-router 路由
│   ├── file.ts            ★ Blob 落盘 + 导出文件名（时间戳）
│   ├── query-range.ts     ★ 日期区间 ↔ RuoYi 的 params[beginTime]
│   └── menu-icon.ts       后端图标名 → Element Plus 图标（显式映射表）
└── views/                 页面（大多只有几十行配置）
```

---

## 核心设计：三层抽象把 67 个页面压下来

老 `ruoyi-ui` 的 `views/` 下有 **67 个 .vue 文件**，每个列表页都把
「查询表单 + 表格 + 分页 + 新增/编辑弹窗 + 删除确认」抄一遍。
改一个交互要改 67 处。

新工程把它拆成三层：

### 1. `createCrudApi` —— 接口工厂

RuoYi 生成的业务模块约定完全一致（见 `MmsProjectInfoController`）：

```
GET    {base}/list          分页列表
GET    {base}/{id}          详情
POST   {base}               新增
PUT    {base}               修改
DELETE {base}/{ids}         删除
POST   {base}/export        导出 Excel（query 参数，返回二进制）
权限   {perm}:list|query|add|edit|remove|export
```

所以一个模块一行：

```ts
export const mmsProjectApi = createCrudApi<MmsProjectInfo>('/manage/projectinfo')

// 只有 sys_user 有导入接口，多给一个开关
export const userCrudApi = createCrudApi<SysUser>('/system/user', { importable: true })
```

树形接口（菜单、部门，后端返回拼好的树、不分页）用 `createTreeCrudApi` ——
它**不带导出**，因为 `SysMenuController` / `SysDeptController` 也没有 `/export`。

### 2. `useCrud` —— 列表页的全部状态与行为

查询条件、分页、多选、弹窗开关、编辑前拉详情、删除二次确认、
删完回退一页……写一遍。**页面不再重复这些**。

### 3. `CrudPage` —— 配置驱动的页面组件

```vue
<CrudPage
  resource="项目"
  :api="businessApi.mmsProjectApi"
  id-key="projectId"
  permission="manage:projectinfo"
  :columns="columns"
  :form-fields="formFields"
/>
```

于是页面文件变成纯配置（`views/mms/project/index.vue` 约 60 行），
而且 `<script setup generic>` 会把 `columns[].prop` 约束成真实字段名 ——
写错字段名类型检查就报错。

### 什么时候不该用 CrudPage

- 表单有复杂联动 / 嵌套子表 → 直接用 `useCrud` + 自己写模板
- 完全不是 CRUD 的页面（监控大屏等）→ 正常写

`CrudPage` 提供 `toolbar` / `actions` / `form-extra` 三个插槽应付差异。

### 导出 / 导入是跟着接口走的

`CrudPage` 不靠页面配置决定要不要渲染「导出」「导入」，而是看**接口有没有那个方法**：

| 接口对象 | 导出按钮 | 导入按钮 |
|---|---|---|
| `createCrudApi(...)` | 有 | 只有 `{ importable: true }` 时才有（目前只有用户） |
| `createTreeCrudApi(...)` | 无 | 无 |

这样一来，「菜单页没有导出」这种事实只写在后端一处（`SysMenuController` 没有
`/export`），前端不用再抄一遍。

四个容易踩的点（都写在代码注释里，这里留个索引）：

1. **导出是 POST + query 参数**，不是 body；和 ruoyi-ui 的 `download()` 一致。
2. **后端不返回 `Content-Disposition`**（`ExcelUtil` 直接把字节写进响应流），
   文件名只能前端拼 → `用户_20260213153045.xlsx`，见 `utils/file.ts`。
3. **导出失败时后端返回 JSON**（状态码可能还是 200）。原样当文件下载，
   用户会得到一个名字像 Excel、打开报损坏的文件 ——
   所以 `request.ts` 的 `download()` 会嗅探 content-type，是 JSON 就抛 `RuoYiError`。
4. **上传不要手写 `Content-Type`**：boundary 由浏览器生成，手写会漏掉，
   后端报 `Current request is not a multipart request`。

导出走的是**当前查询条件、不带分页参数**（`pageNum` / `pageSize` 会被剔掉），
也就是「导出全部命中数据」，而不是「导出当前页」。

---

## 菜单是后端驱动的

RuoYi 的菜单存在 `sys_menu` 表里，`component` 字段写的是**前端组件路径**
（如 `mms/project/index`，相对于 `src/views/`，不带 `.vue`）。

流程：

```
登录 → GET /getInfo（用户/角色/权限）
     → GET /getRouters（菜单树）
     → buildRoutes() 转成路由 → router.addRoute()
     → 侧边栏直接遍历这份路由渲染
```

### 组件找不到时不会静默白屏

老 `ruoyi-ui` 的 `loadView` 找不到组件就返回 `undefined`，页面白屏且没有线索。

新版做了兜底：找不到就渲染占位页，并在界面上写明**缺哪个组件路径**，
控制台也有 `console.error`。详见 `src/utils/dynamic-route.ts`。

实测踩到的两个坑也写在那个文件里：

1. **`redirect: 'noRedirect'` 是哨兵值**，RuoYi 每个顶层目录都带。
   直接赋给 vue-router 会让它去找一个叫 `noRedirect` 的路由 → 点菜单白屏。
2. **后端菜单图标名是 RuoYi 自己的 SVG 名**（`system` / `peoples`），
   和 Element Plus 图标名对不上，必须显式映射（见 `utils/menu-icon.ts`）。
   顺带：不能用 `import * as Icons from '@element-plus/icons-vue'`，
   那会把 3.2MB 的全部图标打进产物。

### pguide 业务菜单

`20-ruoyi-vue-3.8.6-baseline.sql` 里**只有 RuoYi 自带菜单**，
老 `ruoyi-ui` 的 `views/manage`、`views/cmsmanage`、`views/usercenter`
这些页面实际上**没有任何入口**，等于死代码。

`docker/init/95-pguide-manage-menus.sql` 补上了这些菜单：

| 菜单 | 组件路径 | 权限前缀 |
|---|---|---|
| 项目管理 | `mms/project/index` | `manage:projectinfo` |
| 招募需求 | `mms/recruit/index` | `manage:recruitinfo` |
| 竞赛管理 | `cms/competition/index` | `manage:cptinfo` |
| 学科字典 | `cms/subject/index` | `manage:subjectdict` |
| 学生信息 | `usercenter/student/index` | `project:info` |
| 教师信息 | `usercenter/teacher/index` | `project:info` |

> ⚠️ **权限前缀 ≠ URL 前缀**。竞赛、学科的接口路径是 `/cmsmanage/*`，
> 权限串却是 `manage:*`；学生、教师的接口路径是 `/project/info/*`，
> 权限串是 `project:info:*`。权限串只能从 Controller 的 `@PreAuthorize` 抄，
> 从 URL 推是错的。

### 三份数据必须完全一致

同一个权限串出现在三个地方，**必须是同一个字符串**：

| 位置 | 例子 |
|---|---|
| 后端 `@PreAuthorize` | `@ss.hasPermi('manage:cptinfo:add')` |
| `sys_menu.perms`（95 脚本） | `manage:cptinfo:add` |
| 页面上的 `permission` | `permission="manage:cptinfo"` |

写不一致时的表现**极其阴险**：管理员有 `*:*:*` 所以一切正常，
普通角色却是「按钮全消失 + 接口 403」——要等分配了另一个角色才会暴露。
项目里真踩过两次（CMS 写成 `cmsmanage:*`、学生/教师写成 `project:info:student:*`）。

所以有 `src/__tests__/permission-catalog.spec.ts` 把这件事变成门禁：
以**后端 Java 源码为真值**，反向校验页面 `permission` 前缀、`business.ts`
的接口路径、菜单 SQL 的 `component` 路径。后端改了权限串，这个测试会指出
前端哪里没跟上（后端源码不在时会自动跳过这几条用例）。

### 学生与教师共用一套权限点

`UsercenterStudentInfoController` 与 `UsercenterTeacherInfoController` 的
`@PreAuthorize` 用的都是 `project:info:*`（代码生成时没改前缀，老 ruoyi-ui 也这么用），
于是「学生查询」这个权限点同时能查教师。要按学生/教师细分权限，得先改后端
两个 Controller 的 `@PreAuthorize`，再同步菜单 SQL 与页面上的 `permission`。

> 该脚本用 `INSERT IGNORE` 写，**可以重复执行**。docker 的 init 脚本只在数据卷
> 首次创建时跑一次，已有数据库手工补即可（重复执行不会覆盖你在界面上改过的菜单，
> 末尾的 UPDATE 段会把历史权限串修正成与后端一致）：
> ```bash
> docker exec -i -e MYSQL_PWD=pguide123 pguide-dev-mysql mysql -uroot --default-character-set=utf8mb4 \
>   < docker/init/95-pguide-manage-menus.sql
> ```

---

## 已实现 / 未实现

### 已实现（真实接口，完整增删改查）

系统管理：**用户（含导入）/ 角色 / 菜单（树） / 部门（树） / 字典类型 / 岗位 / 参数设置 / 通知公告**

系统监控：**操作日志 / 登录日志**

项导业务：**项目管理 / 招募需求 / 竞赛管理 / 学科字典 / 学生信息 / 教师信息**

除了菜单、部门、通知公告，其它页面都支持**导出 Excel** ——
这三个模块后端没有 `/export`，导出能力自动关掉（见前面「导出 / 导入是跟着接口走的」）。

### 日志类页面的两个特殊点

操作日志、登录日志是「只能看 + 能删 + 能导出」的页面，所以用
`hide-add` / `hide-edit` 而不是 `readonly`（后者会把删除一起藏掉）：

| 页面 | 新增 | 修改 | 删除 | 导出 | 特有操作 |
|---|---|---|---|---|---|
| 操作日志 | ✗ | ✗ | ✓ | ✓ | 清空（`/clean`） |
| 登录日志 | ✗ | ✗ | ✓ | ✓ | 清空、每行「解锁」 |

两个实现细节值得记一笔：

1. **时间区间搜索**用的是 RuoYi 的 `params[beginTime]` / `params[endTime]`
   （后端 `BaseEntity.params`），靠列配置的 `searchKey` / `searchKeyEnd` 指定 ——
   展示字段名（如 `operTime`）和查询键并不相同。
   日期只选到天时结束值会自动补 `23:59:59`，否则「当天上午的数据」永远查不出来。
2. **`SysOperLog.businessType` / `status` 是 Integer**（`SysLogininfor.status`
   才是 String）。字典的 value 直接写数字；renderCell 的字典查找两边都做
   `String()` 归一，所以能对上。

### 未实现（点进去是占位页，会说明缺什么）

系统监控：在线用户、定时任务、数据监控、服务监控、缓存监控、缓存列表
系统工具：表单构建、代码生成、系统接口

这些页面要么依赖 RuoYi 特有能力（Druid 面板 iframe、代码生成器、定时任务调度），
要么是运维向、价值密度低。补的方式和已实现的页面一样：
在 `src/views/<component>.vue` 建组件 + 在 `api/modules` 加接口。

**占位页的设计意图**：把"未实现"显式呈现出来，而不是让它静默失败。

### 相对老 ruoyi-ui 未搬的功能

- 多标签页（TagsView）与主题设置抽屉
- 首页的 echarts 统计图（老工程为一个首页引入整个 echarts，1MB+）
- 角色分配菜单的独立弹窗（简化成了表单字段，`roleApi.getRoleMenuTree` 已备好）

---

## 与老 ruoyi-ui 的关系

`PGuide-Manage/ruoyi-ui` **保留不删**，原因：

1. 它是 RuoYi 原版，遇到行为不一致时可以对照
2. 代码生成器产出的新页面可以在里面找到模板

但**不再维护**。新功能一律写在这里。

---

## 命令

```bash
pnpm dev:manage      # 启动（:81）
pnpm build           # 构建全部应用
pnpm lint            # ESLint
pnpm type-check      # vue-tsc
pnpm test            # Vitest
```
