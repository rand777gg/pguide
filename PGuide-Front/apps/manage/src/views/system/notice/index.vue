<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { noticeCrudApi } from '@/api'
import type { CrudColumn, CrudFormField, TagType } from '@/composables/crud-config'
import type { SysNotice } from '@/api'

/**
 * 通知公告（`SysNoticeController`，前缀 /system/notice）。
 *
 * 对应老 ruoyi-ui 的 `views/system/notice/index.vue`。
 *
 * 注意 `SysNoticeController` 里**没有 /export**，所以这里用
 * `{ exportable: false }` 关掉导出能力（见 api/modules/system.ts）——
 * 否则工具栏会多一个点了报错的「导出」按钮。
 */

const noticeTypeDict: Array<{ label: string; value: string; tag: TagType }> = [
  { label: '通知', value: '1', tag: 'info' },
  { label: '公告', value: '2', tag: 'warning' },
]

const statusDict: Array<{ label: string; value: string; tag: TagType }> = [
  { label: '正常', value: '0', tag: 'success' },
  { label: '关闭', value: '1', tag: 'danger' },
]

const columns: CrudColumn<SysNotice>[] = [
  { prop: 'noticeId', label: 'ID', width: 80 },
  { prop: 'noticeTitle', label: '公告标题', minWidth: 220, searchable: true },
  {
    prop: 'noticeType',
    label: '类型',
    width: 100,
    display: 'tag',
    dict: noticeTypeDict,
    searchable: true,
    searchType: 'select',
    searchOptions: noticeTypeDict.map((d) => ({ label: d.label, value: d.value })),
  },
  { prop: 'status', label: '状态', width: 100, display: 'tag', dict: statusDict },
  { prop: 'createBy', label: '创建者', width: 120, searchable: true },
  { prop: 'createTime', label: '创建时间', width: 170, display: 'datetime' },
]

const formFields: CrudFormField<SysNotice>[] = [
  { prop: 'noticeTitle', label: '公告标题', type: 'input', span: 24, required: true, maxlength: 50 },
  {
    prop: 'noticeType',
    label: '公告类型',
    type: 'select',
    span: 12,
    options: noticeTypeDict.map((d) => ({ label: d.label, value: d.value })),
  },
  {
    prop: 'status',
    label: '状态',
    type: 'radio',
    span: 12,
    options: statusDict.map((d) => ({ label: d.label, value: d.value })),
  },
  { prop: 'noticeContent', label: '公告内容', type: 'textarea', required: true },
]
</script>

<template>
  <CrudPage
    resource="公告"
    :api="noticeCrudApi"
    id-key="noticeId"
    permission="system:notice"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
