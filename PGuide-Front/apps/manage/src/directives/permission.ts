import type { App, Directive } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * 权限指令，对应 RuoYi 的 `v-hasPermi` / `v-hasRole`。
 *
 * 用法：
 *   <el-button v-has-permi="['manage:projectinfo:add']">新增</el-button>
 *   <el-button v-has-role="['admin']">删除</el-button>
 *
 * 权限字符串来自 `/getInfo` 返回的 permissions / roles 数组
 * （后端由 `SysMenuServiceImpl` 按用户角色聚合，管理员是 `*:*:*`）。
 *
 * ⚠️ 这只是**界面层的可见性控制**，不是安全边界。
 * 后端每个接口都有 `@PreAuthorize("@ss.hasPermi('xxx')")` 兜底，
 * 前端隐藏按钮只是避免用户点了报错。
 */

function hasPermission(required: string[], owned: string[]): boolean {
  if (required.length === 0) return true
  // 超级管理员权限通配
  if (owned.includes('*:*:*')) return true
  return required.some((item) => owned.includes(item))
}

const hasPermi: Directive<HTMLElement, string[]> = {
  mounted(el, binding) {
    const store = useUserStore()
    if (!hasPermission(binding.value ?? [], store.permissions)) {
      el.parentNode?.removeChild(el)
    }
  },
}

const hasRole: Directive<HTMLElement, string[]> = {
  mounted(el, binding) {
    const store = useUserStore()
    if (!hasPermission(binding.value ?? [], store.roles)) {
      el.parentNode?.removeChild(el)
    }
  },
}

export function setupPermissionDirectives(app: App): void {
  app.directive('has-permi', hasPermi)
  app.directive('has-role', hasRole)
}
