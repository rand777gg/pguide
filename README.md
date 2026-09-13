# 项导 PGuide

> **本分支 `feat-04-springboot4` 是升级设计稿分支**：README 即整体设计文档。
> 旧线 `dev-wjq` 冻结为只读基线，一切升级工作在本分支按里程碑推进。

### 项目介绍

该项目旨在为大学生提供一个竞赛组队交流平台，同时定期展示相关竞赛信息，为大学生竞赛、创新创业项目提供支持和帮助。项目分为组队管理、竞赛信息、项目管理等多个模块。

---

## 1. 为什么要开新分支（背景与决策）

| 项目 | dev-wjq 现状 | 问题 |
|---|---|---|
| JDK | 8 | 已退出 LTS 主流线 |
| Spring Boot | 2.6.6（2022-03） | OSS 支持止于 2022-11，**无补丁** |
| Spring Cloud / SCA | 2021.0.4 / 2021.0.4.0 | release train 停更，nacos-client 1.4 |
| 管理后台 | RuoYi 3.8.6 单体（PGuide-Manage） | Boot 2.x 系、直连 4 库、不走网关、前端 ruoyi-ui 为 jQuery/Vue2 混合风格 |
| 前端 | Vue3 + Vite + TS monorepo（已到位） | 仅管理台对接 RuoYi 的 `{code,msg}` 契约 |

原 `dev-manual/10-Spring升级迁移计划.md`（Boot 2.6 → 3.5，P0~P5）论证过"原地小步迁移"：
它要为**保持旧代码一路能跑**支付大量成本——过渡版本、双机制兼容、RuoYi 因 ES 7.4 客户端而
锁死整条 ES 升级路线。经评估，原地迁移成本已大于按既有模式重建。

**决策：重建式升级（rebuild, not refactor）。**

1. `dev-wjq` 冻结为只读基线（打 tag `v1.1.0-dev-wjq-freeze`），不再投入。
2. 本分支按 **相同的设计思想与模式**、用最新技术栈重建后端，前端沿用现栈并接管管理后台。
3. 旧 RuoYi 工程（根目录 `PGuide-Manage/`）在本分支退役，功能由
   **自建管理台（`PGuide-Front/apps/manage`）+ 新后端 `pguide-manage-provider`** 承接。

---

## 2. 延续不变的设计思想与模式

升级换的是引擎，不是方向盘。以下契约与模式全部保留：

| 设计思想 | 新分支落地方式 |
|---|---|
| 管理面 / 业务面分离 | 保留，但管理面从"网关外直连 4 库的 RuoYi 单体"改为"注册进 Nacos 的 `pguide-manage-provider` + 网关 `/api/admin/**` 路由" |
| 微服务模块化分层（api / entity / service / provider / commons / gateway / auth） | 模块划分与依赖方向原样重建 |
| 自研轻量鉴权（网关 GlobalJWTFilter + Redis 会话 + `@UserAuth` 切面），不引入 Spring Security 全家桶 | 保留，仅升级 jjwt 至 jakarta 线 |
| 统一响应体 `JsonResult{code, message, data}`、业务失败 HTTP 仍 200、`307` 跳鉴权中心 | 全平台（含管理面）统一为此契约 |
| token 走自定义请求头 `token`（无 Bearer）、网关白名单 Ant 通配 | 保留 |
| 统一鉴权中心 SSO（一次性 code 换 token） | 保留，`apps/auth` 不动 |
| 前端 monorepo 分层（views → services → api，组件禁 axios） | 保留，见 `dev-manual/04` |
| `dev-manual/` 强制规范体系 | 继续有效，01/10 号文档随里程碑更新 |
| 每阶段可运行、可提交、可回滚（10 号手册原则） | 里程碑制 + 版本锚点 tag |

**前端契约不变项**：`{code,message,data}`、分页 `{total,rows}`、`pageNum/pageSize`、
开发代理 `/api → :666`、生产 `/prod-api` 由 nginx 转发。

---

## 3. 目标技术栈矩阵（版本核实于 2026-09）

| 组件 | dev-wjq | 本分支目标 | 依据 |
|---|---|---|---|
| JDK | 8 | **21**（启用虚拟线程） | Boot 4 基线 17；21 LTS 是虚拟线程红利 |
| Spring Boot | 2.6.6 | **4.0.x（4.0.8）** | SCA 2025.1.0.0 官方适配 Boot 4.0.x |
| Spring Framework | 5.3.x | **7.0.x** | Boot 4 配套 |
| Spring Cloud | 2021.0.4 | **2025.1.x** | 配套 Boot 4 |
| Spring Cloud Alibaba | 2021.0.4.0 | **2025.1.0.0** | nacos-client 3.1.1 / Sentinel 1.8.9 |
| Nacos server | 2.2.3 | **3.1.x** | SCA 2025.1 配套 |
| 配置加载 | bootstrap.yml | **`spring.config.import: nacos:`** | SCA 2025.1 移除 bootstrap 支持 |
| ORM | mybatis-plus-boot-starter 3.5.2 | **mybatis-plus-spring-boot4-starter 3.5.17** | MP 官方 Boot4 starter（3.5.13+） |
| 连接池 | druid-spring-boot-starter 1.2.6 | **druid-spring-boot-4-starter 1.2.28** | Druid 官方，配置前缀不变 |
| Redis | spring-data-redis + redisson 3.16.1 | **redisson 4.7.0 + redisson-spring-data-40** | 官方 Boot4 支持 |
| JWT | jjwt 0.9.1 | **jjwt 0.12.x+（jakarta 线）** | 落地时锁最新 patch |
| JSON | fastjson(1 兼容) / fastjson2 混用 | **Jackson 3（tools.jackson，Boot 4 默认）** | 重建期直接统一，不再引入 fastjson |
| 搜索 | ES server 7.4.2 + RestHighLevelClient | **ES server 8.x + elasticsearch-java 8.x** | RuoYi 退役后不再被 7.4 客户端锁死 |
| 接口文档 | knife4j 2.0.5（从未启用） | **springdoc-openapi 3.x** | 官方 Boot 4 线 |
| 可观测 | spring-boot-admin 2.5.6（未用） | **Actuator + spring-boot-starter-opentelemetry** | SBA 的 Boot4 适配未定，先用 OTel |
| Web 容器 | Tomcat 9 | **Tomcat 11（Jakarta EE 11 / Servlet 6.1）** | Boot 4 配套 |
| 内部 RPC | OpenFeign | **OpenFeign 保留**，中期评估 `@HttpExchange`（Boot 4 自动装配 HTTP Service Client） | 控制改动面 |

> Boot 4.1（4.1.1，2026-06）已发布，但 SCA 尚未声明适配。**锁 4.0.x 是单变量决策**；
> 待 SCA 发布适配 4.1 的版本后单独立项上移（届时获得 gRPC 自动装配等能力）。
> Boot 4.0 OSS 支持至 2026-12-31，此为上移的硬性触发条件之一。

**前端技术栈不变**：Vue 3.5 / Vite 7 / TypeScript 5.9 / Element Plus 2.14 / Pinia 3 / pnpm 12 monorepo。

---

## 4. 目标架构总览

```text
                          ┌────────────────────────────────────────────┐
                          │              PGuide-Front (pnpm monorepo)  │
                          │  apps/match :4000   apps/auth :99          │
                          │  apps/manage :8081  ← 自建管理台(Vue3+EP)   │
                          │  packages/shared  packages/api             │
                          └──────────────────────┬─────────────────────┘
                                                 │ /api/**（token 头）
                          ┌──────────────────────▼─────────────────────┐
                          │        gateway (sc-gateway, WebFlux) :666  │
                          │  GlobalJWTFilter + 白名单 + lb:// 路由      │
                          └──┬─────────┬─────────┬─────────┬───────────┘
              /api/auth      │/api/user│ /api/mms│ /api/cms│ /api/index  /api/search   /api/admin
                 ┌───────────▼──┐ ┌────▼─────┐ ┌───────▼──┐ ┌───▼──────┐ ┌────▼─────┐ ┌──▼──────────────┐
                 │ pguide-auth  │ │  user    │ │   mms    │ │   cms    │ │  search  │ │ manage-provider │
                 │  :888        │ │ provider │ │ provider │ │ provider │ │ provider │ │  （新增）        │
                 │ SSO/会话/JWT │ │  :777    │ │ :12002   │ │  :9000   │ │  :11001  │ │ sys_user/role/  │
                 └──────┬───────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │ menu/dict/log   │
                        │              │            │            │            │       └──┬──────────────┘
                        ▼              ▼            ▼            ▼            ▼          ▼
                   ┌──────────────────────────────────────────────────────────────────────┐
                   │  MySQL8（5 库不变）   Redis7   Nacos3.1（注册+配置）   ES8（search/cms）│
                   └──────────────────────────────────────────────────────────────────────┘

  退役：PGuide-Manage（RuoYi 单体）→ git 历史保留，分支中移除目录，compose 删除 manage profile
```

要点：

1. **管理台纳入网关体系**：`apps/manage` 不再直连 RuoYi 8080，改走 `/api/admin/**`，
   鉴权与业务面同构（登录签发 `userType=admin` 的 token，`@UserAuth` 按权限码校验）。
2. **每个 provider 一库**（manage-provider 用 `pguide_manage` 库），延续现有数据面划分。
3. 端口规划不变，运维侧零心智迁移。

---

## 5. 后端模块设计

沿用 `PGuide-Back` 现有模块化思想（依赖方向：provider → api → entity，commons 横切）：

```text
PGuide-Back/
├── pguide-gateway/sc-gateway      网关（WebFlux，GlobalJWTFilter 平移 + 白名单配置）
├── pguide-auth                    鉴权中心（SSO、验证码、Redis 会话、token 签发）
├── pguide-api/                    OpenFeign 内部接口（auth/user/mms/cms/search + 新增 admin）
├── pguide-entity/                 实体抽取（5 域 + admin 域）
├── pguide-service/                业务 service 实现（mappers + XML 平移重编译）
├── pguide-business-providers/     user / mms / cms / index-info / search + 新增 manage-provider
├── pguide-commons/                common-core(JsonResult/PageResult/错误码)、security(jjwt+Redis 会话)、
│                                  page、redis、search(重写)、download、rabbitmq(保留评估)
├── pguide-third-integration/      email / sms / qq（按需平移）
└── pguide-monitor                 OTel + Actuator 聚合（SBA 待适配后再评估）
```

### 5.1 新增：pguide-manage-provider

承接 RuoYi 管理面能力，按 PGuide-Back 分层模式重建：

| 能力 | 来源（RuoYi） | 新实现 |
|---|---|---|
| 登录 / 会话 | ruoyi-framework Security | 复用 `pguide-auth` + commons-security，`sysType=pguide-admin` |
| 用户 / 角色 / 菜单 / 部门 / 岗位 | sys_user, sys_role, sys_menu, sys_dept, sys_post | `pguide-admin-api` + manage-provider，`@UserAuth` 权限码 |
| 字典 / 参数 / 通知 | sys_dict, sys_config, sys_notice | 同上 |
| 操作 / 登录日志 | sys_oper_log, sys_logininfor | 切面重写（虚拟线程安全），写 `pguide_manage` 库 |
| 动态菜单路由 | `/getRouters` | `GET /api/admin/menu/routers`，返回结构保持前端 `dynamic-route.ts` 可消费 |

**数据库零迁移**：`pguide_manage` 库的 `sys_*` 表结构原样沿用（RBAC 模型不变），
初始化 SQL 从 `docker/init/` 继续 dispense，仅去掉 RuoYi 特有的 `gen_*` 表。

### 5.2 Boot 2.6 → 4.0 关键变化对照（重建时的 checklist）

| 变化 | 影响 | 处理 |
|---|---|---|
| `javax.*` → `jakarta.*`（EE 11） | filter / interceptor / `@PostConstruct` | 重写时直接用 jakarta |
| bootstrap.yml 机制移除 | 所有服务的配置加载 | 统一 `application.yml` + `spring.config.import: nacos:`；顺手修掉 index-info 数据源写 bootstrap.yml 的历史包袱、search-provider 应用名错写 bug |
| Jackson 3（`tools.jackson`） | 序列化配置、自定义 Serializer | 新代码统一 Jackson 3，fastjson 调用点消亡 |
| Boot 代码库模块化（小 jar） | 自定义 starter / 内部类依赖 | commons 各模块按新模块坐标引用 |
| `HttpHeaders` 不再是 Map | 网关 filter 里的 header 处理 | 用 `containsHeader()/headerNames()` 新 API |
| 3.x 废弃 API 全部移除 | 编译期暴露 | 重建期自然规避 |
| 虚拟线程 | 高并发 I/O | 各服务 `spring.threads.virtual.enabled=true`（JDK 21） |
| 内建 API Versioning | 未来接口演进 | `/api/**` 预留 `/api/v2/**` 约定，暂不启用 |

---

## 6. 前端设计

**结构不变**（match / auth / manage 三 app + shared / api 两包），改动集中在管理台：

### 6.1 apps/manage 接管清单（现状盘点 → 目标）

| 模块 | 现有页面 | 对接目标 |
|---|---|---|
| system | user / role / menu / dept / dict / config / notice / post | manage-provider，契约切换为 JsonResult |
| monitor | operlog / logininfor | manage-provider 切面日志 |
| mms | project / recruit | mms-provider（走网关） |
| cms | competition / subject | cms-provider |
| usercenter | student / teacher | user-provider |
| 通用 | CrudPage / useCrud / TagsView / 动态路由 | 保留，仅 api 层适配 |

### 6.2 契约切换（`apps/manage/src/api/request.ts` 的重写）

| 项 | RuoYi（现状） | 目标（与业务面统一） |
|---|---|---|
| 响应体 | `{code, msg, data}` | `{code, message, data}` |
| 列表 | `{code, msg, rows, total}` 平铺 | `{code, message, data:{total, rows}}` |
| 认证头 | `Authorization: Bearer` | `token` |
| 成功码 | 200 | 200 / 202 |
| 登出 / 401 | RuoYi logout | 清 token → 307 跳统一鉴权中心（admin 登录页） |

决策：契约统一后，`apps/manage` 的独立 axios 客户端**并入 `@pguide/api`**（新增 `modules/admin.ts`），
消除两套 HTTP 客户端并存；`RuoYiResult/RuoYiPage` 类型删除。
`IS_PLACEHOLDER_DATA` 角标机制保留，后端接口未就绪的页面继续可见地占位。

---

## 7. 基础设施与部署（compose 变更）

| 服务 | 现值 | 目标 |
|---|---|---|
| mysql | 8.0.31 | 不动（5 库 schema 不变） |
| redis | 7.2 | 不动 |
| nacos | v2.2.3 | **v3.1.x**；console 8080 端口映射错开（沿用 10 号手册 P3 方案） |
| elasticsearch | 7.4.2 | **8.x**；索引重建脚本进 `docker/init` |
| 镜像 | maven:3.8.6-openjdk-8 | **eclipse-temurin:21 + maven:3.9-eclipse-temurin-21**（builder/runtime 两处） |
| manage profile | RuoYi 单体 | **删除**；新增 `manage-provider` 服务（profile back 内） |

配置注入方式不变：`x-back-env` 锚点 + relaxed binding 环境变量覆盖，源码 yml 中不出现真实凭据（Git 规范红线）。

---

## 8. 数据与兼容性

1. **MySQL 5 库零变更**：usercenter / mms / cms / index_info / manage。实体字段照旧（含 `subjectLevel` 字符串这类历史怪癖——前端类型以实测响应为准，见 dev-manual/04）。
2. **token 全量失效**：jjwt 升级后旧 token 不可用，用户重新登录即可（课程/竞赛场景可接受）。
3. **ES 索引重建**：8.x 重建 cms/search 索引，迁移前用固定数据集录制旧接口响应做 diff（沿用 10 号手册 P4 做法）。
4. **RuoYi 数据**：仅 `pguide_manage` 库被继续使用；`QRTZ_*`、`gen_*` 等表不再初始化。
5. **验证码 / 会话 key**：Redis key 结构不变（`captcha_codes:<uuid>` 等），dev 联调脚本继续可用。

---

## 9. 里程碑计划（每步可运行、可提交、可回滚）

| 里程碑 | 内容 | 验收 | 锚点 |
|---|---|---|---|
| **M0** 基座 | 分支冻结 tag；compose 升级（Nacos3 / ES8 / JDK21）；根 pom（Boot 4.0.8 BOM + SC 2025.1 + SCA 2025.1.0.0）；commons-core（JsonResult/PageResult/错误码）+ commons-security（jjwt jakarta 线）重建；移除 RuoYi 目录与 manage profile | 空壳 auth+gateway 启动并注册 Nacos，`/api/auth/**` 网关可达 | `v3.0.0-m0` |
| **M1** 鉴权链路 | pguide-auth 重建（登录/验证码/SSO 换 token）；GlobalJWTFilter 平移（含白名单 Ant 匹配）；apps/auth 全链路联调 | 演示账号登录 → 换 token → 401/307 行为与旧线一致 | `v3.1.0-auth` |
| **M2** 业务面 | user / mms / cms / index-info 四 provider 按分层重建；MP boot4 starter + druid boot4 + redisson-spring-data-40；pguide-api Feign 内部调用；apps/match 全页回归 | 四域接口 curl 对照 dev-wjq 录制响应 diff 通过 | `v3.2.0-back` |
| **M3** 管理面 | manage-provider（system 8 域 + 日志切面 + 动态路由接口）；apps/manage 契约切换并入 @pguide/api；页面逐个接管 | 管理台全功能可用，RuoYi 不再启动 | `v3.3.0-admin` |
| **M4** 搜索 | search-provider 用 elasticsearch-java 8.x 重写；索引重建；ES 响应 diff | cms 检索接口返回与录制基线一致 | `v3.4.0-es` |
| **M5** 收尾 | springdoc 3.x 接入；OTel 可观测；CI 门禁（lint/type-check/test + mvn verify）；dev-manual 01/10 号文档改版 | 依赖树无 javax 残留；文档与现状一致 | `v3.5.0` → PR 评审合并 |

排序理由：M0→M1 打通"能进系统"，M2 是最大工作量主战场，M3 与 M4 相互独立可在 M2 后并行。

---

## 10. 风险清单与回滚

| 风险 | 阶段 | 缓解 |
|---|---|---|
| SCA 2025.1.0.0 与 Boot 4.0.8 patch 兼容性未逐一验证 | M0 | M0 只锁 BOM 先跑空壳；升级 patch 前跑 compose 全量冒烟 |
| Nacos v3 console 端口冲突 / 鉴权配置坑 | M0 | 沿用 10 号手册 P3 的映射方案与鉴权三件套 |
| jjwt API 迁移导致签发/校验行为差异 | M1 | 单元测试覆盖签发→校验→过期→伪造四类用例 |
| 重建期与 dev-wjq 功能漂移（旧线新修的 bug 未同步） | 全程 | 每里程碑开始时 `git log dev-wjq --oneline` 过滤 fix 提交清单逐条核对 |
| ES DSL 重写语义偏差 | M4 | 固定数据集录制 diff（同 10 号手册） |
| 契约切换漏改页面 | M3 | `request.ts` 单点封装 + 每页接管时删对应 RuoYi 类型定义（编译器兜底找残留） |
| Boot 4.0 OSS EOL（2026-12-31） | 全程 | 触发 SCA 适配 4.1 后的单项上移计划 |

**回滚**：每里程碑打 tag；任一步失败 `git checkout v3.x.0-*` 即回上一可运行态；
dev-wjq 分支与 tag `v1.1.0-dev-wjq-freeze` 永久保留，极端情况下整线可退。

---

## 11. 不做的事（Non-goals）

1. **不改 MySQL 表结构**（只做初始化 SQL 的裁剪）。
2. **不改对外契约语义**：code 307、token 头、`{code,message,data}` 一律不变，前端 packages/api 类型零重写。
3. **不引入 Spring Security / OAuth2 全家桶**——自研轻量鉴权是本项目验证过的设计，重建不换思想。
4. **不动 pnpm monorepo 结构与前端技术栈版本**。
5. 不做 GraalVM 原生镜像、io_uring 等"能做但不必要"的优化（留决策记录，不进里程碑）。
6. dev-wjq 冻结后只读；确需救火 bug，在 dev-wjq 修复后按"功能漂移核对"流程同步到本分支。

---

## 12. 协作约定

- 分支模型沿用 `dev-manual/03`：本分支为长周期 feat 分支，**里程碑内小步提交**（Conventional Commits，scope 用 `gateway/auth/user/mms/cms/admin/search/docker/front/manual`）。
- 每里程碑结束：打 tag → compose 全量冒烟 → 更新本 README 的里程碑表（标记完成 ✅）。
- 规范问题改 `dev-manual/` 再写代码；本 README 与实际实现冲突时，以实现为准并**立即回头改设计稿**。

---

*设计稿版本：v1.0 ｜ 撰写：2026-09-13 ｜ 版本矩阵核实时点：2026-09（Spring Boot 4.0.8 / SCA 2025.1.0.0 / MP 3.5.17 / Druid 1.2.28 / Redisson 4.7.0 / springdoc 3.1.1）*
