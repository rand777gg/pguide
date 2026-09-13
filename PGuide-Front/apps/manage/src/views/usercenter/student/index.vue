<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { businessApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { UsercenterStudentInfo } from '@/api/modules/business'

/**
 * 学生信息管理。对应老工程 `views/user/userinfo/index.vue`。
 *
 * ⚠️ 权限前缀是 `project:info`，**不带 student**：
 * `UsercenterStudentInfoController` 与 `UsercenterTeacherInfoController`
 * 的 `@PreAuthorize` 用的是同一个 `project:info:*`（代码生成时没改前缀），
 * 老 ruoyi-ui 也是这么写的。所以这里的值必须跟后端一致 ——
 * 写成 `project:info:student` 的话，普通角色会「按钮消失 + 接口 403」，
 * 而管理员因为有 *:*:* 看不出问题。
 *
 * 副作用是学生与教师共用同一套权限点，要细分得先改后端 @PreAuthorize。
 */
const columns: CrudColumn<UsercenterStudentInfo>[] = [
  { prop: 'studentId', label: 'ID', width: 80 },
  { prop: 'studentName', label: '姓名', width: 110, searchable: true },
  { prop: 'studentNick', label: '昵称', width: 120 },
  { prop: 'studentAccount', label: '账号', width: 140, searchable: true },
  { prop: 'workId', label: '学号', width: 130 },
  { prop: 'studentSchool', label: '学校', minWidth: 150 },
  { prop: 'studentAcademy', label: '学院', minWidth: 150 },
  { prop: 'studentYear', label: '年级', width: 90 },
  { prop: 'studentProfession', label: '专业', minWidth: 140 },
]

const formFields: CrudFormField<UsercenterStudentInfo>[] = [
  { prop: 'studentName', label: '姓名', type: 'input', span: 12, maxlength: 64 },
  { prop: 'studentNick', label: '昵称', type: 'input', span: 12, maxlength: 64 },
  { prop: 'studentAccount', label: '账号', type: 'input', span: 12, required: true, maxlength: 30 },
  { prop: 'workId', label: '学号', type: 'input', span: 12, maxlength: 64 },
  {
    prop: 'studentSex',
    label: '性别',
    type: 'select',
    span: 12,
    options: [
      { label: '男', value: '0' },
      { label: '女', value: '1' },
      { label: '未知', value: '2' },
    ],
  },
  // 注意：实体里 studentPhonenumber 是 String（varchar(11)），不是数字
  { prop: 'studentPhonenumber', label: '手机号', type: 'input', span: 12, maxlength: 11 },
  { prop: 'studentEmail', label: '邮箱', type: 'input', span: 12, maxlength: 50 },
  { prop: 'studentSchool', label: '学校', type: 'input', span: 12, maxlength: 64 },
  { prop: 'studentAcademy', label: '学院', type: 'input', span: 12, maxlength: 64 },
  { prop: 'studentYear', label: '年级', type: 'input', span: 12, maxlength: 10 },
  { prop: 'studentProfession', label: '专业', type: 'input', span: 12, maxlength: 64 },
]
</script>

<template>
  <CrudPage
    resource="学生"
    :api="businessApi.studentApi"
    id-key="studentId"
    permission="project:info"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
