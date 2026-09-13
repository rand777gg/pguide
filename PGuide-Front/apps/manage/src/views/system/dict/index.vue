<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { createCrudApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { SysDictType } from '@/api'

/**
 * 字典管理。
 *
 * RuoYi 把字典拆成两层：**字典类型**（sys_dict_type，比如 `sys_user_sex`）
 * 和**字典数据**（sys_dict_data，某个类型下的具体选项）。
 * 老 ruoyi-ui 里这是两个页面，通过行内「字典数据」按钮跳转。
 *
 * 这里先实现字典类型的 CRUD。字典数据的维护需要另一个路由，
 * 目前用占位页兜底（见 views/placeholder）。
 */
const typeCrudApi = createCrudApi<SysDictType>('/system/dict/type')

const columns: CrudColumn<SysDictType>[] = [
  { prop: 'dictId', label: 'ID', width: 80 },
  { prop: 'dictName', label: '字典名称', minWidth: 180, searchable: true },
  { prop: 'dictType', label: '字典类型', minWidth: 200, searchable: true },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    display: 'tag',
    dict: [
      { label: '正常', value: '0', tag: 'success' },
      { label: '停用', value: '1', tag: 'danger' },
    ],
  },
  { prop: 'remark', label: '备注', minWidth: 180 },
  { prop: 'createTime', label: '创建时间', width: 170, display: 'datetime' },
]

const formFields: CrudFormField<SysDictType>[] = [
  { prop: 'dictName', label: '字典名称', type: 'input', span: 12, required: true, maxlength: 100 },
  {
    prop: 'dictType',
    label: '字典类型',
    type: 'input',
    span: 12,
    required: true,
    maxlength: 100,
    placeholder: '如 sys_user_sex',
  },
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
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 },
]
</script>

<template>
  <CrudPage
    resource="字典类型"
    :api="typeCrudApi"
    id-key="dictId"
    permission="system:dict"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
