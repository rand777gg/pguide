<script setup lang="ts">
/**
 * 创建简历。
 *
 * 老工程 `views/details/user/created/CreatedResume.vue` 的模板里只有一个
 * `<stack-card>`，而 `StackCard.vue` 本身是空的 `<div>` —— 也就是说这个页面
 * 完全是空的，一个表单字段都没有。
 *
 * 这里给出一个最小可用骨架，字段语义按 `usercenter_student_info` 表来定，
 * 提交接口等后端提供（后端目前没有简历接口）。
 */
import { reactive, ref } from 'vue'
// ElMessage 由 unplugin-auto-import 自动引入，不要从 'element-plus' 根入口 import

const formRef = ref()
const submitting = ref(false)

const form = reactive({
  profession: '',
  year: '',
  skills: '',
  experience: '',
})

const rules = {
  profession: [{ required: true, message: '请填写专业', trigger: 'blur' }],
  skills: [{ required: true, message: '请至少填写一项技能', trigger: 'blur' }],
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    // TODO(后端): 简历接口尚未实现，目前只做前端提示
    ElMessage.warning('简历接口尚未实现，表单数据已收集但未提交')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="created-resume__header">
        <span>创建简历</span>
        <el-tag size="small" type="warning" effect="plain">后端接口待实现</el-tag>
      </div>
    </template>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="专业" prop="profession">
        <el-input v-model="form.profession" placeholder="例如：软件工程" />
      </el-form-item>

      <el-form-item label="年级" prop="year">
        <el-input v-model="form.year" placeholder="例如：2023" />
      </el-form-item>

      <el-form-item label="技能" prop="skills">
        <el-input
          v-model="form.skills"
          type="textarea"
          :rows="3"
          placeholder="用逗号分隔，例如：Vue3, TypeScript, Node.js"
        />
      </el-form-item>

      <el-form-item label="项目经历" prop="experience">
        <el-input v-model="form.experience" type="textarea" :rows="5" placeholder="简述参与过的项目" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
        <el-button @click="$router.push({ name: 'userCenter' })">返回</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<style scoped lang="scss">
.created-resume__header {
  display: flex;
  align-items: center;
  gap: var(--pg-spacing-sm);
}
</style>
