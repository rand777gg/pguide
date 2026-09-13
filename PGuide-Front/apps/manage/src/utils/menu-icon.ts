import type { Component } from 'vue'
import {
  Setting,
  Monitor,
  Tools,
  User,
  UserFilled,
  OfficeBuilding,
  Menu as MenuIcon,
  Postcard,
  Collection,
  Document,
  Histogram,
  Timer,
  DataLine,
  Cpu,
  Coin,
  Link,
  EditPen,
  Grid,
  Trophy,
  Files,
  Reading,
} from '@element-plus/icons-vue'

/**
 * 菜单图标映射。
 *
 * ── 为什么要手写这张表 ──
 *
 * 两个原因：
 *
 * 1. **后端存的是 RuoYi 自己的图标名**（`sys_menu.icon`，取值如
 *    `system` / `monitor` / `peoples` / `dict` / `job`），
 *    它们对应老 ruoyi-ui 里的 `src/assets/icons/svg/*.svg`。
 *    这些名字和 Element Plus 的图标名（PascalCase，如 `Setting`）**对不上**，
 *    所以必须显式映射，否则图标全是空的。
 *
 * 2. **不能用 `import * as Icons from '@element-plus/icons-vue'`** ——
 *    那会把全部一千多个图标打进产物（源包 3.2MB，实测让 chunk 从 916KB
 *    涨到 1MB+）。显式引入只打包用到的这几个，代价是几 KB。
 *
 * 新增菜单图标时：在下面补一条映射即可。找不到的名字会回退成默认图标，
 * 不会报错也不会白屏。
 */
const MENU_ICONS: Record<string, Component> = {
  // RuoYi 内置菜单
  system: Setting,
  monitor: Monitor,
  tool: Tools,
  user: User,
  peoples: UserFilled,
  dept: OfficeBuilding,
  role: UserFilled,
  menu: MenuIcon,
  post: Postcard,
  dict: Collection,
  edit: EditPen,
  log: Document,
  operlog: Document,
  logininfor: Histogram,
  job: Timer,
  druid: DataLine,
  server: Cpu,
  cache: Coin,
  build: Grid,
  code: Files,
  swagger: Link,

  // 除 RuoYi 自带外，pguide 业务菜单会用到
  mms: Trophy,
  cms: Trophy,
  project: Reading,
  competition: Trophy,
  subject: Collection,
  student: Reading,
  teacher: Reading,
}

/** 找不到映射时的默认图标 */
const FALLBACK_ICON: Component = MenuIcon

export function resolveMenuIcon(name?: string | null): Component | undefined {
  if (!name) return undefined
  return MENU_ICONS[name] ?? FALLBACK_ICON
}
