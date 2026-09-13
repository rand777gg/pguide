# 03 · Git 规范

## 1. 分支模型

```
main                       ← 只放可发布状态，禁止直接提交
 └── dev-<名字缩写>        ← 个人日常开发分支（如 dev-wjq / dev-lfx）
      └── feat-<编号>-<主题>   ← 单个功能/迁移，完成后合并回 dev
      └── fix-<编号>-<主题>    ← 单个修复
```

### 命名规则

| 类型 | 格式 | 例子 |
|---|---|---|
| 功能 | `feat-<两位序号>-<英文短语>` | `feat-02-usercenter`、`feat-03-vue3` |
| 修复 | `fix-<两位序号>-<英文短语>` | `fix-04-login-token` |
| 个人分支 | `dev-<名字缩写>` | `dev-wjq` |

**不要用中文分支名**（Windows 上 `core.autocrlf` + 某些 Git 客户端会出问题）。

### 分支纪律

1. **不要直接在 `main` 上开发**。这个仓库的 `main` 历史上只有
   `first commit` 和一条 readme，不是有效基线。
2. **新功能从最新的 `dev-*` 切分支**，不要从 `main` 切（落后太多）。
3. **禁止私自合并共有分支**。任何非本地合并（合到 `dev-*` / `main`）先提 PR。
4. 合并前先 `git fetch && git rebase` 自己的分支，保持线性历史。

---

## 2. 提交信息

格式（Conventional Commits）：

```
<type>(<scope>): <简述>

<详细说明：为什么这么改，而不是改了什么>

<可选的 BREAKING CHANGE / 关联 issue>
```

### type 取值

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修 bug |
| `refactor` | 重构（不改变外部行为） |
| `perf` | 性能优化 |
| `docs` | 只改文档 |
| `style` | 只改格式（空格、分号），不影响逻辑 |
| `test` | 增加/修改测试 |
| `build` | 构建系统、依赖变更 |
| `ci` | CI 配置 |
| `chore` | 杂项（不改 src 也不改测试） |
| `revert` | 回滚 |

### scope 取值

用**模块名**，不要用文件名：

`auth` / `user` / `mms` / `cms` / `gateway` / `docker` / `front` / `manual` / `manage`

### 好例子 vs 坏例子

```
# ❌ 说不清改了什么，也说不清为什么
fix: bug
update
提交

# ❌ 一次提交混了多件事，出问题没法单独回滚
feat: 改了一堆东西

# ✅ 简述说"做了什么"，正文说"为什么"
fix(auth): 手机号字段用 Integer 存不下 11 位手机号

UsercenterStudentInfo.studentPhonenumber 声明为 Integer，
但 11 位手机号（13800000001 ≈ 1.38e10）超出 Integer 上限 2.147e9，
查询时抛 SQLDataException，导致所有学生查询（含登录链路）失败。

数据库列是 varchar(11)，改为 String。
姊妹工程 PGuide-Manage 里的同名实体用的是 Long 而非 Integer。
```

### 一次提交只做一件事

判断标准：**能不能用一句话说清这次提交**。说不清就是该拆。

反例：把"重构 API 层"和"修登录 bug"放进同一个 commit，
将来要回滚登录修复就会把重构一起回滚掉。

---

## 3. 提交前必须做的检查

```bash
# 前端
cd PGuide-Front
pnpm lint          # ESLint
pnpm type-check    # vue-tsc
pnpm test          # Vitest

# 一键（根目录）
pnpm lint && pnpm type-check && pnpm test
```

**不允许提交编译不过 / lint 报错的代码。** 详见 [08-质量门禁](./08-质量门禁.md)。

### 检查改动范围

```bash
git status              # 别把 IDE 配置、日志、临时文件带进去
git diff --cached       # 提交前看一眼暂存区到底有什么
```

本项目已经踩过的坑：`node_modules`（205MB）一度出现在仓库里。

---

## 4. 换行符：必须是 LF

仓库根目录有 `.gitattributes`，配置为 `* text=auto eol=lf`。

**这不是风格问题，是硬故障。** 本机 `core.autocrlf=true`，默认会把签出文件
转成 CRLF，而：

- `docker/*.Dockerfile` 用 `RUN ... \` 做行继续，CRLF 会让构建**直接失败**
- `docker/normalize-config.sh` 是 shell 脚本，CRLF 会让 Linux 容器报
  `bad interpreter`
- ESLint / Prettier 默认按 LF 校验

**不要删掉或修改 `.gitattributes`。** 新增需要 CRLF 的文件（如 `.bat`）
单独加规则。

---

## 5. 不要提交的东西

`.gitignore` 已覆盖，但提交前仍要自查：

| 类型 | 例子 |
|---|---|
| 依赖 | `node_modules/`、`.pnpm-store/` |
| 产物 | `dist/`、`target/`、`*.jar` |
| 自动生成 | `src/types/auto-imports.d.ts`、`src/types/components.d.ts` |
| 本地配置 | `.env.local`、`.env.*.local`、`.idea/`、`.vscode/*`（除 `extensions.json`） |
| 日志与缓存 | `*.log`、`coverage/`、`.vite/` |
| **任何密钥** | 数据库密码、Nacos 密码、API Key、token |

### 关于密钥（这个项目有前科）

后端 `PGuide-Back` 的 yml 里曾经把 Nacos / MySQL / Redis 地址和**明文密码**
提交进了仓库。整合版为了脱敏又把值替换成 `**`，结果 `*` 是 YAML 的别名符号，
配置**直接无法解析**，应用起不来。

**规则**：

1. 代码和配置模板里**永远不写真实凭据**，一律用环境变量。
2. `.env.development` 只放不含密钥的配置（地址、开关）。
   需要密钥时提交 `.env.example` 作模板，真实文件加进 `.gitignore`。
3. 已经进过 git 历史的凭据**视为已泄露**，必须轮换，
   不是"删掉那一行就行"。

---

## 6. PR 流程

1. 从最新 `dev-*` 切出 `feat-*` / `fix-*`
2. 开发过程中保持**小步提交**（每个 commit 单一目的）
3. 推送前 `git rebase` 到最新 `dev-*`，解决冲突
4. 提 PR，描述里写清：
   - 解决了什么问题（贴现象/报错）
   - 怎么验证的（命令 + 预期输出）
   - 有哪些已知限制 / 待办
5. 至少一人 review 后再合并
6. 合并后删除功能分支

### PR 描述模板

```markdown
## 背景
客户端在无 token 访问受保护接口时返回 500 而不是 401。

## 改动
- 网关 GlobalJWTFilter 增加 null 判断
- 补充单元测试覆盖无 token 场景

## 验证
\`\`\`bash
curl.exe -s -o NUL -w "%{http_code}" http://localhost:666/api/mms/create/test
# 期望 401，实际 401
\`\`\`

## 已知限制
内部服务仍可绕过网关直连（源码里已有 TODO），本次不改。
```
