<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { businessApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { CmsCptInfo } from '@/api/modules/business'

/**
 * 竞赛信息管理。
 *
 * 老工程对应 `views/cmsmanage/cptinfo/index.vue`。
 * 权限前缀来自 `CmsCptInfoController`：cmsmanage:cptinfo:xxx
 */
const columns: CrudColumn<CmsCptInfo>[] = [
  { prop: 'cptId', label: '竞赛ID', width: 100 },
  { prop: 'cptName', label: '竞赛名称', minWidth: 220, searchable: true },
  { prop: 'cptSubject', label: '所属学科', minWidth: 140 },
  { prop: 'cptArea', label: '举办地区', width: 140 },
  { prop: 'cptStartTime', label: '开始时间', width: 170, display: 'datetime' },
  { prop: 'cptEndTime', label: '结束时间', width: 170, display: 'datetime' },
]

const formFields: CrudFormField<CmsCptInfo>[] = [
  { prop: 'cptName', label: '竞赛名称', type: 'input', required: true, maxlength: 128 },
  { prop: 'cptSubject', label: '所属学科', type: 'input', span: 12 },
  { prop: 'cptArea', label: '举办地区', type: 'input', span: 12 },
  { prop: 'orgId', label: '主办机构ID', type: 'number', span: 12 },
  { prop: 'cptStartTime', label: '开始时间', type: 'datetime', span: 12 },
  { prop: 'cptEndTime', label: '结束时间', type: 'datetime', span: 12 },
]
</script>

<template>
  <CrudPage
    resource="竞赛"
    :api="businessApi.cmsCompetitionApi"
    id-key="cptId"
    permission="cmsmanage:cptinfo"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
