<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Lock, User } from '@element-plus/icons-vue'
import { parseAuthRedirectParams } from '@pguide/api'
import { AUTH_USER_TYPE_LABEL, SELECTABLE_USER_TYPES } from '@pguide/shared'
import type { AuthUserType } from '@pguide/shared'
import CaptchaField from '@/components/CaptchaField.vue'
import { useLoginStore } from '@/stores/login'

/**
 * 统一鉴权中心登录页。
 *
 * 一个页面承担两种场景，靠 URL 里有没有 `code` + `sendUrl` 区分：
 *
 *   A. 子系统登录（从 apps/match 这类业务应用跳过来）
 *      URL: `/redirect?code=xxx&sendUrl=yyy`（老格式是 `#/redirect?code=..&sendUrl=..`）
 *      登录走 POST /auth/authCenter/login，成功后整页跳回 sendUrl
 *
 *   B. 直接访问鉴权中心
 *      URL: `/`
 *      登录走 POST /auth/login，成功后就地展示结果
 *
 * 老工程把这两种场景各写了一份（AuthCenterHomeView 339 行 +
 * LightAuthCenterHomeView 432 行），逻辑重复且其中一份的参数解析是坏的。
 * 这里合成一个页面 + 一个 store。
 */
const store = useLoginStore()

/** 直接登录成功后的 token（用于展示状态，不外传） */
const directToken = ref<string | null>(null)
/** 正在跳回子系统 */
const redirecting = ref(false)

const submitText = computed(() => (store.isSubSystemLogin ? '登录并返回' : '登录'))

const userTypeOptions = computed(() =>
  SELECTABLE_USER_TYPES.map((value) => ({
    value,
    label: AUTH_USER_TYPE_LABEL[value] ?? value,
  })),
)

onMounted(() => {
  // 从完整 href 解析子系统上下文。
  // 用 location.href 而不是 route.query，是因为老格式的参数在 `#` 之后，
  // 路由解析不到（这正是老 auth-ui 的 bug）。
  store.setSubSystemContext(parseAuthRedirectParams(window.location.href))

  void store.refreshCaptcha()
  void store.loadThirdPartyList()
})

async function handleSubmit(): Promise<void> {
  if (store.isSubSystemLogin) {
    const target = await store.loginForSubSystem()
    if (target) {
      redirecting.value = true
      // 整页跳转回业务应用 —— 那边会用 localStorage 里的一次性 code 换 token
      window.location.assign(target)
    }
    return
  }

  const token = await store.loginDirect()
  if (token) {
    directToken.value = token
  }
}

function handleUserTypeChange(value: AuthUserType): void {
  store.form.userType = value
}
</script>

<template>
  <div class="login-page">
    <div class="login-page__card">
      <header class="login-page__header">
        <h1 class="login-page__brand">项导</h1>
        <p class="login-page__subtitle">统一身份认证中心</p>
      </header>

      <!-- 场景 A：子系统登录，提示来源 -->
      <el-alert
        v-if="store.isSubSystemLogin"
        class="login-page__notice"
        type="info"
        :closable="false"
        show-icon
        title="正在为业务系统登录"
      >
        <template #default>
          <span class="login-page__notice-target">{{ store.subSystem?.sendUrl }}</span>
        </template>
      </el-alert>

      <!-- 场景 B 成功后 -->
      <el-result
        v-if="directToken"
        icon="success"
        title="登录成功"
        sub-title="凭证已签发，可以关闭此页面返回业务系统"
      >
        <template #extra>
          <el-button @click="((directToken = null), store.reset(), store.refreshCaptcha())">
            重新登录
          </el-button>
        </template>
      </el-result>

      <template v-else>
        <!-- 身份选择 -->
        <el-segmented
          class="login-page__identity"
          :model-value="store.form.userType"
          :options="userTypeOptions"
          block
          @change="handleUserTypeChange"
        />

        <el-form class="login-page__form" label-position="top" @submit.prevent="handleSubmit">
          <el-form-item label="账号">
            <el-input
              v-model="store.form.account"
              size="large"
              placeholder="学号 / 工号 / 自定义账号"
              autocomplete="username"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="密码">
            <el-input
              v-model="store.form.password"
              type="password"
              size="large"
              placeholder="密码"
              show-password
              autocomplete="current-password"
              :prefix-icon="Lock"
            />
          </el-form-item>

          <el-form-item label="验证码">
            <CaptchaField
              v-model="store.form.code"
              :image="store.captchaImage"
              :loading="store.captchaLoading"
              @refresh="store.refreshCaptcha()"
              @submit="handleSubmit"
            />
          </el-form-item>

          <el-alert
            v-if="store.errorMessage"
            class="login-page__error"
            type="error"
            :title="store.errorMessage"
            :closable="false"
            show-icon
          />

          <el-button
            class="login-page__submit"
            type="primary"
            size="large"
            :loading="store.submitting || redirecting"
            @click="handleSubmit"
          >
            {{ redirecting ? '正在跳转…' : submitText }}
          </el-button>
        </el-form>

        <!-- 第三方登录 -->
        <div v-if="store.thirdPartyList.length" class="login-page__third">
          <el-divider>其他登录方式</el-divider>
          <ul class="login-page__third-list">
            <li v-for="item in store.thirdPartyList" :key="item.thirdPartyId">
              <a
                class="login-page__third-item"
                :href="item.thirdPartyLinkUrl || undefined"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img v-if="item.thirdPartyImg" :src="item.thirdPartyImg" :alt="item.thirdPartyName" />
                <span>{{ item.thirdPartyName }}</span>
              </a>
            </li>
          </ul>
        </div>
      </template>
    </div>

    <p class="login-page__footer">项导 · 大学生竞赛组队平台</p>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pg-spacing-lg);
  padding: var(--pg-spacing-lg);

  /**
   * 沿用老 auth-ui App.vue 里的渐变流动背景（原本挂在非 scoped 的 .move 上），
   * 但收在这里的 scoped 样式内，不再泄漏到全局。
   */
  background: linear-gradient(-45deg, rgba(100, 201, 201, 0.5), #97dfd2, #81d9c4, #88d9e6);
  background-size: 400% 400%;
  animation: login-bg-move 15s ease infinite;

  &__card {
    width: 100%;
    max-width: 400px;
    padding: var(--pg-spacing-xl) var(--pg-spacing-lg);
    border-radius: 16px;
    background-color: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  }

  &__header {
    text-align: center;
    margin-bottom: var(--pg-spacing-lg);
  }

  &__brand {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 6px;
    color: var(--pg-color-primary);
  }

  &__subtitle {
    margin-top: var(--pg-spacing-xs);
    font-size: 13px;
    color: var(--pg-text-secondary);
  }

  &__notice {
    margin-bottom: var(--pg-spacing-md);
  }

  &__notice-target {
    word-break: break-all;
    font-size: 12px;
  }

  &__identity {
    margin-bottom: var(--pg-spacing-md);
  }

  &__form {
    :deep(.el-form-item) {
      margin-bottom: var(--pg-spacing-md);
    }
  }

  &__error {
    margin-bottom: var(--pg-spacing-md);
  }

  &__submit {
    width: 100%;
  }

  &__third {
    margin-top: var(--pg-spacing-lg);
  }

  &__third-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--pg-spacing-md);
    justify-content: center;
  }

  &__third-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--pg-text-regular);

    &:hover {
      color: var(--pg-color-primary);
    }

    img {
      width: 18px;
      height: 18px;
    }
  }

  &__footer {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
}

@keyframes login-bg-move {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
