<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
// 图标必须显式引入。unplugin-vue-components 的 ElementPlusResolver 只解析
// el-* 组件，不解析图标；不引入的话 Vue 只会打印
// "Failed to resolve component: ArrowDown"，页面上什么都不显示。
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

/**
 * 顶部导航条。
 *
 * 老工程 `views/frame/NavTop.vue` 的两个问题：
 *   1. 用 `window.open(process.env.VUE_APP_SELF_PATH_HIS + "user")`
 *      —— 依赖 hash 模式的硬编码后缀，且新开标签页。
 *      这里改成 router.push，SPA 内跳转。
 *   2. 搜索框整块被注释掉，只剩一个空壳。
 */
const router = useRouter()
const userStore = useUserStore()

const navItems = [
  { name: 'home', label: '首页' },
  { name: 'detail', label: '分类详情' },
] as const

const userLabel = computed(() => (userStore.isAuthenticated ? userStore.displayName : '未登录'))

function goToUserCenter(): void {
  void router.push({ name: 'userCenter' })
}

function goToHome(): void {
  void router.push({ name: 'home' })
}

function handleCommand(command: string): void {
  if (command === 'logout') {
    userStore.logout()
    void router.push({ name: 'home' })
    return
  }
  goToUserCenter()
}
</script>

<template>
  <header class="nav-top">
    <div class="nav-top__inner">
      <button type="button" class="nav-top__brand" @click="goToHome">
        <span class="nav-top__logo">项导</span>
        <span class="nav-top__title">组队中心</span>
      </button>

      <nav class="nav-top__menu">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          class="nav-top__link"
          :to="{ name: item.name }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="nav-top__user">
        <el-dropdown v-if="userStore.isAuthenticated" trigger="hover" @command="handleCommand">
          <span class="nav-top__user-trigger">
            {{ userLabel }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="center">用户中心</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button v-else type="primary" link @click="goToUserCenter">用户信息</el-button>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.nav-top {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--pg-header-height);
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--pg-border-color);

  &__inner {
    max-width: var(--pg-content-max-width);
    height: 100%;
    margin: 0 auto;
    padding: 0 var(--pg-spacing-lg);
    display: flex;
    align-items: center;
    gap: var(--pg-spacing-xl);
  }

  &__brand {
    display: flex;
    align-items: baseline;
    gap: var(--pg-spacing-sm);
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
  }

  &__logo {
    font-size: 22px;
    font-weight: 700;
    color: var(--pg-color-primary);
    letter-spacing: 2px;
  }

  &__title {
    font-size: 14px;
    color: var(--pg-text-secondary);
  }

  &__menu {
    display: flex;
    gap: var(--pg-spacing-lg);
    flex: 1;
  }

  &__link {
    color: var(--pg-text-regular);
    transition: color 0.2s;

    &:hover,
    &.router-link-active {
      color: var(--pg-color-primary);
    }
  }

  &__user-trigger {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    color: var(--pg-text-regular);
    outline: none;

    &:hover {
      color: var(--pg-color-primary);
    }
  }
}
</style>
