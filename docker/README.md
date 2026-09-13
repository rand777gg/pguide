# PGuide 本地 Docker 环境

把 `PGuide-Back` 微服务集群、`PGuide-Manage` 管理后台，以及它们依赖的全部中间件，
用一套 `compose.yaml` 在本地跑起来。

> 定位：**本地开发 / 学习 / 试验**环境，不是生产部署方案。
> 密码都是明文弱口令，端口全部只绑本机。

---

## 一、快速开始

前提：Docker Desktop 已启动。**不需要本机装 JDK、Maven、MySQL、Redis、Nacos。**

```bash
# 只起中间件（MySQL + Redis），最轻量
docker compose up -d

# 再加 Nacos + Elasticsearch
docker compose --profile full up -d

# 再加 PGuide-Back 微服务全家桶（自动带上 Nacos / ES）
docker compose --profile back up -d

# 再加 RuoYi 管理后台
docker compose --profile manage up -d

# 一把梭
docker compose --profile full --profile back --profile manage up -d
```

首次 `--profile back` 需要构建镜像，约 **3~5 分钟**（编译 59 个 Maven 模块），
之后都命中缓存。

**profile 一览**

| profile | 起什么 |
|---|---|
| （无） | `mysql`、`redis` —— 任何命令都会起 |
| `full` | `nacos`、`elasticsearch` |
| `back` | `nacos`、`es` + 7 个微服务 |
| `manage` | RuoYi 管理后台 |
| `tools` | `adminer`（数据库图形客户端，:18081） |

---

## 二、端口表

宿主机端口**刻意偏移**：本机 `3306` / `6379` 已被另一个项目的容器
（`pguide-next` 的 `pguide-redis`）占用。容器之间走 compose 内部网络、
用服务名互访，内部仍是标准端口，所以偏移只影响从宿主机连接。

| 服务 | 容器名 | 宿主机 → 容器 | 凭据 |
|---|---|---|---|
| MySQL | `pguide-dev-mysql` | **13306** → 3306 | root / pguide123 |
| Redis | `pguide-dev-redis` | **16379** → 6379 | pguide123 |
| Nacos | `pguide-dev-nacos` | **18848** → 8848 | nacos / nacos，控制台 http://localhost:18848/nacos |
| Nacos gRPC | `pguide-dev-nacos` | **19848** → 9848 | 客户端注册用，**不能省** |
| Elasticsearch | `pguide-dev-es` | **19200** → 9200 | 安全关闭 |
| Gateway | `pguide-dev-gateway` | 666 | 统一入口 |
| Auth 鉴权中心 | `pguide-dev-auth` | 888 | |
| UserCenter | `pguide-dev-usercenter` | 777 | |
| Project Match (MMS) | `pguide-dev-project-match` | 12002 | 组队主干 |
| Competition Manage (CMS) | `pguide-dev-cms` | 9000 | |
| Index Info | `pguide-dev-index-info` | 1001 | |
| Search | `pguide-dev-search` | 11001 | 只用 ES |
| RuoYi 管理后台 | `pguide-dev-manage` | 8080 | admin / admin123 |

覆盖端口：`MYSQL_HOST_PORT=3306 docker compose up -d`，或在仓库根目录放 `.env`。

---

## 三、验证

> ⚠️ 用 **`curl.exe`**，不要用 PowerShell 的 `Invoke-WebRequest`。
> 本机 `127.0.0.1:7890` 有 Clash 一类代理接管了系统代理设置，
> `Invoke-WebRequest` 走代理后访问 localhost 会直接超时（实测），
> `curl.exe` 不受影响。

### 1. 数据库

```bash
# 应该是 5 个库
docker exec -e MYSQL_PWD=pguide123 pguide-dev-mysql mysql -uroot \
  -e "select table_schema, count(*) from information_schema.tables
      where table_schema like 'pguide%' group by table_schema;"

# 中文没乱码 → 输出「系统管理」
docker exec -e MYSQL_PWD=pguide123 pguide-dev-mysql mysql -uroot -N \
  -e "select menu_name from pguide_manage.sys_menu where menu_id=1;"
```

预期：`pguide_manage` 28 张、`pguide_project_mms` 10 张、`pguide_usercenter` 5 张、
`pguide_index_cms` 3 张、`pguide_index_info` 3 张。

### 2. Nacos 注册

Nacos 开了鉴权，查 API 要先换 token：

```bash
TOKEN=$(curl.exe -s -X POST "http://localhost:18848/nacos/v1/auth/users/login" \
  -d "username=nacos&password=nacos" | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')

curl.exe -s "http://localhost:18848/nacos/v1/ns/catalog/services?pageNo=1&pageSize=100&hasIpCount=true&accessToken=$TOKEN"
```

预期 **7 个服务**全部 `healthyInstanceCount: 1`：

```
pguide-gateway  pguide-auth  pguide-usercenter  pguide-project-match
pguide-competition-manage  pguide-index-info  pguide-search
```

### 3. 网关鉴权

```bash
# 非白名单 + 无 token → 401
curl.exe -i "http://localhost:666/api/mms/create/test"

# 白名单路径 → 转发到 pguide-auth（不是网关的 401）
curl.exe -i "http://localhost:666/api/auth/getCaptch"
```

### 4. 打通完整登录链路（最能说明问题的一项）

演示账号 `student001` / `123456`（见「演示数据」一节）。

```bash
# ① 取验证码，拿到 uuid
curl.exe -s "http://localhost:666/api/auth/getCaptch"
# → {"code":200,"data":{"uuid":"...","img":"/9j/4AAQ..."}}

# ② 本地偷看答案（真实客户端是人眼看图；注意值被 FastJson2 序列化过，带引号）
docker exec pguide-dev-redis redis-cli -a pguide123 --no-auth-warning get "captcha_codes:<uuid>"
# → "dwx2"

# ③ 登录（account/password/sysType=pguide/userType=student）
curl.exe -s -X POST "http://localhost:666/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"account":"student001","password":"123456","sysType":"pguide","userType":"student","code":"dwx2","uuid":"<uuid>"}'
# → {"code":200,"message":"Login Success!","data":"eyJhbGciOiJIUzI1NiJ9..."}

# ④ 拿 token 访问受保护接口（@UserAuth("*:student")）
curl.exe -s "http://localhost:666/api/mms/create/test" -H "token: <token>"
# → {"code":200,"message":"pass","data":null}
```

这条链路一次串起了：**网关 → 鉴权服务 → Feign 调用户中心 → MySQL → Redis 存会话 →
网关注入权限头 → MMS 服务的 @UserAuth 切面放行**。

登录成功后 Redis 里会多一个会话 key（`RedisConst.auth.TOKEN_USER_VO_KEY_REDIS`），
名字就是 JWT payload 里那个 uuid：

```bash
docker exec pguide-dev-redis redis-cli -a pguide123 --no-auth-warning keys "*"
# PGUIDE_TOKEN_a3874c29-7442-4ac5-8ec1-08add2d3c210   ← UserInfoVo（会话）
# captcha_codes:d647ee05-dd3b-41db-baee-6ffc745383ab  ← 验证码
```

### 5. 管理后台（`--profile manage`）

```bash
# ① 验证码（RuoYi 默认 math 类型，答案存在同一个 captcha_codes: 前缀下）
curl.exe -s "http://localhost:8080/captchaImage"
# → {"code":200,"uuid":"...","img":"..."}

# ② 明文答案（记得去掉 FastJson2 序列化带的引号）
docker exec pguide-dev-redis redis-cli -a pguide123 --no-auth-warning get "captcha_codes:<uuid>"
# → "64"

# ③ 登录 admin / admin123
curl.exe -s -X POST "http://localhost:8080/login" -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","code":"64","uuid":"<uuid>"}'
# → {"msg":"操作成功","code":200,"token":"eyJhbGciOiJIUzUxMiJ9..."}
```

带 token 验证 **Druid 多数据源路由**（这是管理后台的核心设计：不注册 Nacos，
用 4 个数据源直连 4 个业务库）：

```bash
TK=<上一步的 token>
curl.exe -s "http://localhost:8080/project/info/student/list"    -H "Authorization: Bearer $TK"  # USER → pguide_usercenter
curl.exe -s "http://localhost:8080/manage/memtypedict/list"      -H "Authorization: Bearer $TK"  # MMS  → pguide_project_mms
curl.exe -s "http://localhost:8080/cmsmanage/subjectdict/list"   -H "Authorization: Bearer $TK"  # CMS  → pguide_index_cms
curl.exe -s "http://localhost:8080/getInfo"                      -H "Authorization: Bearer $TK"  # MASTER → pguide_manage
```

实测三个源分别返回 1 / 2 / 7 条（就是 `90-demo-seed.sql` 灌进去的演示数据），
中文正常。

---

## 四、这套编排实际踩到的坑

下面不是"保险起见加的措施"，是逐个撞出来的。整合版仓库**直接 docker run 是跑不起来的**。

### 1. 配置文件里的 `**` 让 YAML 直接语法错误（最关键）

整合版为了脱敏，把 Nacos / MySQL / Redis / ES 的地址密码全换成了 `**`。
问题不只是"值不对"——**`*` 在 YAML 里是别名（alias）符号**，
`password: **` 会被解析成"引用一个叫 `*` 的锚点"，直接抛：

```
org.yaml.snakeyaml.scanner.ScannerException: while scanning an alias
```

应用连配置都读不出来，`SPRING_DATASOURCE_URL` 这类环境变量**根本轮不到生效**。
第一版编排就死在这里：7 个服务全部 `Exited (1)`。

**解法**：`docker/normalize-config.sh` 在编译前把"值恰好是若干 `*`"的整行删掉，
属性完全交给环境变量。全仓库共删 **80 行**（后端 72 + 后台 8）。

脚本只匹配 `^\s*key:\s*\*+\s*$`，不误伤这些合法星号：

| 例子 | 为什么不能删 |
|---|---|
| `- Path=/api/auth/**` | Spring Cloud Gateway 路径通配 |
| `typeAliasesPackage: com.ruoyi.**.domain` | MyBatis 包名通配 |
| `classpath*:mapper/**/*Mapper.xml` | MyBatis mapper 路径通配 |
| `jdbc:mysql://**:3306/xxx` | `**` 在值中间，本就是合法 YAML，只是 host 假的 |

### 2. 关掉 Nacos 鉴权会让所有服务连不上 Nacos

一开始为了"少一个失败点"，设了 `NACOS_AUTH_ENABLE=false`。
结果客户端仍然带着 `spring.cloud.nacos.username/password` 去调
`/v1/auth/users/login`，而**鉴权关闭时这个接口返回 HTTP 500**：

```
ERROR c.a.nacos.client.security.SecurityProxy :
  [SecurityProxy] login http request failed ... errorMsg: Server returned HTTP response code: 500
→ Connection is unregistered, switch server
→ NacosException: Client not connected, current status: UNHEALTHY
```

服务启动直接失败。**解法**：按项目原本的方式**开启**鉴权
（`NACOS_AUTH_ENABLE=true` + `NACOS_AUTH_TOKEN`），客户端用默认 `nacos/nacos` 正常登录。

### 3. 两个 provider 产不出可执行 jar

根 `pom.xml` 只在 `pluginManagement` 里配了 `spring-boot-maven-plugin`，
模块要自己在 `build/plugins` 里声明才能继承到 `repackage` 绑定。结果：

- 声明了的：`sc-gateway`、`pguide-auth`、`pguide-user-provider`、`pguide-competition-manage-provider`、`pguide-search-provider`
- **没声明的**：`pguide-project-match-provider`、`pguide-index-info-provider`

后两个出来的是没有 `Main-Class` 的普通 jar。

**解法**：`docker/backend.Dockerfile` 里显式补跑，**不改源码**：

```dockerfile
mvn -pl <那两个模块> package org.springframework.boot:spring-boot-maven-plugin:2.6.6:repackage
```

`package` 必须和 `repackage` 写在**同一次** mvn 调用里。
`repackage` 读 `project.getArtifact().getFile()`，只单独调 goal 时该值为 null，
会报 `Source file must not be null`（第一次构建就栽在这）。

### 4. 直连 Maven Central 太慢

项目 pom 里没有任何 `<repositories>` / `<mirror>`。实测直连
`repo.maven.apache.org` **20 分钟只拉了 82MB**，而这个 59 模块工程首次要 300MB+。

**解法**：`docker/maven-settings.xml` 配阿里云公共仓库，
构建时间从 20 分钟+ 降到 **3 分 27 秒**。海外环境删掉 Dockerfile 里 COPY 那一行即可。

### 5. `search-provider` 的注册名是错的

`pguide-search-provider/src/main/resources/bootstrap.yml` 里
`spring.application.name` 被复制粘贴写成了 `pguide-competition-manage`，
会和 CMS 服务**抢同一个注册名**（网关负载均衡可能把 CMS 请求打到搜索服务）。

**解法**：不改源码，用命令行参数覆盖（优先级高于所有 yml 和环境变量）：

```yaml
APP_ARGS: "--spring.application.name=pguide-search"
```

### 6. 建表 SQL 漏了 5 个列，登录链路直接崩

`docker/init/` 的 SQL 是反推重建的（见下节）。实际跑起来发现 3 张表缺列：

| 表 | 缺的列 | 后果 |
|---|---|---|
| `usercenter_student_info` | `student_name`、`student_nick` | 查学生信息 `Unknown column` |
| `usercenter_teacher_info` | `teacher_name`、`teacher_nick` | 查教师信息 `Unknown column` |
| `mms_project_info` | `project_type_id` | 创建项目写库失败 |

已补进 `docker/init/30-pguide-business-schema.sql`。
另外字典表原本是**空的**，`ProjectDict` 启动时加载空表会让创建项目必然报
"项目竞赛类别有误"，所以加了 `docker/init/90-demo-seed.sql`（见「演示数据」）。

### 7. 手机号字段类型溢出（源码 bug，已修）

`UsercenterStudentInfo.studentPhonenumber` 声明成了 `Integer`，
但 11 位手机号（13800000001 ≈ 1.38e10）超出 `Integer` 上限 2.147e9：

```
java.sql.SQLDataException: Value '13800000001' is outside of valid range for type java.lang.Integer
```

任何带真实手机号的学生/教师记录都会让查询失败，登录链路必崩。
姊妹工程 `PGuide-Manage` 里的同名实体用的是 `Long`，可见 `Integer` 是笔误。
已改成 `String`（与 `varchar(11)` 列最匹配，对数值列也兼容）。

### 8. `index-info` 有两处包扫描配置错误（源码 bug，已修）

1. `IndexInfoProviderApplication` 在 `org.pguide.provider.index.info`，
   而 service bean 在 `org.pguide.index.info.service.impl`。
   `BaseConfig` 的 `@ComponentScan` 没覆盖后者 →
   `UnsatisfiedDependencyException: No qualifying bean of type IndexPartboxInfoService`。
2. `MybatisConfig` 的 `@MapperScan("org.pguide.entity.index.info.mapper")`
   **指向一个不存在的包**（entity 模块只有 `...info.entity.*`）。
   真正的 mapper 在 `org.pguide.index.info.mapper`，且这些接口**没有 `@Mapper` 注解**
   （不像 project-match 那边的 mapper），只能靠 `@MapperScan` 注册 →
   修完第 1 条后立刻又崩在 `No qualifying bean of type IndexPartboxInfoMapper`。

### 9. 管理后台缺 `myes.*` 会直接启动失败

`pguide-back-mms-manage` 的 `PguideElasticSearchConfiguration` 用
`@Value("${myes.host}")` / `${myes.username}` / `${myes.password}` 读值，
而这三行在 `ruoyi-admin/application.yml` 里原本也是 `**`（`password:**` 甚至没空格），
被归一化脚本一并删掉了。不补就是：

```
IllegalArgumentException: Could not resolve placeholder 'myes.password'
  → Error creating bean with name 'pguideElasticSearchConfiguration'
  → Error creating bean with name 'projectPublishController'
```

**解法**：compose 里给 manage 服务补上 `MYES_HOST` / `MYES_USERNAME` / `MYES_PASSWORD`。
`RestHighLevelClient` 是懒连接，所以 `manage` profile 不带 Elasticsearch 也能启动
（只是 CMS 的 ES 检索接口调不通，要用得加 `--profile full`）。

> 注意：Ruoyi 自己的 `DruidProperties` 也有一堆 `@Value("${spring.datasource.druid.*}")`，
> 但那些属性**没有**被脱敏，所以不受影响。被脱敏的只有各数据源的
> `url` / `username` / `password` 三行，而它们由 Druid 的 `@ConfigurationProperties`
> 按前缀绑定，用环境变量覆盖即可。

---

## 五、对源码的改动清单

为了让服务真能跑起来，动了 **4 个 Java 文件**（都是明确的 bug），
新增了 Docker 相关文件，并补了建表 SQL。业务逻辑一行没改。

| 文件 | 改动 |
|---|---|
| `PGuide-Back/.../pguide-index-info-provider/.../config/BaseConfig.java` | 补 `@ComponentScan("org.pguide.index.info")` |
| `PGuide-Back/.../pguide-index-info-service/.../config/MybatisConfig.java` | `@MapperScan` 指向修正为 `org.pguide.index.info.mapper` |
| `PGuide-Back/.../pguide-user-entity/.../UsercenterStudentInfo.java` | `studentPhonenumber`: `Integer` → `String` |
| `PGuide-Back/.../pguide-user-entity/.../UsercenterTeacherInfo.java` | `teacherPhonenumber`: `Integer` → `String` |
| `docker/init/30-pguide-business-schema.sql` | 补 3 张表共 5 个缺失列 |

每个改动点在文件里都留了注释说明原因。要还原上游状态，`git checkout` 这几个文件即可
（但 `index-info` 会重新变回起不来）。

---

## 六、编排设计说明

### 用环境变量覆盖，不改源码里的连接配置

仓库里 10 个 yml 的连接信息全是 `**`。与其把源码改成本地正确值（改动混进业务代码、
以后 `git pull` 冲突），不如统一用 Spring Boot 的 relaxed binding 在 compose 里覆盖：

```yaml
SPRING_DATASOURCE_URL: "jdbc:mysql://mysql:3306/pguide_project_mms?..."
SPRING_CLOUD_NACOS_SERVER_ADDR: nacos:8848
SPRING_REDIS_HOST: redis
```

只有 `**` 导致的 YAML 语法错误没法用环境变量绕过——那个放在构建期脚本里处理，
仍然不落到磁盘上的源文件。

### 关掉 Nacos 配置中心，只留服务发现

各服务 `bootstrap.yml` 里写死了**互不相同的 namespace UUID** + `group: dev`，
还引用了（源码里被注释掉的）`mysql.yml` / `redis.yml`。本地没有那套配置：

```yaml
SPRING_CLOUD_NACOS_CONFIG_ENABLED: "false"
```

服务发现保持打开——网关的 `lb://pguide-project-match` 完全依赖它。

### 复用 maven 镜像当运行时基座

`eclipse-temurin:8-jre` 本机没有，要访问 Docker Hub（国内经常被阻断）。
而 `maven:3.8.6-openjdk-8` 已在本地。代价是镜像偏大（每个约 970MB），
但 **8 个镜像共享同一层**，实际磁盘占用只有一份基础镜像 + 几个 jar 层。
想换精简 JRE 就改 Dockerfile 里 runtime 阶段的 `FROM`。

### 一个 builder 编全部

7 个微服务共用 `docker/backend.Dockerfile` 的 builder 阶段，靠 `ARG SERVICE_MODULE`
选拷哪个 jar。BuildKit 缓存使 **59 个模块只真正编译一次**，后面 6 个镜像秒级完成。
`SERVICE_MODULE` / `SERVICE_PORT` 只在 runtime 阶段声明，所以换服务不会让编译层失效。

### `APP_ARGS` 逃生口

```sh
exec java $JAVA_OPTS -jar /app/app.jar $APP_ARGS
```

命令行参数优先级高于 yml 也高于环境变量，用来处理 `spring.application.name`
这种压不住的情况（第 5 条）。

---

## 七、目录

```
compose.yaml                 编排入口（仓库根目录）
.dockerignore                排除 node_modules（205MB，占仓库九成）等
docker/
├── backend.Dockerfile       PGuide-Back 微服务通用镜像（builder + runtime）
├── manage.Dockerfile        RuoYi 管理后台镜像
├── maven-settings.xml       阿里云 Maven 镜像（加速构建）
├── normalize-config.sh      构建期剥离脱敏占位行
├── init/                    MySQL 初始化 SQL（仅在数据卷首次创建时执行）
│   ├── 00-databases.sql                建 5 个库
│   ├── 20-ruoyi-vue-3.8.6-baseline.sql RuoYi 19 张系统表
│   ├── 30-pguide-business-schema.sql   24 张业务表（已补 5 个缺失列）
│   ├── 40-pguide-back-schema.sql       5 张微服务补充表
│   └── 90-demo-seed.sql                演示数据（可删）
└── README.md               本文件
```

---

## 八、建表 SQL 与演示数据的来历（重要）

### 建表 SQL 是反推重建的，不是原始 DDL

项目原始 DDL 已彻底丢失：全组织 12 个仓库、所有分支，`.sql` 文件命中数为 0。
这批脚本来自姊妹仓库 `PGuide-Manage-Main/pguide-infra/init/`，
是把两个来源交叉比对后重建的：

- 实体类的 `@TableId` / `@TableField` / 字段声明 → 字段名与类型
- mapper XML 的 `<resultMap>` `column` 列表 → 列名的权威来源

**字符串长度、数值宽度、索引是推测值**。遇到 `Data too long for column`
按提示改长度即可。

### 演示数据（`90-demo-seed.sql`）

⚠️ **不是项目原始数据**，是照着代码里读到的约定反推的最小种子集：

- **`student001` / `123456`、`teacher001` / `123456`** —— 用来打通登录链路。
  登录接口按 `student_account` 查表并比对**明文密码**，所以密码就是明文。
- **mms 三张字典表** —— 代码启动时全量加载（`ProjectDict` 的 `@PostConstruct`），
  空表会让创建项目必报"项目竞赛类别有误"。
- **cms 科目字典** —— 前端学科分类树（`/cms/subject/tree`）的数据源。

不想要这些数据：删掉该文件后 `docker compose down -v && docker compose up -d`。

---

## 九、前端

前端是独立的 monorepo `PGuide-Front/`（Vue3 + Vite + TypeScript，pnpm workspace），
**不在这套编排里**，要单独起 dev server（本机 Node ≥ 20.19）。

```bash
cd PGuide-Front
pnpm install          # 首次

pnpm dev:manage       # 管理后台  → http://localhost:81
pnpm dev             # 组队中心  → http://localhost:4000
pnpm dev:auth        # 鉴权中心  → http://localhost:99
```

三个应用是三个前台进程，**要各起一个终端**（或者用 `Start-Job` / `&` 放后台）。
代理目标写死在各自的 `vite.config.ts` 里，可用 `VITE_PROXY_TARGET` 覆盖：

| 应用 | 端口 | 代理 | 需要哪个 profile |
|---|---|---|---|
| `apps/manage` 管理后台 | 81 | `/dev-api` → `http://localhost:8080`（转发时去掉前缀） | `manage` |
| `apps/match` 组队中心 | 4000 | `/api` → `http://localhost:666`（网关） | `back` |
| `apps/auth` 鉴权中心 | 99 | `/api` → `http://localhost:666`（网关） | `back` |

登录账号：管理后台 `admin` / `admin123`（来自 `20-ruoyi-vue-3.8.6-baseline.sql`）；
组队中心/鉴权中心的演示账号 `student001` / `123456`（来自 `90-demo-seed.sql`）。

管理后台的菜单有一部分来自 `docker/init/95-pguide-manage-menus.sql`，
而 init 脚本**只在数据卷首次创建时执行** —— 数据卷已存在时要手工补一遍
（脚本用 `INSERT IGNORE` 写，重复执行安全）：

```bash
docker exec -i -e MYSQL_PWD=pguide123 pguide-dev-mysql mysql -uroot \
  --default-character-set=utf8mb4 < docker/init/95-pguide-manage-menus.sql
```

> 旧的四套 Vue2 工程（`pguide-match-ui`、`pguide-auth-ui`、`pguide-ui-demo`、
> `PGuide-Manage/ruoyi-ui`）保留在仓库里作对照，**不再维护**；
> `ruoyi-ui` 还要求 Node 16，与本机 Node 24 不兼容。新功能一律写在
> `PGuide-Front/apps/*`，工程约定见 `dev-manual/`，管理端细节见
> `PGuide-Front/apps/manage/README.md`。

---

## 十、已知限制

1. **数据库是反推重建的**，字段长度和索引未经真实数据验证。
2. **ES 里没有索引**。`search` 服务能启动、能注册，但真正搜索前得先建
   `pguide_search` 索引并灌数据。
3. **网关没有内部密钥校验**。源码里就有这条 TODO：
   `//TODO 添加密钥，防止请求恶意绕过网关打入微服务内部`。
   也就是可以直接打 `localhost:12002` 绕过网关鉴权。本地试验没问题，别对外。
4. **`SubSystemPguideStudentStrategy.doAction` 有个空指针顺序错误**：
   第 48 行先 `data.getStudentSchool()`，第 55 行才 `if(data==null)`。
   账号不存在时不是返回"登录失败"而是抛 NPE（被全局异常处理器兜成 code 500）。
   没改它，因为属于业务逻辑范畴，不影响正常登录。
5. **Druid 监控台弱口令** `ruoyi` / `123456`（RuoYi 自带），http://localhost:8080/druid
6. **10 个 provider 只有 `Main.java` 占位**（rbac / contact / resume / group / place /
   consumable / life / coin / index-resource / cloud），编排里没有它们，起了也没接口。
