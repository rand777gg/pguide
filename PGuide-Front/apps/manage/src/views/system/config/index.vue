<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { configCrudApi } from '@/api'
import type { CrudColumn, CrudFormField, TagType } from '@/composables/crud-config'
import type { SysConfig } from '@/api'

/**
 * 参数设置（`SysConfigController`，前缀 /system/config）。
 *
 * 对应老 ruoyi-ui 的 `views/system/config/index.vue`。
 *
 * 两个值得注意的点：
 *
 * 1. `configType` 为 Y 表示**系统内置**参数，后端不允许删除
 *    （`SysConfigServiceImpl.checkConfigAllowed` 会拦）。所以这里用 tag
 *    标出「系统内置」，而不是等用户点了删除才报错。
 * 2. 参数值在后端有缓存（Redis `sys_config:<key>`）。界面上改完值之后，
 *    缓存由后端在 `updateConfig` 里主动清；但如果有别的地方直接改了数据库，
 *    就要走 `/system/config/refreshCache` —— 那是运维操作，不放在这个列表页上。
 *
 * 顺带提醒：`sys.account.captchaEnabled` 就是在这张表里控制登录验证码开关的
 * （值为 false 时前端登录页会隐藏验证码输入框）。
 */

const configTypeDict: Array<{ label: string; value: string; tag: TagType }> = [
  { label: '系统内置', value: 'Y', tag: 'warning' },
  { label: '自定义', value: 'N', tag: 'info' },
]

const columns: CrudColumn<SysConfig>[] = [
  { prop: 'configId', label: 'ID', width: 80 },
  { prop: 'configName', label: '参数名称', minWidth: 160, searchable: true },
  { prop: 'configKey', label: '参数键名', minWidth: 220, searchable: true },
  { prop: 'configValue', label: '参数键值', minWidth: 160 },
  {
    prop: 'configType',
    label: '系统内置',
    width: 110,
    display: 'tag',
    dict: configTypeDict,
  },
  {
    prop: 'createTime',
    label: '创建时间',
    width: 170,
    display: 'datetime',
    searchable: true,
    searchType: 'daterange',
    // RuoYi 的时间区间读的是 BaseEntity.params，键名是 params[beginTime] 这种
    searchKey: 'params[beginTime]',
    searchKeyEnd: 'params[endTime]',
  },
  { prop: 'remark', label: '备注', minWidth: 200 },
]

const formFields: CrudFormField<SysConfig>[] = [
  { prop: 'configName', label: '参数名称', type: 'input', span: 24, required: true, maxlength: 100 },
  { prop: 'configKey', label: '参数键名', type: 'input', span: 24, required: true, maxlength: 100 },
  { prop: 'configValue', label: '参数键值', type: 'input', span: 24, required: true, maxlength: 500 },
  {
    prop: 'configType',
    label: '系统内置',
    type: 'radio',
    span: 24,
    options: configTypeDict.map((d) => ({ label: d.label, value: d.value })),
  },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 },
]
</script>

<template>
  <CrudPage
    resource="参数"
    :api="configCrudApi"
    id-key="configId"
    permission="system:config"
    :columns="columns"
    :form-fields="formFields"
  />
</template>
