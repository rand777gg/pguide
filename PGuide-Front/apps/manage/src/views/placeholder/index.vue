<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 兜底页。
 *
 * 为什么需要它：RuoYi 的菜单由数据库 `sys_menu.component` 驱动。
 * 当某条菜单指向的组件在当前前端里不存在时，老 ruoyi-ui 会**静默白屏**
 * —— `loadView` 返回 undefined，没有任何提示，排查起来很痛苦。
 *
 * 这里改成显式渲染一个说明页，并区分两种完全不同的情况
 * （标记由 `buildRoutes` 写在路由 meta 上）：
 *
 *   meta.unimplemented = true   → 功能还没做，属预期（如代码生成器、定时任务）
 *   否则                         → sys_menu.component 配错了，要去菜单管理里改
 *
 * 两种情况的下一步动作不一样，所以文案必须分开，不能都说「尚未实现」。
 */
const route = useRoute()

const missingComponent = computed(() => route.meta?.missingComponent as string | undefined)
const unimplemented = computed(() => route.meta?.unimplemented === true)
</script>

<template>
  <el-card shadow="never" class="placeholder">
    <el-result
      v-if="unimplemented"
      icon="info"
      title="该功能尚未实现"
      sub-title="这个菜单是 RuoYi 自带、而当前前端有意没做的功能。"
    >
      <template #extra>
        <p class="placeholder__line">
          当前路由：<code>{{ route.path }}</code>
        </p>
        <p v-if="missingComponent" class="placeholder__line">
          对应组件：<code>views/{{ missingComponent }}.vue</code>
        </p>
        <p class="placeholder__line placeholder__line--hint">
          要实现它：在 <code>apps/manage/src/views/</code> 下建这个组件即可
          （路径与 <code>sys_menu.component</code> 一致）；
          不需要这条菜单的话，在「菜单管理」里停用或删掉它。
        </p>
      </template>
    </el-result>

    <el-result
      v-else
      icon="warning"
      title="菜单配置有误"
      sub-title="这条菜单指向的组件在前端不存在，路由回退到了这个占位页。"
    >
      <template #extra>
        <p class="placeholder__line">
          当前路由：<code>{{ route.path }}</code>
        </p>
        <p v-if="missingComponent" class="placeholder__line placeholder__line--warn">
          缺失组件：<code>views/{{ missingComponent }}.vue</code>
        </p>
        <p class="placeholder__line placeholder__line--hint">
          多半是数据库 <code>sys_menu.component</code> 写错了 ——
          去「系统管理 → 菜单管理」把这条菜单的组件路径改成真实存在的页面
          （对照 <code>apps/manage/src/views/</code> 下的目录）。
        </p>
      </template>
    </el-result>
  </el-card>
</template>

<style scoped lang="scss">
.placeholder {
  &__line {
    font-size: 13px;
    line-height: 1.9;

    code {
      padding: 1px 5px;
      border-radius: 3px;
      background-color: #f5f7fa;
      font-family: Consolas, Monaco, monospace;
    }

    &--warn {
      color: var(--el-color-danger);
    }

    &--hint {
      color: var(--pg-text-secondary);
    }
  }
}
</style>
