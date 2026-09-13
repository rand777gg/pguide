# 10 - Spring 升级迁移计划（Boot 2.6 → 3.5）

> 状态：**待执行** ｜ 前置调查：2026-09（结论见本文末"背景"）
> 原则：**每阶段结束都是一个可运行、可提交、可回滚的版本**，不做跨阶段的半成品。

---

## 1. 背景与结论

| 项目 | 现状 | 问题 |
|---|---|---|
| JDK | 8（全部模块 compiler 1.8） | 已过 LTS 主流线 |
| Spring Boot | 2.6.6（2022-03） | OSS 支持止于 2022-11，商业止于 2024-02，**无补丁** |
| Spring Cloud | 2021.0.4 | 该 release train 已停更 |
| Spring Cloud Alibaba | 2021.0.4.0 | 2021 分支停更，nacos-client 1.4 |
| Nacos server | v2.2.3（compose） | 配套 client 升级后需评估 |
| Elasticsearch | 7.4.2（compose） | RestHighLevelClient 已废弃 |
| 内嵌 Tomcat | 9.0.60 | 多个已修未升 CVE |

**结论：升。** 目标矩阵（SCA 官方对照：2025.0.x ↔ Spring Cloud 2025.0.x ↔ Boot 3.5.x ↔ JDK 17+）：

| 组件 | 现值 | 目标 |
|---|---|---|
| JDK | 8 | **17**（21 可选，收益为虚拟线程，非必需） |
| Spring Boot | 2.6.6 | **3.5.x**（3.5.16 为当前最新 patch） |
| Spring Cloud | 2021.0.4 | **2025.0.x** |
| SCA | 2021.0.4.0 | **2025.0.0.0** |
| Nacos server | v2.2.3 | **v3.0.x**（SCA 2025 带 nacos-client 3.0.3） |
| Elasticsearch server | 7.4.2 | **7.17.x**（暂不升 8，理由见 Phase 4） |
| MySQL / Redis | 8.0.31 / 7.2 | 不动 |

**不在本次范围**：`PGuide-Manage`（RuoYi 独立工程）。它不注册 Nacos、直连 4 库，动它收益低风险高；
只要 ES server 停在 7.17，其 7.4.2 HighLevelClient 仍可工作（见 Phase 4）。

---

## 2. 现状盘点（改动清单的依据）

实际使用中的 Spring 生态依赖：

- Web/微服务：`spring-boot-starter-web`、`spring-cloud-starter-openfeign`、`loadbalancer`（已排除 ribbon）、`spring-cloud-starter-gateway`（sc-gateway，reactive）、`spring-cloud-starter-alibaba-nacos-discovery/config`、`spring-cloud-starter-bootstrap`
- 数据：`mybatis-plus-boot-starter 3.5.2`、`druid-spring-boot-starter 1.2.6`、`mysql-connector-java 8.0.31`、`spring-boot-starter-data-redis`、`redisson-spring-boot-starter 3.16.1`
- 鉴权：自研 `pguide-common-security`（**jjwt 0.9.1** + Redis 会话），未用 Spring Security
- 搜索：`elasticsearch-rest-high-level-client`（pguide-business-providers 覆盖为 **7.4.2**）
- 其它：fastjson（2.0.34，fastjson1 兼容包）、hutool 5.7.20、kaptcha、transmittable-thread-local、lombok 1.18.24

仅声明未使用（**Phase 0 直接清理**）：`dubbo 2.7.8`、`spring-boot-admin 2.5.6`、`spring-data-elasticsearch 4.2.3`、`knife4j 2.0.5`（其占位符还拼错为 `${knife4j.verison}`）、`hibernate-validator 6.2.0`（Boot 3 由 BOM 管）、`servlet-api 4.0.1`（Boot 3 用 jakarta，声明应删）。

已知配置坑（compose.yaml 备注，迁移时顺手修根因）：

1. `pguide-search-provider` 的 bootstrap.yml 把 `spring.application.name` 误写成 `pguide-competition-manage`，目前靠 compose 的 `APP_ARGS` 覆盖 → **Phase 0 修源码**。
2. `pguide-project-match-provider` / `pguide-index-info-provider` 没声明 `spring-boot-maven-plugin`，靠 Dockerfile 补跑 repackage → **Phase 1 修根因**。

---

## 3. 分阶段计划

### Phase 0：预清理与基线锚点（约半天）

**改动**
- 修 `pguide-search-provider/src/main/resources/bootstrap.yml`：`spring.application.name=pguide-search`；compose 里对应 `APP_ARGS` 注释保留一个版本后删除。
- 根 pom 清理：删 `dubbo.version`、`spring-boot-admin.version`、`spring-data-elasticsearch.version` 声明；`fastjson.version` 双定义合并为一条（`2.0.34` 或更高）；`${knife4j.verison}` 拼写修正。
- `mvn clean install` + `docker compose --profile full --profile back up -d` 跑通，全服务注册到 Nacos、网关路由可达。

**验收**：全部服务冒烟通过（登录、任一列表接口、网关转发）。
**锚点**：打 tag `v1.1.0-boot2-baseline`，此为全程回滚基准。

### Phase 1：JDK 17 + Boot 2.7.18 过渡（约 1 天）

先把运行时抬到 17，BOM 小步走，问题面最小。

**改动**
- 根 pom：`spring-boot.version` 2.6.6 → **2.7.18**；`spring-cloud-dependencies.version` → 2021.0.x 最终补丁（2021.0.9）；SCA → 2021 线最新（2021.0.5.0+）。
- `maven.compiler.source/target` 与 compiler-plugin 的 `1.8` → **17**（建议改用 `<maven.compiler.release>17</maven.compiler.release>`，各子模块 properties 同步）。
- lombok 1.18.24 → **1.18.30+**（旧版在 17 上会编译报错）。
- jjwt 0.9.1 在 JDK 17 上因 `javax.xml.bind` 缺失而炸：直接升 **jjwt 0.11.5**（javax 生态终版、无 jakarta 依赖，Phase 2 无需再动），重写 `pguide-common-security` 里 `Jwts.parserBuilder()` 相关调用（0.9→0.11 API 有变）。
- 修根因：给 project-match / index-info 两个 provider 补 `spring-boot-maven-plugin`（repackage execution），删除 `docker/backend.Dockerfile` 里补跑 repackage 的整段 `RUN`。
- Dockerfile：`maven:3.8.6-openjdk-8` → `maven:3.8.6-openjdk-17`（builder 与 runtime **两处**）。

**验证**：JDK 17 强封装可能暴露反射问题，重点看 redisson/druid 启动日志；`--add-opens` 先不加，遇到再按报错最小化添加。

**验收**：compose 全量冒烟通过。tag `v1.2.0-jdk17`。

### Phase 2：Boot 3.5 + jakarta 全量迁移（核心，约 2~3 天）

**改动**
- 根 pom BOM：Boot → **3.5.x**，SC → **2025.0.x**，SCA → **2025.0.0.0**。
- 先跑 OpenRewrite 自动化（在仓库根）：
  ```bash
  mvn -U org.openrewrite.maven:rewrite-maven-plugin:run \
    -Drewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
    -Drewrite.activeRecipes=org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_5
  ```
  它会处理大部分 `javax.*` → `jakarta.*` import、配置 key 改名、废弃 API。
- 手工兜底：全局 grep `javax\.servlet|javax\.validation|javax\.annotation` 清残留（重点 `pguide-common-*`、filter/interceptor/`@PostConstruct`）。
- starter 替换（artifactId 变了，涉及所有引用模块）：
  | 旧 | 新 |
  |---|---|
  | `mybatis-plus-boot-starter 3.5.2` | `mybatis-plus-spring-boot3-starter 3.5.12+` |
  | `druid-spring-boot-starter 1.2.6` | `druid-spring-boot-3-starter 1.2.23+`（配置前缀 `spring.datasource.druid.*` 不变） |
  | `redisson-spring-boot-starter 3.16.1` | `3.2x+` + `redisson-spring-data-35`（匹配 Boot 3.5） |
  | `mysql:mysql-connector-java 8.0.31` | `com.mysql:mysql-connector-j 8.x+` |
- 删根 pom 的 `hibernate-validator`、`servlet-api`、`jackson-databind/jackson.version` 显式声明（Boot 3 BOM 管理）。
- ES **本阶段不动**：HighLevelClient 无 jakarta 依赖，可编译通过，功能留 Phase 4 —— 控制爆炸半径。

**验证**：5 provider + auth + gateway 全部启动；重点回归鉴权链路（JWT 签发/校验、Redis 会话）、Feign 内部调用、网关 `lb://` 路由。

**验收**：全链路冒烟。tag `v2.0.0-boot3`。**此阶段单独建 `feature/spring-boot3` 分支做，通过后再合主干。**

### Phase 3：Nacos server v3（约半天）

**改动**
- `compose.yaml`：`nacos/nacos-server:v2.2.3` → `v3.0.x`；保留 `NACOS_AUTH_ENABLE=true` 及鉴权三件套。
- **端口坑**：v3 的 console 默认从 8848 分离、监听 **8080**，与 manage 服务宿主机端口冲突 → compose 映射加 `"${NACOS_CONSOLE_HOST_PORT:-18849}:8080"`；gRPC 9848 映射保持。
- bootstrap.yml 机制：保留 `spring-cloud-starter-bootstrap`（改动最小）。可选现代化（不阻塞）：迁 `spring.config.import: nacos:`。

**验收**：服务注册/发现、网关 lb 转发正常。tag `v2.1.0-nacos3`。

### Phase 4：ES 客户端重写（约 1~2 天）

**策略**：server 先升 **7.17.x**（7.x 终版）而非 8 —— 理由：RuoYi manage 的 7.4.2 HighLevelClient 与 7.17 server 保持兼容，manage 一行不改。

**改动**
- `compose.yaml`：`elasticsearch:7.4.2` → `7.17.x`（本地 dev 数据可 `down -v` 重建，或先 snapshot）。
- `pguide-search-provider`：`RestHighLevelClient` → `co.elastic.clients:elasticsearch-java`（**8.x client 官方兼容 7.17 server**）；查询 DSL 代码重写，涉及 `pguide-business-providers` 里的 client 装配（`PguideElasticSearchConfiguration` 同类逻辑）。
- manage 不动。未来若要 ES 8 server：manage 的 ES 需加兼容头或重写 → 单列决策点，不在本计划。

**验收**：CMS/搜索接口的 ES 检索返回正确。tag `v2.2.0-es`。

### Phase 5：收尾与依赖统一（约 1 天）

- fastjson：`com.alibaba:fastjson:2.0.x`（1.x 兼容包）调用点逐步迁 `fastjson2` 原生 API（grep `com.alibaba.fastjson` 分布决定节奏，可只迁公共模块）。
- hutool 5.7.20 → 5.8.x；guava 31.1-jre → 33.x（可选）。
- 如需接口文档：引入 `knife4j-openapi3-jakarta-spring-boot-starter 4.x`（springdoc 体系），替代从未真正启用的 springfox 线。
- 更新 `dev-manual/01-工程结构与技术栈.md` 技术栈表；compose 与 docker/README 同步。

**验收**：`mvn -B verify` 零警告级依赖冲突（`mvn dependency:tree` 抽查无 1.x jackson/javax 残留）。tag `v2.3.0`。

---

## 4. 风险清单与回滚

| 风险 | 出现阶段 | 缓解 |
|---|---|---|
| jjwt 升级导致已签发 token 全失效 | P1 | 用户重新登录即可（dev 阶段可接受）；生产则安排在低峰发版 |
| JDK 17 强封装反射报错 | P1 | 按报错加 `--add-opens`，禁止无脑全开 |
| OpenRewrite 改动面过大难 review | P2 | 一次跑完但**按模块分批提交**；`pguide-common-*` 先审 |
| Feign/LoadBalancer 行为差异（超时、重试默认值变化） | P2 | 对照 yml 显式化超时配置，不依赖默认值 |
| Nacos v3 console 端口 8080 冲突 | P3 | 见 Phase 3，映射错开 |
| ES DSL 重写语义偏差（分页/聚合结果不一致） | P4 | 迁移前用固定数据集录制旧接口响应做 diff |
| Boot 3 对 `application.yml` 宽松绑定的校验收紧 | P2 | 启动日志盯 `APPLICATION FAILED TO START` 提示逐条修 |

**回滚**：每阶段有 tag，任何阶段失败 → `git checkout v1.x.0-...` + 重建镜像即回到上一可运行态；阶段内日常提交按现有 Git 规范走。

---

## 5. 工作量汇总

| 阶段 | 内容 | 估时 | 版本锚点 |
|---|---|---|---|
| P0 | 预清理 + 基线 | 0.5 天 | `v1.1.0-boot2-baseline` |
| P1 | JDK 17 + Boot 2.7 过渡 | 1 天 | `v1.2.0-jdk17` |
| P2 | Boot 3.5 + jakarta + starter 替换 | 2~3 天 | `v2.0.0-boot3` |
| P3 | Nacos server v3 | 0.5 天 | `v2.1.0-nacos3` |
| P4 | ES client 重写 | 1~2 天 | `v2.2.0-es` |
| P5 | 收尾统一 | 1 天 | `v2.3.0` |
| 合计 | | **6~8 个工作日** | |

建议顺序严格按 P0→P5，不跳步；P2 是主战场，P3/P4 相互独立、可在 P2 后并行。
