<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { businessApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { CmsSubjectDict } from '@/api/modules/business'

/**
 * 学科字典管理。
 *
 * ⚠️ `subjectLevel` 后端返回的是**字符串**（实体声明为 String，数据库列是 int）。
 * 表单里用下拉给出固定取值，避免手输不一致导致学科树层级错乱。
 */
const columns: CrudColumn<CmsSubjectDict>[] = [
  { prop: 'subjectId', label: '学科ID', width: 100 },
  { prop: 'subjectName', label: '学科名称', minWidth: 200, searchable: true },
  {
    prop: 'subjectLevel',
    label: '层级',
    width: 100,
    display: 'tag',
    dict: [
      { label: '一级', value: '1', tag: 'success' },
      { label: '二级', value: '2', tag: 'warning' },
      { label: '三级', value: '3', tag: 'info' },
    ],
  },
  { prop: 'parentId', label: '上级ID', width: 100 },
]

const formFields: CrudFormField<CmsSubjectDict>[] = [
  { prop: 'subjectName', label: '学科名称', type: 'input', required: true, maxlength: 64 },
  {
    prop: 'subjectLevel',
    label: '层级',
    type: 'select',
    span: 12,
    required: true,
    options: [
      { label: '一级', value: '1' },
      { label: '二级', value: '2' },
      { label: '三级', value: '3' },
    ],
  },
  { prop: 'parentId', label: '上级ID', type: 'number', span: 12, placeholder: '一级学科填 0' },
]
</script>

<template>
  <CrudPage
    resource="学科"
    :api="businessApi.cmsSubjectApi"
    id-key="subjectId"
    permission="cmsmanage:subjectdict"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
