<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { postCrudApi } from '@/api'
import type { CrudColumn, CrudFormField, TagType } from '@/composables/crud-config'
import type { SysPost } from '@/api'

/**
 * 岗位管理（`SysPostController`，前缀 /system/post）。
 *
 * 岗位在 RuoYi 里是给用户挂的「职位」标签（sys_user_post），
 * 本身没有层级，就是一张平表 —— 所以用 CrudPage 一行配置就够。
 */

const statusDict: Array<{ label: string; value: string; tag: TagType }> = [
  { label: '正常', value: '0', tag: 'success' },
  { label: '停用', value: '1', tag: 'danger' },
]

const columns: CrudColumn<SysPost>[] = [
  { prop: 'postId', label: 'ID', width: 80 },
  { prop: 'postCode', label: '岗位编码', width: 160, searchable: true },
  { prop: 'postName', label: '岗位名称', minWidth: 160, searchable: true },
  { prop: 'postSort', label: '排序', width: 90, align: 'center' },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    display: 'tag',
    dict: statusDict,
    searchable: true,
    searchType: 'select',
    searchOptions: statusDict.map((d) => ({ label: d.label, value: d.value })),
  },
  { prop: 'remark', label: '备注', minWidth: 200 },
]

const formFields: CrudFormField<SysPost>[] = [
  { prop: 'postName', label: '岗位名称', type: 'input', span: 12, required: true, maxlength: 50 },
  // 编码在后端有唯一性校验，重复时会返回「新增岗位'xxx'失败，岗位编码已存在」
  { prop: 'postCode', label: '岗位编码', type: 'input', span: 12, required: true, maxlength: 64 },
  { prop: 'postSort', label: '显示顺序', type: 'number', span: 12, required: true },
  {
    prop: 'status',
    label: '状态',
    type: 'radio',
    span: 12,
    options: statusDict.map((d) => ({ label: d.label, value: d.value })),
  },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 },
]
</script>

<template>
  <CrudPage
    resource="岗位"
    :api="postCrudApi"
    id-key="postId"
    permission="system:post"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
