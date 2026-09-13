<script setup lang="ts">
import { useRoute } from 'vue-router'

/**
 * 未实现菜单的兜底页。
 *
 * 为什么需要它：RuoYi 的菜单由数据库 `sys_menu.component` 驱动。
 * 当某条菜单指向的组件在当前前端里不存在时，老 ruoyi-ui 会**静默白屏**
 * —— `loadView` 返回 undefined，没有任何提示，排查起来很痛苦。
 *
 * 这里改成显式渲染一个说明页，把「哪个路径、缺什么组件」写在界面上。
 */
const route = useRoute()
</script>

<template>
  <el-card shadow="never" class="placeholder">
    <el-result icon="warning" title="该页面尚未实现">
      <template #sub-title>
        <p class="placeholder__line">
          菜单指向的组件在前端还不存在，所以路由回退到了这个占位页。
        </p>
        <p class="placeholder__line">
          当前路由：<code>{{ route.path }}</code>
        </p>
        <p class="placeholder__line placeholder__line--hint">
          要补上它：在 <code>apps/manage/src/views/</code> 下创建对应组件，
          路径要和数据库 <code>sys_menu.component</code> 字段一致；
          如果不想显示这条菜单，把它在菜单管理里停用即可。
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

    &--hint {
      color: var(--pg-text-secondary);
    }
  }
}
</style>
