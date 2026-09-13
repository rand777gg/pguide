<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { businessApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { UsercenterTeacherInfo } from '@/api/modules/business'

/** 教师信息管理。对应老工程 `views/user/teacherinfo/index.vue`。 */
const columns: CrudColumn<UsercenterTeacherInfo>[] = [
  { prop: 'teacherId', label: 'ID', width: 80 },
  { prop: 'teacherName', label: '姓名', width: 110, searchable: true },
  { prop: 'teacherNick', label: '昵称', width: 120 },
  { prop: 'workId', label: '工号', width: 130 },
  { prop: 'teacherAccount', label: '账号', width: 140, searchable: true },
  { prop: 'teacherUnit', label: '单位', minWidth: 160 },
  { prop: 'teacherAcademy', label: '学院', minWidth: 150 },
  { prop: 'teacherProfession', label: '专业', minWidth: 140 },
]

const formFields: CrudFormField<UsercenterTeacherInfo>[] = [
  { prop: 'teacherName', label: '姓名', type: 'input', span: 12, maxlength: 64 },
  { prop: 'teacherNick', label: '昵称', type: 'input', span: 12, maxlength: 64 },
  { prop: 'teacherAccount', label: '账号', type: 'input', span: 12, required: true, maxlength: 30 },
  { prop: 'workId', label: '工号', type: 'input', span: 12, maxlength: 64 },
  {
    prop: 'teacherSex',
    label: '性别',
    type: 'select',
    span: 12,
    options: [
      { label: '男', value: '0' },
      { label: '女', value: '1' },
      { label: '未知', value: '2' },
    ],
  },
  { prop: 'teacherPhonenumber', label: '手机号', type: 'input', span: 12, maxlength: 11 },
  { prop: 'teacherEmail', label: '邮箱', type: 'input', span: 12, maxlength: 50 },
  { prop: 'teacherUnit', label: '单位', type: 'input', span: 12, maxlength: 64 },
  { prop: 'teacherAcademy', label: '学院', type: 'input', span: 12, maxlength: 64 },
  { prop: 'teacherProfession', label: '专业', type: 'input', span: 12, maxlength: 64 },
]
</script>

<template>
  <CrudPage
    resource="教师"
    :api="businessApi.teacherApi"
    id-key="teacherId"
    permission="project:info:teacher"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
