<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Expand, Fold, SwitchButton, User as UserIcon } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { useTagsStore } from '@/stores/tags'

/** 顶部导航：折叠按钮 + 面包屑 + 用户下拉 */
const appStore = useAppStore()
const userStore = useUserStore()
const permissionStore = usePermissionStore()
const tagsStore = useTagsStore()
const route = useRoute()
const router = useRouter()

const collapsed = computed(() => appStore.sidebarCollapsed)

/** 面包屑：从当前匹配的路由链里取有 title 的项 */
const breadcrumbs = computed(() =>
  route.matched
    .filter((item) => item.meta?.title)
    .map((item) => ({ title: item.meta.title as string, path: item.path })),
)

async function handleLogout(): Promise<void> {
  await userStore.logout()
  permissionStore.reset()
  // 换个人登录不该看到上一个人的标签页
  tagsStore.reset()
  void router.push({ path: '/login' })
}

function handleCommand(command: string): void {
  if (command === 'logout') void handleLogout()
}
</script>

<template>
  <div class="navbar">
    <div class="navbar__left">
      <el-icon class="navbar__collapse" @click="appStore.toggleSidebar()">
        <component :is="collapsed ? Expand : Fold" />
      </el-icon>

      <el-breadcrumb separator="/">
        <el-breadcrumb-item v-for="crumb in breadcrumbs" :key="crumb.path">
          {{ crumb.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="navbar__right">
      <el-dropdown trigger="click" @command="handleCommand">
        <span class="navbar__user">
          <el-avatar :size="28" :src="userStore.avatar">
            <el-icon><UserIcon /></el-icon>
          </el-avatar>
          <span class="navbar__nickname">{{ userStore.nickName || userStore.userName }}</span>
        </span>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout" :icon="SwitchButton">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style scoped lang="scss">
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  &__left {
    display: flex;
    align-items: center;
    gap: var(--pg-spacing-md);
  }

  &__collapse {
    font-size: 18px;
    cursor: pointer;
    color: var(--pg-text-regular);

    &:hover {
      color: var(--pg-color-primary);
    }
  }

  &__user {
    display: flex;
    align-items: center;
    gap: var(--pg-spacing-sm);
    cursor: pointer;
    outline: none;
  }

  &__nickname {
    font-size: 14px;
    color: var(--pg-text-regular);
  }
}
</style>
