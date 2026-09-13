<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

/**
 * 首页概览。
 *
 * 老 ruoyi-ui 的 dashboard 有四个统计卡片 + 折线图 + 饼图（用 echarts）。
 * 这里先做成轻量的信息页：当前登录身份 + 可见菜单数量 + 快捷入口。
 * 需要图表时再引 echarts —— 老工程为一个首页引入了一整个 echarts（1MB+）。
 */
const userStore = useUserStore()
const permissionStore = usePermissionStore()

const menuCount = computed(() => countMenus(permissionStore.dynamicRoutes))

function countMenus(routes: unknown[]): number {
  let count = 0
  for (const item of routes as { children?: unknown[] }[]) {
    count += 1
    if (item.children?.length) count += countMenus(item.children)
  }
  return count
}
</script>

<template>
  <div class="dashboard">
    <el-card shadow="never" class="dashboard__welcome">
      <div class="dashboard__welcome-inner">
        <el-avatar :size="52" :src="userStore.avatar" />
        <div>
          <h2 class="dashboard__hello">
            你好，{{ userStore.nickName || userStore.userName }}
          </h2>
          <p class="dashboard__meta">
            账号 {{ userStore.userName }} ·
            角色 {{ userStore.roles.join('、') || '—' }}
          </p>
        </div>
      </div>
    </el-card>

    <el-row :gutter="16" class="dashboard__stats">
      <el-col :span="8">
        <el-card shadow="never">
          <el-statistic title="可见菜单项" :value="menuCount" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <el-statistic title="权限点" :value="userStore.permissions.length" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <el-statistic title="角色数" :value="userStore.roles.length" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>关于这个后台</template>
      <p class="dashboard__note">
        这是替代 ruoyi-ui 的 Vue3 版本。菜单由后端 <code>sys_menu</code> 表驱动，
        通过 <code>/getRouters</code> 下发后动态注册路由。
      </p>
      <p class="dashboard__note">
        列表页统一使用配置驱动的
        <code>CrudPage</code> 组件 + <code>useCrud</code> 组合式函数，
        页面文件只需声明接口、列与表单字段。
      </p>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--pg-spacing-md);

  &__welcome-inner {
    display: flex;
    align-items: center;
    gap: var(--pg-spacing-md);
  }

  &__hello {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  &__meta {
    font-size: 13px;
    color: var(--pg-text-secondary);
  }

  &__stats {
    margin: 0;
  }

  &__note {
    font-size: 13px;
    line-height: 1.9;
    color: var(--pg-text-regular);

    code {
      padding: 1px 5px;
      border-radius: 3px;
      background-color: #f5f7fa;
      font-family: Consolas, Monaco, monospace;
    }
  }
}
</style>
