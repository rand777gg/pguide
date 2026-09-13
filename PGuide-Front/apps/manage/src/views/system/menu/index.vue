<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { menuCrudApi } from '@/api'
import type { CrudColumn, CrudFormField } from '@/composables/crud-config'
import type { SysMenu } from '@/api'

/**
 * 菜单管理。
 *
 * ⚠️ 这是**树形**页面（`tree` 属性打开），因为后端 `/system/menu/list`
 * 直接返回拼好的树，不是分页列表。
 *
 * 这个页面改动的就是驱动整个后台左侧菜单的数据 ——
 * `component` 字段写的是前端组件路径（如 `system/user/index`）。
 * 如果填了一个不存在的组件，新版前端会跳到占位页并明确提示
 * （老 ruoyi-ui 是静默白屏）。
 */
const menuTypeOptions = [
  { label: '目录', value: 'M' },
  { label: '菜单', value: 'C' },
  { label: '按钮', value: 'F' },
]

const columns: CrudColumn<SysMenu>[] = [
  { prop: 'menuName', label: '菜单名称', minWidth: 180, searchable: true },
  {
    prop: 'menuType',
    label: '类型',
    width: 90,
    display: 'tag',
    dict: [
      { label: '目录', value: 'M', tag: 'warning' },
      { label: '菜单', value: 'C', tag: 'success' },
      { label: '按钮', value: 'F', tag: 'info' },
    ],
  },
  { prop: 'icon', label: '图标', width: 100 },
  { prop: 'orderNum', label: '排序', width: 80 },
  { prop: 'path', label: '路由地址', minWidth: 140 },
  { prop: 'component', label: '组件路径', minWidth: 180 },
  { prop: 'perms', label: '权限标识', minWidth: 180 },
  { prop: 'status', label: '状态', width: 90, display: 'dict',
    dict: [
      { label: '正常', value: '0' },
      { label: '停用', value: '1' },
    ],
  },
]

const formFields: CrudFormField<SysMenu>[] = [
  { prop: 'parentId', label: '上级菜单ID', type: 'number', span: 12, placeholder: '顶级菜单填 0' },
  { prop: 'menuType', label: '菜单类型', type: 'select', span: 12, options: menuTypeOptions },
  { prop: 'menuName', label: '菜单名称', type: 'input', span: 12, required: true, maxlength: 50 },
  { prop: 'orderNum', label: '显示排序', type: 'number', span: 12 },
  { prop: 'path', label: '路由地址', type: 'input', span: 12, maxlength: 200 },
  {
    prop: 'component',
    label: '组件路径',
    type: 'input',
    maxlength: 255,
    placeholder: '如 system/user/index（相对于 src/views，不要带 .vue）',
  },
  { prop: 'perms', label: '权限标识', type: 'input', maxlength: 100, placeholder: '如 system:user:list' },
  { prop: 'icon', label: '图标', type: 'input', span: 12, placeholder: '如 system / user' },
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
    resource="菜单"
    :api="menuCrudApi"
    id-key="menuId"
    permission="system:menu"
    :columns="columns"
    :form-fields="formFields"
    tree
  />
</template>
