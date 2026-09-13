<script setup lang="ts">
import { Delete, Key } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus/es'
import CrudPage from '@/components/CrudPage.vue'
import { cleanLogininfor, logininforCrudApi, unlockLogininfor } from '@/api'
import type { CrudColumn, TagType } from '@/composables/crud-config'
import type { SysLogininfor } from '@/api'

/**
 * 登录日志（`SysLogininforController`，前缀 /monitor/logininfor）。
 *
 * 也是「只读 + 能删 + 能导出」，用 `hide-add` / `hide-edit`。
 *
 * 两个特有操作：
 *   - 清空：DELETE /monitor/logininfor/clean
 *   - 账户解锁：GET /monitor/logininfor/unlock/{userName}
 *     RuoYi 把「连续输错密码」的计数放在 Redis（`pwd_err_cnt:<用户名>`），
 *     达到上限后账号会被锁一段时间；用户确认是本人但被锁住时，用这个按钮解锁。
 *     没有这个入口就只能去 Redis 里删 key。
 *
 * 注意这里的 `status` 是 **String**（0 成功 / 1 失败），
 * 与操作日志的 Integer 不一样 —— 字典的 value 用字符串。
 */

const statusDict: Array<{ label: string; value: string; tag: TagType }> = [
  { label: '成功', value: '0', tag: 'success' },
  { label: '失败', value: '1', tag: 'danger' },
]

const columns: CrudColumn<SysLogininfor>[] = [
  { prop: 'infoId', label: 'ID', width: 80 },
  { prop: 'userName', label: '登录账号', width: 140, searchable: true },
  {
    prop: 'status',
    label: '状态',
    width: 90,
    display: 'tag',
    dict: statusDict,
    searchable: true,
    searchType: 'select',
    searchOptions: statusDict.map((d) => ({ label: d.label, value: d.value })),
  },
  { prop: 'ipaddr', label: '登录地址', width: 140, searchable: true },
  { prop: 'loginLocation', label: '登录地点', width: 150 },
  { prop: 'browser', label: '浏览器', width: 130 },
  { prop: 'os', label: '操作系统', width: 130 },
  { prop: 'msg', label: '操作信息', minWidth: 160 },
  {
    prop: 'loginTime',
    label: '登录时间',
    width: 170,
    display: 'datetime',
    searchable: true,
    searchType: 'daterange',
    searchKey: 'params[beginTime]',
    searchKeyEnd: 'params[endTime]',
  },
]

/** 清空登录日志 */
async function handleClean(load: () => void): Promise<void> {
  try {
    await ElMessageBox.confirm('确认清空所有登录日志吗？此操作不可恢复。', '警告', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  try {
    await cleanLogininfor()
    ElMessage.success('清空成功')
    load()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '清空失败')
  }
}

/** 解锁账号，成功后刷新列表（解锁本身不产生日志，但状态提示要跟着走） */
async function handleUnlock(row: SysLogininfor, load: () => void): Promise<void> {
  if (!row.userName) return

  try {
    await unlockLogininfor(row.userName)
    ElMessage.success(`账号 ${row.userName} 解锁成功`)
    load()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '解锁失败')
  }
}
</script>

<template>
  <CrudPage
    resource="登录日志"
    :api="logininforCrudApi"
    id-key="infoId"
    permission="monitor:logininfor"
    hide-add
    hide-edit
    :columns="columns"
  >
    <template #toolbar="{ load }">
      <el-button
        v-has-permi="['monitor:logininfor:remove']"
        type="danger"
        plain
        :icon="Delete"
        @click="handleClean(load)"
      >
        清空
      </el-button>
    </template>

    <template #actions="{ row, load }">
      <el-button
        v-has-permi="['monitor:logininfor:unlock']"
        type="warning"
        link
        :icon="Key"
        @click="handleUnlock(row, load)"
      >
        解锁
      </el-button>
    </template>
  </CrudPage>
</template>
