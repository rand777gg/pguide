<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { roleCrudApi } from '@/api'
import type { CrudColumn, CrudFormField, TagType } from '@/composables/crud-config'
import type { SysRole } from '@/api'

/**
 * 角色管理。
 *
 * 「菜单权限」在 RuoYi 里是独立弹窗（`/system/menu/roleMenuTreeselect/{roleId}`）。
 * 这里先用表单里的菜单 id 列表简化处理 —— 完整做法可以参考
 * `roleApi.getRoleMenuTree` + CrudPage 的 form-extra 插槽接一棵 el-tree。
 */
const dataScopeOptions = [
  { label: '全部数据', value: '1' },
  { label: '自定义数据', value: '2' },
  { label: '本部门数据', value: '3' },
  { label: '本部门及以下', value: '4' },
  { label: '仅本人数据', value: '5' },
]

const statusDict: Array<{ label: string; value: string; tag: TagType }> = [
  { label: '正常', value: '0', tag: 'success' },
  { label: '停用', value: '1', tag: 'danger' },
]

const columns: CrudColumn<SysRole>[] = [
  { prop: 'roleId', label: 'ID', width: 80 },
  { prop: 'roleName', label: '角色名称', minWidth: 160, searchable: true },
  { prop: 'roleKey', label: '权限字符', minWidth: 160, searchable: true },
  { prop: 'roleSort', label: '排序', width: 90 },
  {
    prop: 'dataScope',
    label: '数据范围',
    width: 140,
    display: 'dict',
    dict: dataScopeOptions,
  },
  { prop: 'status', label: '状态', width: 100, display: 'tag', dict: statusDict },
  { prop: 'createTime', label: '创建时间', width: 170, display: 'datetime' },
]

const formFields: CrudFormField<SysRole>[] = [
  { prop: 'roleName', label: '角色名称', type: 'input', span: 12, required: true, maxlength: 30 },
  { prop: 'roleKey', label: '权限字符', type: 'input', span: 12, required: true, maxlength: 100 },
  { prop: 'roleSort', label: '显示顺序', type: 'number', span: 12 },
  {
    prop: 'status',
    label: '状态',
    type: 'radio',
    span: 12,
    options: statusDict.map((d) => ({ label: d.label, value: d.value })),
  },
  { prop: 'dataScope', label: '数据范围', type: 'select', span: 12, options: dataScopeOptions },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 },
]
</script>

<template>
  <CrudPage
    resource="角色"
    :api="roleCrudApi"
    id-key="roleId"
    permission="system:role"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
