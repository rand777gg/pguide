<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { deptCrudApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { SysDept } from '@/api'

/**
 * 部门管理。
 *
 * 与菜单一样是**树形**页面：后端 `/system/dept/list` 返回拼好的树。
 * 用户管理里的「部门归属」用的就是这里的 deptId。
 */
const columns: CrudColumn<SysDept>[] = [
  { prop: 'deptName', label: '部门名称', minWidth: 200, searchable: true },
  { prop: 'orderNum', label: '排序', width: 80 },
  { prop: 'leader', label: '负责人', width: 120 },
  { prop: 'phone', label: '联系电话', width: 140 },
  { prop: 'email', label: '邮箱', minWidth: 180 },
  {
    prop: 'status',
    label: '状态',
    width: 90,
    display: 'tag',
    dict: [
      { label: '正常', value: '0', tag: 'success' },
      { label: '停用', value: '1', tag: 'danger' },
    ],
  },
]

const formFields: CrudFormField<SysDept>[] = [
  { prop: 'parentId', label: '上级部门ID', type: 'number', span: 12, placeholder: '顶级部门填 0' },
  { prop: 'deptName', label: '部门名称', type: 'input', span: 12, required: true, maxlength: 30 },
  { prop: 'orderNum', label: '显示排序', type: 'number', span: 12 },
  { prop: 'leader', label: '负责人', type: 'input', span: 12, maxlength: 20 },
  { prop: 'phone', label: '联系电话', type: 'input', span: 12, maxlength: 11 },
  { prop: 'email', label: '邮箱', type: 'input', span: 12, maxlength: 50 },
  {
    prop: 'status',
    label: '状态',
    type: 'radio',
    span: 12,
    options: [
      { label: '正常', value: '0' },
      { label: '停用', value: '1' },
    ],
  },
]
</script>

<template>
  <CrudPage
    resource="部门"
    :api="deptCrudApi"
    id-key="deptId"
    permission="system:dept"
    :columns="columns"
    :form-fields="formFields"
    tree
  />
</template>
