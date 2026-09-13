import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 权限串与菜单配置的一致性检查（前端 ↔ 后端 ↔ 菜单 SQL）。
 *
 * ── 为什么要有这个测试 ──
 *
 * 前端页面里的 `permission="xxx"` 前缀、`sys_menu` 里的权限串、
 * 后端 `@PreAuthorize("@ss.hasPermi('xxx:add')")`，是三份**必须一致**的数据。
 * 写不一致时的表现非常阴险：
 *
 *   管理员（permissions = `*:*:*`）一切正常，看不出任何问题；
 *   普通角色则是按钮全消失 + 接口 403 —— 要等分配了另一个角色才会发现。
 *
 * 实际踩过两次（都在 `docker/init/95-pguide-manage-menus.sql` 的历史里）：
 *   1. CMS 菜单写成 `cmsmanage:*`，但 Controller 用的是 `manage:*`
 *      （`cmsmanage` 只是 URL 前缀，不是权限前缀）
 *   2. 学生/教师菜单写成 `project:info:student:*`，但两个 Controller 用的都是
 *      `project:info:*`
 *
 * 所以这里把「真值来源」固定为后端 Java 源码（`@PreAuthorize`），
 * 反向校验前端与菜单 SQL —— 后端改权限串时，这个测试会指出前端/菜单哪里没跟上。
 *
 * ── 覆盖范围 ──
 *
 * 1. 每个页面 `permission` 前缀都能在后端找到对应的 authority
 * 2. `business.ts` 里每个 CRUD 路径都能在后端找到对应的 `@RequestMapping`
 * 3. 菜单 SQL 里的 `component` 路径都在 `src/views/` 下真实存在
 *    （路径写错时前端会落到占位页 —— 能跑但页面是空的，也不容易发现）
 *
 * 后端源码不在（比如只 checkout 了前端），相关用例自动跳过。
 */

/**
 * 找仓库根目录：从当前工作目录往上找同时含 PGuide-Front 与 PGuide-Manage 的那一层。
 *
 * 不用 `import.meta.url`：vitest 在 jsdom 环境下这个值不是 file:// 协议，
 * `fileURLToPath` 会直接抛 "The URL must be of scheme file"。
 * 也不用写死层数 —— 文件挪一次就失效了。
 */
function findRepoRoot(start: string): string {
  let dir = start
  for (let i = 0; i < 10; i += 1) {
    if (existsSync(join(dir, 'PGuide-Front')) && existsSync(join(dir, 'PGuide-Manage'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return start
}

const REPO_ROOT = findRepoRoot(process.cwd())
/** 本应用根目录：从 apps/manage 下跑就是 cwd，否则按仓库结构拼 */
const APP_ROOT = existsSync(join(process.cwd(), 'src/views'))
  ? process.cwd()
  : join(REPO_ROOT, 'PGuide-Front/apps/manage')
/** PGuide-Manage 后端（RuoYi 单体：系统管理 + pguide 业务模块都在这里） */
const BACKEND_SRC = join(REPO_ROOT, 'PGuide-Manage/PGuide-Manage')
const MENU_SQL = join(REPO_ROOT, 'docker/init/95-pguide-manage-menus.sql')

/** 后端源码在不在（不在就跳过跨仓库的那几条用例） */
const hasBackend = existsSync(BACKEND_SRC)

/** 递归收集文件（自己走一遍，不依赖 Node 版本的 recursive 选项） */
function walk(dir: string, filter: (name: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, filter, out)
    } else if (filter(entry)) {
      out.push(full)
    }
  }
  return out
}

function readAll(files: string[]): string {
  return files.map((file) => readFileSync(file, 'utf8')).join('\n')
}

/** 收集某个正则的捕获组 */
function collect(source: string, pattern: RegExp): string[] {
  const result: string[] = []
  for (const match of source.matchAll(pattern)) {
    if (match[1]) result.push(match[1])
  }
  return result
}

/** 后端所有权限串（真值来源） */
function backendAuthorities(): string[] {
  const java = readAll(walk(BACKEND_SRC, (name) => name.endsWith('.java')))
  return collect(java, /hasPermi\(\s*'([^']+)'\s*\)/g)
}

/** 后端所有接口路径（类级 @RequestMapping） */
function backendPaths(): string[] {
  const java = readAll(walk(BACKEND_SRC, (name) => name.endsWith('.java')))
  return collect(java, /@RequestMapping\(\s*(?:value\s*=\s*)?"([^"]+)"/g)
}

/** 页面上声明的权限前缀：views/xxx/index.vue → permission="yyy" */
function frontendPermissions(): Array<{ file: string; permission: string }> {
  const views = walk(join(APP_ROOT, 'src/views'), (name) => name.endsWith('.vue'))
  const found: Array<{ file: string; permission: string }> = []

  for (const file of views) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/permission="([^"]+)"/g)) {
      if (match[1]) {
        found.push({ file: relative(APP_ROOT, file).replace(/\\/g, '/'), permission: match[1] })
      }
    }
  }
  return found
}

/** business.ts 里 createCrudApi 用的接口路径 */
function frontendCrudPaths(): string[] {
  const source = readFileSync(join(APP_ROOT, 'src/api/modules/business.ts'), 'utf8')
  return collect(source, /createCrudApi<[^>]*>\(\s*'([^']+)'/g)
}

/** 菜单 SQL 里的 component 路径 */
function menuComponents(): string[] {
  const source = readFileSync(MENU_SQL, 'utf8')
  return collect(source, /'([a-z][\w/]*\/index)'/g)
}

describe('权限前缀与后端 @PreAuthorize 一致', () => {
  it.runIf(hasBackend)('每个页面的 permission 前缀都能在后端找到对应权限点', () => {
    const authorities = backendAuthorities()
    expect(authorities.length).toBeGreaterThan(50)

    const mismatched = frontendPermissions()
      .filter(({ permission }) => !authorities.some((auth) => auth.startsWith(`${permission}:`)))
      // 断言失败时直接把这些字符串打出来，省得再去页面里找
      .map(({ file, permission }) => `${file}: ${permission}`)

    expect(mismatched).toEqual([])
  })

  it.runIf(hasBackend)('扫描到的页面权限前缀数量符合预期（防止正则失效导致空跑）', () => {
    // 页面数量只会增加；这里给个下界，正则写坏时能立刻发现
    expect(frontendPermissions().length).toBeGreaterThanOrEqual(11)
  })
})

describe('业务接口路径与后端 @RequestMapping 一致', () => {
  it.runIf(hasBackend)('business.ts 里的 CRUD 路径都真实存在', () => {
    const paths = backendPaths()
    expect(paths.length).toBeGreaterThan(10)

    const unknown = frontendCrudPaths().filter((path) => !paths.includes(path))

    expect(unknown).toEqual([])
  })

  it('解析出的业务模块数量不少于 11 个（防止正则失效导致空跑）', () => {
    expect(frontendCrudPaths().length).toBeGreaterThanOrEqual(11)
  })
})

describe('菜单 SQL 的组件路径都存在', () => {
  it('component 指向的 .vue 文件真实存在（写错会静默落到占位页）', () => {
    const components = menuComponents()
    expect(components.length).toBeGreaterThanOrEqual(6)

    const missing = components.filter(
      (component) => !existsSync(join(APP_ROOT, 'src/views', `${component}.vue`)),
    )

    expect(missing).toEqual([])
  })
})
