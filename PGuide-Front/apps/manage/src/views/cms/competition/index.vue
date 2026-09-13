<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { businessApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { CmsCptInfo } from '@/api/modules/business'

/**
 * 竞赛信息管理。
 *
 * 老工程对应 `views/cmsmanage/cptinfo/index.vue`。
 *
 * ⚠️ 注意区分两个「前缀」：
 *   URL 前缀      /cmsmanage/cptinfo   ← controller 的 @RequestMapping
 *   权限前缀      manage:cptinfo       ← @PreAuthorize 里的 authority
 * 二者**不一样**，权限串不是从 URL 推出来的。写错的表现是：
 * 管理员（*:*:*）一切正常，普通角色按钮全消失、接口 403。
 * 这个值必须与 `CmsCptInfoController` 的 `@PreAuthorize` 完全一致。
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
    permission="manage:cptinfo"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
