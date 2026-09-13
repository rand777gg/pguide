<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
// 注意：不要写 `import { ElMessage } from 'element-plus'`。
// 根入口会把整个组件库拉进产物（实测 element-plus chunk 从 915KB 涨到 1MB+）。
// ElMessage 由 unplugin-auto-import 的 ElementPlusResolver 按需自动引入。
import { mmsApi, ApiError } from '@pguide/api'
import type { ProjectOpenLevel, ProjectTypeLevel } from '@pguide/api'
import { useUserStore } from '@/stores/user'

/**
 * 创建队伍（三步）。
 *
 * 老工程 `CreatedGroup.vue` 用 `el-steps` 做 preCheck → check01 → check02，
 * 但 preCheck 只切步骤不做检查（TODO 写着"重名检查"），
 * check01 提交成功才切 check02。字段完全照搬，接口也是真的。
 *
 * 这里的主要改动：
 *   1. preCheck 真正调用后端 `/mms/create/check/max` 检查项目数量上限
 *   2. 项目类型选项按 `typeLevel` 联动 —— 后端是按
 *      (project_type_name, project_type_level) **精确匹配且必须命中一条**，
 *      随便选会直接报"项目竞赛类别有误"
 *   3. 用 TS 收窄字段类型（ProjectTypeLevel / ProjectOpenLevel），
 *      而不是随手写字符串
 */
const router = useRouter()
const userStore = useUserStore()

const active = ref(0)

/** 项目等级：free=自由项目（平台审核）/ unfree=非自由项目（校方审核） */
const typeLevel = ref<ProjectTypeLevel>('free')

/**
 * 可选项目方向。
 *
 * ⚠️ 这两个列表必须和后端 `mms_project_type_info` 字典表里的数据一致，
 * 因为 `MMSProjectCreatedController` 会按 (name, level) 精确匹配且要求**恰好一条**。
 * 当前对应 docker/init/90-demo-seed.sql 灌入的演示数据。
 * 生产环境应该改成调用字典表接口动态获取。
 *
 * TODO(后端): 提供 `GET /mms/project/type/dict` 返回可用类型，前端不再硬编码
 */
const PROJECT_TYPES: Record<ProjectTypeLevel, string[]> = {
  free: ['数学建模', '创新创业', '创新实验'],
  unfree: ['数学建模', '电子设计'],
}

const type = ref<string>(PROJECT_TYPES.free[0])

const openLevelOptions: { label: string; value: ProjectOpenLevel }[] = [
  { label: '公开', value: 'public' },
  { label: '校内可见', value: 'school' },
  { label: '院内可见', value: 'academy' },
  { label: '仅自己可见', value: 'private' },
]

const form = reactive({
  name: '',
  school: '',
  academy: '',
  detail: '',
  subject: '',
  openLevel: 'public' as ProjectOpenLevel,
})

// 切换项目等级时，若当前选中的方向不属于新等级，自动回退到第一个合法值
watch(typeLevel, (level) => {
  if (!PROJECT_TYPES[level].includes(type.value)) {
    type.value = PROJECT_TYPES[level][0]
  }
})

const quotaLoading = ref(false)
const quotaReached = ref(false)
const quotaMessage = ref('')

const submitting = ref(false)

const typeOptions = computed(() =>
  PROJECT_TYPES[typeLevel.value].map((name) => ({ label: name, value: name })),
)

const MAX_PROJECT_NUM = 3

async function checkQuota(): Promise<void> {
  quotaLoading.value = true
  try {
    await mmsApi.checkProjectQuota()
    quotaReached.value = false
    quotaMessage.value = ''
  } catch (error) {
    // 后端超过上限时返回的是一个业务错误（JsonResult.error("超过项目创建上限")）
    quotaReached.value = true
    quotaMessage.value =
      error instanceof ApiError ? error.message : `已达项目创建上限（${MAX_PROJECT_NUM} 个）`
  } finally {
    quotaLoading.value = false
  }
}

function goToForm(): void {
  if (quotaReached.value) {
    ElMessage.warning(quotaMessage.value)
    return
  }
  active.value = 1
}

async function submit(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请填写项目名称')
    return
  }

  submitting.value = true
  try {
    await mmsApi.submitProjectForCheck({
      name: form.name.trim(),
      type: type.value,
      typeLevel: typeLevel.value,
      school: form.school,
      academy: form.academy,
      detail: form.detail,
      subject: form.subject,
      openLevel: form.openLevel,
    })
    active.value = 2
    ElMessage.success('提交成功，等待平台审核')
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '提交失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void userStore.ensureSession()
  void checkQuota()
})
</script>

<template>
  <el-card shadow="never">
    <template #header>创建队伍</template>

    <el-steps :active="active" align-center finish-status="success" class="created-group__steps">
      <el-step title="前置检查" description="项目数量上限" />
      <el-step title="填写项目信息" description="提交审核" />
      <el-step title="提交完成" description="等待审核" />
    </el-steps>

    <!-- 第一步：前置检查 -->
    <div v-show="active === 0" v-loading="quotaLoading" class="created-group__step">
      <el-result
        :icon="quotaReached ? 'warning' : 'success'"
        :title="quotaReached ? '无法创建新项目' : '可以创建项目'"
        :sub-title="
          quotaReached
            ? quotaMessage
            : `每个账号最多同时拥有 ${MAX_PROJECT_NUM} 个项目，当前未达上限`
        "
      >
        <template #extra>
          <el-button type="primary" :disabled="quotaReached" @click="goToForm">
            开始填写
          </el-button>
          <el-button @click="router.push({ name: 'userCenter' })">返回</el-button>
        </template>
      </el-result>
    </div>

    <!-- 第二步：填写表单 -->
    <div v-show="active === 1" class="created-group__step">
      <el-form label-width="110px" :model="form">
        <el-form-item label="项目名称" required>
          <el-input v-model="form.name" maxlength="128" show-word-limit placeholder="项目名称不能与已有项目重复" />
        </el-form-item>

        <el-form-item label="项目等级">
          <el-radio-group v-model="typeLevel">
            <el-radio value="free">自由项目（平台审核）</el-radio>
            <el-radio value="unfree">非自由项目（校方审核）</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="项目方向">
          <el-select v-model="type" placeholder="请选择项目方向">
            <el-option
              v-for="option in typeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="学校">
          <el-input v-model="form.school" placeholder="所属学校" />
        </el-form-item>

        <el-form-item label="学院">
          <el-input v-model="form.academy" placeholder="所属学院" />
        </el-form-item>

        <el-form-item label="学科">
          <el-input v-model="form.subject" placeholder="对应学科方向" />
        </el-form-item>

        <el-form-item label="开放状态">
          <el-select v-model="form.openLevel">
            <el-option
              v-for="option in openLevelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="项目描述">
          <el-input
            v-model="form.detail"
            type="textarea"
            :rows="6"
            maxlength="2000"
            show-word-limit
            placeholder="建议 100 - 300 字，说明项目背景、目标与所需成员"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">提交审核</el-button>
          <el-button @click="active = 0">上一步</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 第三步：完成 -->
    <div v-show="active === 2" class="created-group__step">
      <el-result icon="success" title="提交成功" sub-title="项目已提交，等待审核通过后即可被其他同学看到">
        <template #extra>
          <el-button type="primary" @click="router.push({ name: 'userCenter' })">
            返回用户中心
          </el-button>
          <el-button @click="router.push({ name: 'home' })">回到首页</el-button>
        </template>
      </el-result>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.created-group {
  &__steps {
    margin-bottom: var(--pg-spacing-xl);
  }

  &__step {
    min-height: 200px;
  }
}
</style>
