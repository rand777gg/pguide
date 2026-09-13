<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Lock, User } from '@element-plus/icons-vue'
import { authApi, RuoYiError } from '@/api'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

/**
 * 登录页。
 *
 * 对应老 ruoyi-ui 的 `views/login.vue`。
 * 后端 `SysLoginController.login` 需要 `{username, password, code, uuid}`，
 * 验证码由 `GET /captchaImage` 提供，答案存在 Redis 的 `captcha_codes:<uuid>`。
 */
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const permissionStore = usePermissionStore()

/**
 * 表单默认值。
 *
 * ⚠️ 刻意**留空**。早期版本为了本地调试方便预填了 admin / admin123，
 * 但那是把凭据硬编码进源码 —— 正是 dev-manual/03 里明令禁止的做法，
 * 而且这份前端一旦被部署出去就等于公开了默认口令。
 * 演示账号写在界面下方的提示文字里就够了。
 */
const form = reactive({ username: '', password: '', code: '', uuid: '' })
const captchaImg = ref('')
/** 后端可以通过 sys_config 关掉验证码 */
const captchaEnabled = ref(true)
const loading = ref(false)
const errorMessage = ref('')

async function refreshCaptcha(): Promise<void> {
  try {
    const result = await authApi.fetchCaptchaImage()
    captchaEnabled.value = result.captchaEnabled !== false
    form.uuid = result.uuid
    form.code = ''
    captchaImg.value = result.img ? `data:image/gif;base64,${result.img}` : ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '验证码加载失败'
  }
}

async function handleLogin(): Promise<void> {
  errorMessage.value = ''

  if (!form.username.trim() || !form.password) {
    errorMessage.value = '请输入账号和密码'
    return
  }
  if (captchaEnabled.value && !form.code.trim()) {
    errorMessage.value = '请输入验证码'
    return
  }

  loading.value = true
  try {
    await userStore.login({
      username: form.username.trim(),
      password: form.password,
      code: form.code,
      uuid: form.uuid,
    })

    // 登录成功后清掉可能残留的动态路由，强制重新生成
    permissionStore.reset()

    const redirect = (route.query.redirect as string) || '/'
    await router.replace(redirect)
  } catch (error) {
    errorMessage.value =
      error instanceof RuoYiError ? error.message : '登录失败，请检查账号密码'
    // 失败后刷新验证码（后端的验证码用一次就失效语义上更安全）
    if (captchaEnabled.value) void refreshCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refreshCaptcha()
})
</script>

<template>
  <div class="login">
    <div class="login__card">
      <header class="login__header">
        <h1 class="login__title">项导后台管理系统</h1>
        <p class="login__subtitle">PGuide Manage</p>
      </header>

      <el-form :model="form" size="large" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input
            v-model="form.username"
            placeholder="账号"
            :prefix-icon="User"
            autocomplete="username"
          />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
            autocomplete="current-password"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item v-if="captchaEnabled">
          <div class="login__captcha">
            <el-input
              v-model="form.code"
              placeholder="验证码"
              maxlength="8"
              @keyup.enter="handleLogin"
            />
            <button type="button" class="login__captcha-img" title="点击刷新" @click="refreshCaptcha">
              <img v-if="captchaImg" :src="captchaImg" alt="验证码" />
              <span v-else class="login__captcha-placeholder">加载中</span>
            </button>
          </div>
        </el-form-item>

        <el-alert
          v-if="errorMessage"
          class="login__error"
          type="error"
          :title="errorMessage"
          :closable="false"
          show-icon
        />

        <el-button
          class="login__submit"
          type="primary"
          size="large"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </el-form>

      <p class="login__hint">默认账号 admin / admin123（来自 docker/init 的基线数据）</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%);

  &__card {
    width: 100%;
    max-width: 400px;
    padding: 40px 32px 28px;
    border-radius: 12px;
    background-color: #ffffff;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  }

  &__header {
    text-align: center;
    margin-bottom: 28px;
  }

  &__title {
    font-size: 22px;
    font-weight: 600;
    color: var(--pg-text-primary);
  }

  &__subtitle {
    margin-top: 6px;
    font-size: 12px;
    letter-spacing: 2px;
    color: var(--pg-text-placeholder);
    text-transform: uppercase;
  }

  &__captcha {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  &__captcha-img {
    flex: 0 0 104px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--pg-border-color);
    border-radius: 4px;
    background-color: #f5f7fa;
    cursor: pointer;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__captcha-placeholder {
    font-size: 12px;
    color: var(--pg-text-placeholder);
  }

  &__error {
    margin-bottom: 16px;
  }

  &__submit {
    width: 100%;
  }

  &__hint {
    margin-top: 18px;
    text-align: center;
    font-size: 12px;
    color: var(--pg-text-placeholder);
  }
}
</style>
