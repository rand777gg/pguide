# 项导开发规范（dev-manual）

本目录是**强制约定**，不是建议。新增代码一律按这里的写法来；
发现规范本身有问题，提 PR 改规范，而不是在代码里各写各的。

---

## 为什么要有这个目录

这个项目是多人协作的课程/竞赛项目，历史上出现过这些问题（都真实发生过）：

| 现象 | 后果 |
|---|---|
| `qs`、`uuid` 被 import 但没写进 `package.json` | 靠 npm 的依赖提升侥幸能跑，换包管理器就炸 |
| token 写进 `sessionStorage`，读却从 `localStorage` 读 | 登录状态随机失效，排查了很久 |
| 同一份假数据在两个区块各写一遍 | 改一处忘另一处 |
| `background-color: write`（拼错） | JS 拼字符串改样式不报错，没人发现 |
| 两个路由用同一个 `name` | 路由跳转行为诡异 |
| 全局守卫里 `next('/403')` 之后又无条件 `next()` | 守卫完全失效 |
| 连接串、密码硬编码进 yml | 整合版只能靠把值改成 `**` 来脱敏，结果 `*` 是 YAML 别名符号，配置直接无法解析 |
| 环境变量拼错（`.env.production` 里少了变量） | 静默变成 undefined，生产环境才炸 |

规范的作用就是让这些**在写的时候就不可能发生，或者在 CI 里被拦住**。

---

## 目录

| 文档 | 内容 |
|---|---|
| [01-工程结构与技术栈](./01-工程结构与技术栈.md) | 仓库怎么分、用什么工具、各目录职责 |
| [02-编码规范](./02-编码规范.md) | TypeScript / Vue3 / 命名 / 注释 |
| [03-Git 规范](./03-Git规范.md) | 分支模型、提交信息、PR 流程 |
| [04-API 层与数据流](./04-API层与数据流.md) | 请求怎么发、响应怎么拆、类型放哪 |
| [05-状态管理](./05-状态管理.md) | Pinia 怎么用、什么该进 store |
| [06-鉴权与会话](./06-鉴权与会话.md) | token 放哪、统一鉴权中心怎么对接 |
| [07-样式与组件](./07-样式与组件.md) | 设计令牌、scoped、组件拆分 |
| [08-质量门禁](./08-质量门禁.md) | lint / 类型检查 / 测试 / 提交前检查 |
| [09-环境变量与部署](./09-环境变量与部署.md) | 环境变量、构建、nginx |
| [10-Spring 升级迁移计划](./10-Spring升级迁移计划.md) | 后端 Spring Boot 2.6 → 3.5 分阶段迁移（P0~P5） |

---

## 三条最容易被违反的红线

1. **不允许裸用 `localStorage` / `sessionStorage`**
   一律走 `@pguide/shared` 的 `readStorage` / `writeStorage`。

2. **不允许在组件里直接 `import axios`**
   一律走 `@pguide/api`。组件里出现 `axios` 三个字就是错的。

3. **不允许硬编码地址、端口、密钥**
   本机地址（`http://localhost:4000`）、网关地址、任何密码都不许出现在源码里，
   必须走环境变量（`import.meta.env.VITE_*`）。

---

## 快速开始

```bash
# 前端（新工程，Vue3 + Vite + TS）
cd PGuide-Front
pnpm install
pnpm dev            # → http://localhost:4000

# 后端 + 中间件（Docker）
docker compose --profile full --profile back up -d   # 详见 docker/README.md
```

环境要求：**Node >= 20.19**、**pnpm 12+**、Docker Desktop（跑后端时）。

---

## 新旧工程并存说明

`PGuide-Front/` 下同时存在两套前端：

```
PGuide-Front/
├── apps/match/          新：Vue3 + Vite + TS      ← 开发看这里
├── packages/*           新：共享包
├── pguide-auth-ui/      旧：Vue2 + vue-cli        ← 待迁移，不要再改
├── pguide-match-ui/     旧：Vue2 + vue-cli        ← 待迁移，不要再改
└── pguide-ui-demo/      旧：Vue2 + vue-cli        ← 演示页，可删
```

**规定：新功能只在新工程里写。** 老工程只允许改 bug，不允许加功能。
迁移进度见 `PGuide-Front/README.md`。
