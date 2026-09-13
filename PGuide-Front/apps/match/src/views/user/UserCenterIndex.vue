<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

/**
 * 用户中心首页：个人信息 / 我的队伍 / 我的简历 三个区块。
 *
 * 老工程 `views/details/user/created/UserCenterIndex.vue` 用
 * `this.$store.state.user.userInfo` 取数据，并把 `userName` 的初始值
 * 设成字符串 `"null"` 当哨兵值来做"有没有登录"的判断 —— 很脆。
 * 这里用 Pinia + `storeToRefs`，并且有明确的 `isAuthenticated`。
 */
const userStore = useUserStore()
const { userInfo, loading, isAuthenticated, displayName } = storeToRefs(userStore)

onMounted(() => {
  void userStore.ensureSession()
})
</script>

<template>
  <div class="user-center-index">
    <el-skeleton v-if="loading && !userInfo" :rows="4" animated />

    <template v-else>
      <el-alert
        v-if="!isAuthenticated"
        class="user-center-index__alert"
        type="warning"
        title="当前未登录，展示的是空信息"
        description="点击「去登录」会跳转到统一鉴权中心"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button type="primary" size="small" @click="userStore.goToAuthCenter()">
            去登录
          </el-button>
        </template>
      </el-alert>

      <section class="user-center-index__card">
        <h2 class="user-center-index__card-title">个人信息</h2>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ displayName }}</el-descriptions-item>
          <el-descriptions-item label="账号">
            {{ userInfo?.userAccount || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="学校">
            {{ userInfo?.userSchool || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="学院">
            {{ userInfo?.userAcademy || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="学号/工号">
            {{ userInfo?.workId || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="用户类型">
            {{ userInfo?.userType || '—' }}
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="user-center-index__card">
        <h2 class="user-center-index__card-title">我的队伍</h2>
        <el-empty description="暂无队伍">
          <el-button type="primary" @click="$router.push({ name: 'createGroup' })">
            创建队伍
          </el-button>
        </el-empty>
      </section>

      <section class="user-center-index__card">
        <h2 class="user-center-index__card-title">我的简历</h2>
        <el-empty description="暂无简历">
          <el-button type="primary" @click="$router.push({ name: 'createResume' })">
            创建简历
          </el-button>
        </el-empty>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.user-center-index {
  display: flex;
  flex-direction: column;
  gap: var(--pg-spacing-lg);

  &__alert {
    margin-bottom: 0;
  }

  &__card {
    padding: var(--pg-spacing-lg);
    border: 1px solid var(--pg-border-color);
    border-radius: var(--pg-border-radius);
    background-color: var(--pg-bg-card);
  }

  &__card-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: var(--pg-spacing-md);
  }
}
</style>
