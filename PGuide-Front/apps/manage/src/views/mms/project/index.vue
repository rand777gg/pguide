<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { businessApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { MmsProjectInfo } from '@/api/modules/business'

/**
 * 项目管理。
 *
 * 对应老 ruoyi-ui 的 `views/manage/projectinfo/index.vue`（约 400 行）。
 * 这里只剩配置 —— 查询、分页、多选、弹窗、删除确认都由 CrudPage + useCrud 承担。
 *
 * 权限前缀取自后端 `MmsProjectInfoController` 的
 * `@PreAuthorize("@ss.hasPermi('manage:projectinfo:xxx')")`。
 */

const columns: CrudColumn<MmsProjectInfo>[] = [
  { prop: 'projectId', label: '项目ID', width: 100, searchable: false },
  { prop: 'projectName', label: '项目名称', minWidth: 220, searchable: true, searchType: 'input' },
  { prop: 'projectSubjectType', label: '学科方向', minWidth: 140 },
  { prop: 'projectOpenLevel', label: '开放级别', width: 120 },
  {
    prop: 'projectStatusId',
    label: '状态',
    width: 110,
    display: 'tag',
    dict: [
      { label: '待审核', value: 1, tag: 'warning' },
      { label: '已通过', value: 3, tag: 'success' },
      { label: '已驳回', value: 4, tag: 'danger' },
    ],
  },
  { prop: 'createTime', label: '创建时间', width: 170, display: 'datetime' },
]

const formFields: CrudFormField<MmsProjectInfo>[] = [
  { prop: 'projectName', label: '项目名称', type: 'input', required: true, maxlength: 128 },
  { prop: 'projectSubjectType', label: '学科方向', type: 'input', span: 12 },
  { prop: 'projectOpenLevel', label: '开放级别', type: 'input', span: 12 },
  {
    prop: 'projectStatusId',
    label: '状态',
    type: 'select',
    span: 12,
    options: [
      { label: '待审核', value: 1 },
      { label: '已通过', value: 3 },
      { label: '已驳回', value: 4 },
    ],
  },
]
</script>

<template>
  <CrudPage
    resource="项目"
    :api="businessApi.mmsProjectApi"
    id-key="projectId"
    permission="manage:projectinfo"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
