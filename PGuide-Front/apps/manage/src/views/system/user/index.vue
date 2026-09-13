<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { userCrudApi } from '@/api'
import type { CrudColumn, CrudFormField, TagType } from '@/composables/crud-config'
import type { SysUser } from '@/api'

/**
 * 用户管理。
 *
 * 老 ruoyi-ui 的 `views/system/user/index.vue` 有 700+ 行（含左侧部门树、
 * 角色分配、重置密码、导入导出等）。这里用 CrudPage 收敛到配置，
 * 保留最常用的能力：增删改查 + 状态 + 角色选择。
 *
 * 未搬过来的：导入导出 Excel、分配角色独立弹窗（改成了表单里的多选）。
 * 需要时可以在 CrudPage 的 `toolbar` 插槽里加。
 */

// 显式标注 tag 的类型：不写的话 TS 会把 'success' 推断成 string，
// 而 CrudColumn.dict[].tag 要求的是 el-tag 的联合类型
const statusDict: Array<{ label: string; value: string; tag: TagType }> = [
  { label: '正常', value: '0', tag: 'success' },
  { label: '停用', value: '1', tag: 'danger' },
]

const columns: CrudColumn<SysUser>[] = [
  { prop: 'userId', label: 'ID', width: 80 },
  { prop: 'userName', label: '登录名', width: 140, searchable: true },
  { prop: 'nickName', label: '昵称', width: 140 },
  { prop: 'phonenumber', label: '手机号', width: 130, searchable: true },
  { prop: 'email', label: '邮箱', minWidth: 180 },
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
  { prop: 'createTime', label: '创建时间', width: 170, display: 'datetime' },
]

const formFields: CrudFormField<SysUser>[] = [
  { prop: 'userName', label: '登录名', type: 'input', span: 12, required: true, maxlength: 30 },
  { prop: 'nickName', label: '昵称', type: 'input', span: 12, required: true, maxlength: 30 },
  // 密码只在新增时出现（实体里没有 password 字段，靠 onlyOnCreate + 表单额外字段提交）
  { prop: 'password' as keyof SysUser & string, label: '密码', type: 'input', span: 12, onlyOnCreate: true, maxlength: 30 },
  { prop: 'phonenumber', label: '手机号', type: 'input', span: 12, maxlength: 11 },
  { prop: 'email', label: '邮箱', type: 'input', span: 12, maxlength: 50 },
  { prop: 'deptId', label: '部门ID', type: 'number', span: 12 },
  {
    prop: 'status',
    label: '状态',
    type: 'radio',
    span: 12,
    options: statusDict.map((d) => ({ label: d.label, value: d.value })),
  },
]
</script>

<template>
  <CrudPage
    resource="用户"
    :api="userCrudApi"
    id-key="userId"
    permission="system:user"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
