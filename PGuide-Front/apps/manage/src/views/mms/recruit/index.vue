<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { businessApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { MmsNeedRecruitInfo } from '@/api/modules/business'

/**
 * 招募需求管理。
 *
 * 老工程对应 `views/manage/recruitinfo/index.vue`。
 * ⚠️ 注意列表接口返回的字段名是 `recruitId` / `recruitRw`，
 * 与数据库列 `recruit_id` / `recruit_rw` 对应，别用错。
 */
const columns: CrudColumn<MmsNeedRecruitInfo>[] = [
  { prop: 'recruitId', label: '招募ID', width: 100 },
  { prop: 'recruitName', label: '招募名称', minWidth: 200, searchable: true },
  { prop: 'projectId', label: '所属项目', width: 110, searchable: true, searchType: 'input' },
  { prop: 'needTypeId', label: '需求类型', width: 110 },
  { prop: 'recruitRw', label: '已招募人数', width: 110 },
  { prop: 'recruitStartTime', label: '开始时间', width: 170, display: 'datetime' },
  { prop: 'recruitEndTime', label: '截止时间', width: 170, display: 'datetime' },
]

const formFields: CrudFormField<MmsNeedRecruitInfo>[] = [
  { prop: 'recruitName', label: '招募名称', type: 'input', required: true, maxlength: 128 },
  { prop: 'projectId', label: '所属项目ID', type: 'number', span: 12 },
  { prop: 'needTypeId', label: '需求类型ID', type: 'number', span: 12 },
  { prop: 'recruitRw', label: '已招募人数', type: 'number', span: 12 },
  { prop: 'recruitStartTime', label: '开始时间', type: 'datetime', span: 12 },
  { prop: 'recruitEndTime', label: '截止时间', type: 'datetime', span: 12 },
]
</script>

<template>
  <CrudPage
    resource="招募需求"
    :api="businessApi.mmsRecruitApi"
    id-key="recruitId"
    permission="manage:recruitinfo"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
