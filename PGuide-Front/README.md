# PGuide 前端

Vue 3 + Vite + TypeScript 的 pnpm monorepo，同时保留尚未迁移的 Vue 2 老工程。

---

## 目录

```
PGuide-Front/
├── pnpm-workspace.yaml       workspace 定义 + pnpm 策略配置
├── package.json              根脚本（dev / build / lint / test）
├── tsconfig.base.json
├── .npmrc                    registry + 严格依赖
│
├── packages/                 ← 新的共享包
│   ├── shared/               @pguide/shared：类型、常量、工具
│   └── api/                  @pguide/api：axios 客户端 + 接口定义
│
├── apps/                     ← 新的应用
│   └── match/                @pguide/match：组队中心
│
├── pguide-auth-ui/           ⚠️ 旧 Vue2，待迁移
├── pguide-match-ui/          ⚠️ 旧 Vue2，待迁移（已被 apps/match 取代）
└── pguide-ui-demo/           ⚠️ 旧 Vue2，动效试验页，可删
```

**新功能只写在新工程里。** 老工程只允许改 bug。
`dev-manual/` 是强制开发规范。

---

## 快速开始

```bash
# 环境要求：Node >= 20.19、pnpm 12+
cd PGuide-Front
pnpm install
pnpm dev            # → http://localhost:4000
```

需要真实数据时，先把后端和中间件起来（在仓库根目录）：

```bash
docker compose --profile full --profile back up -d
```

演示账号：`student001` / `123456`（来自 `docker/init/90-demo-seed.sql`）。

---

## 常用命令

在 `PGuide-Front/` 下执行：

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 启动组队中心 dev server（:4000，带 HMR） |
| `pnpm build` | 类型检查 + 构建全部应用 |
| `pnpm build:match` | 只构建组队中心 |
| `pnpm preview` | 预览构建产物 |
| `pnpm type-check` | 只跑 vue-tsc |
| `pnpm lint` | ESLint（0 warning 才算过） |
| `pnpm lint:fix` | ESLint 自动修复 |
| `pnpm format` | Prettier 格式化 |
| `pnpm test` | Vitest |

提交前必须 `pnpm lint && pnpm type-check && pnpm test` 全绿。

---

## 开发环境配置

`apps/match/.env.development`：

```
VITE_API_BASE_URL=/api                       # 同源，走 Vite 代理，无跨域
VITE_PROXY_TARGET=http://localhost:666       # 代理到网关
VITE_SELF_URL=http://localhost:4000/         # 鉴权中心回跳地址
VITE_AUTH_GUARD=false                        # 开发期跳过登录守卫
```

**环境变量必须以 `VITE_` 开头**，通过 `import.meta.env.VITE_XXX` 访问
（Vue CLI 时代是 `process.env.VUE_APP_XXX`，两者不通用）。
变量声明在 `apps/match/env.d.ts`，拼错名字类型检查会报错。

详见 `dev-manual/09-环境变量与部署.md`。

---

## 迁移进度

| 应用 | 原技术栈 | 状态 | 备注 |
|---|---|---|---|
| 组队中心 | Vue2 + Element UI + vue-cli | ✅ **已迁移** → `apps/match` | 页面、路由、API 层、鉴权流程全部重写 |
| 鉴权中心 | Vue2 + vue-cli（无 UI 库） | ⏳ 待迁移 | 见下方"已知缺口" |
| 门户 / 首页 | Vue2 | ❌ 不在此仓库 | 只在私有前端仓 |
| 管理端 UI | Vue2 | ❌ 不在此仓库 | 只在私有前端仓 |
| 后台界面 | RuoYi 自带 ruoyi-ui | ⏸ 保持现状 | Vue2 + Element UI，与 RuoYi 版本绑定，暂不迁移 |
| 动效 demo | Vue2 | 🗑 可删 | 路由指向不存在的文件，本来就跑不起来 |

### `apps/match` 相对老工程的改动

**结构性**

- Vue 2 → Vue 3（Composition API + `<script setup>`）
- Vuex 3 → Pinia（Setup Store）
- Element UI → Element Plus 2
- webpack（vue-cli）→ Vite 7
- JavaScript → TypeScript（strict）
- 单个 npm 工程 → pnpm workspace（`apps/*` + `packages/*`）

**修掉的老问题**

| 问题 | 处理 |
|---|---|
| token 写 sessionStorage、读 localStorage | 统一走 `@pguide/shared` 的 storage 封装 |
| 路由守卫 `next('/403')` 后又 `next()`，守卫失效 | 改成 Vue Router 4 的返回值写法 |
| 两个路由用同一个 `name: 'detailPage'` | 理顺路由表，去掉重复的 `/homePage`、`/group`、`/resume` |
| `uuid`、`qs` 用了但没写进 `package.json` | 改用原生 `crypto.randomUUID()`，删除 `qs` |
| `http://localhost:4000` 写死在源码里 | 改为 `import.meta.env.VITE_SELF_URL` |
| 用 `$refs` + 拼 style 字符串排版（含拼写错误 `background-color: write`） | 改用计算属性 + 动态 class |
| `HomeBody.vue` 25KB，七个区块只有一个是真接口 | 拆成组件 + service 层；假数据集中到 `services/project.ts` 并显式标注 |
| `.env.production` 缺变量导致生产鉴权静默失效 | 全环境声明变量，且 `env.d.ts` 提供类型检查 |

### 已知缺口（下一步）

1. **鉴权中心（`pguide-auth-ui`）还没迁移。** 它的 `#/redirect?code=&sendUrl=`
   参数解析是坏的（`searchParams` 读不到 `#` 之后的内容），
   重写时必须修掉。契约见 `dev-manual/06-鉴权与会话.md`。
   当前整条登录链路之所以能通，是因为一次性 code 存在 localStorage 而不是 URL 里。
2. **热门项目 / 需求市场用的是占位数据。** 后端没有列表接口，
   集中在 `apps/match/src/services/project.ts`，接口就绪后只改这一个文件。
3. **`CreatedResume` 只有表单骨架**，没有提交接口（后端也没有简历接口）。
4. **`DetailPage` 是空列表**，等 `/mms/project/list`。
5. **测试覆盖率低。** 目前只有 2 个测试文件（学科树转换、storage 封装）。
   优先补纯函数和 store 的 action，见 `dev-manual/08-质量门禁.md`。
6. **还没有 CI。** 建议的流水线写在 `dev-manual/08-质量门禁.md` 第 6 节。

---

## 关于 pnpm 的两个坑

都记在 `pnpm-workspace.yaml` 的注释里，这里简述：

1. **依赖的 postinstall 被拦截。** pnpm 默认不允许依赖执行构建脚本，
   `esbuild` 和 `@parcel/watcher` 必须放行（`allowBuilds`），
   否则 `vite build` 会报装错了平台。
2. **供应链保护会拒绝太新的包。** `minimumReleaseAge` 默认 24 小时，
   `sass-embedded@1.104.1` 因为发布不足 24 小时被拒。
   处理方式是精确锁定到 `1.104.0`（在窗口外），而**不是**关掉这条策略。

---

## 相关文档

- 开发规范：`../dev-manual/`
- 后端与中间件：`../docker/README.md`
- 鉴权与会话契约：`../dev-manual/06-鉴权与会话.md`
