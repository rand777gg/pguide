<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus/es'
import CrudPage from '@/components/CrudPage.vue'
import { cleanOperlog, operlogCrudApi } from '@/api'
import type { CrudColumn, TagType } from '@/composables/crud-config'
import type { SysOperlog } from '@/api'

/**
 * 操作日志（`SysOperlogController`，前缀 /monitor/operlog）。
 *
 * 这是「只读 + 能删 + 能导出」的页面，所以用 `hide-add` / `hide-edit`
 * 而不是 `readonly` —— 后者会把删除也一并藏掉。
 *
 * 排查问题时主要靠两件事：时间区间 + 关键字，所以搜索区配了多列，
 * 操作时间用 daterange（RuoYi 的区间参数是 `params[beginTime]`）。
 *
 * 顺带一个坑：`SysOperLog.businessType` 与 `status` 在实体里是 **Integer**，
 * 不是字符串（`SysLogininfor.status` 才是 String）。所以字典的 value 直接写数字，
 * renderCell 的字典查找两边都做 String() 归一，能对上。
 */

const businessTypeDict: Array<{ label: string; value: number; tag: TagType }> = [
  { label: '其它', value: 0, tag: 'info' },
  { label: '新增', value: 1, tag: 'success' },
  { label: '修改', value: 2, tag: 'primary' },
  { label: '删除', value: 3, tag: 'danger' },
  { label: '授权', value: 4, tag: 'warning' },
  { label: '导出', value: 5, tag: 'info' },
  { label: '导入', value: 6, tag: 'info' },
  { label: '强退', value: 7, tag: 'danger' },
  { label: '生成代码', value: 8, tag: 'primary' },
  { label: '清空数据', value: 9, tag: 'danger' },
]

const statusDict: Array<{ label: string; value: number; tag: TagType }> = [
  { label: '正常', value: 0, tag: 'success' },
  { label: '异常', value: 1, tag: 'danger' },
]

const columns: CrudColumn<SysOperlog>[] = [
  { prop: 'operId', label: 'ID', width: 80 },
  { prop: 'title', label: '模块', width: 140, searchable: true },
  {
    prop: 'businessType',
    label: '业务类型',
    width: 110,
    display: 'tag',
    dict: businessTypeDict,
    searchable: true,
    searchType: 'select',
    searchOptions: businessTypeDict.map((d) => ({ label: d.label, value: d.value })),
  },
  { prop: 'operName', label: '操作人员', width: 120, searchable: true },
  { prop: 'operIp', label: '操作地址', width: 140 },
  { prop: 'operLocation', label: '操作地点', width: 140 },
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
  {
    prop: 'operTime',
    label: '操作时间',
    width: 170,
    display: 'datetime',
    searchable: true,
    searchType: 'daterange',
    searchKey: 'params[beginTime]',
    searchKeyEnd: 'params[endTime]',
  },
  { prop: 'costTime', label: '耗时(ms)', width: 100, align: 'center' },
]

/**
 * 清空全部操作日志。
 *
 * 后端把「清空」也做成了 DELETE（`/monitor/operlog/clean`），权限点与删除相同；
 * 包装在 `api/modules/monitor.ts` 里，不在页面上直接拼 URL。
 */
async function handleClean(load: () => void): Promise<void> {
  try {
    await ElMessageBox.confirm('确认清空所有操作日志吗？此操作不可恢复。', '警告', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  try {
    await cleanOperlog()
    ElMessage.success('清空成功')
    load()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '清空失败')
  }
}
</script>

<template>
  <CrudPage
    resource="操作日志"
    :api="operlogCrudApi"
    id-key="operId"
    permission="monitor:operlog"
    hide-add
    hide-edit
    :columns="columns"
  >
    <template #toolbar="{ load }">
      <el-button
        v-has-permi="['monitor:operlog:remove']"
        type="danger"
        plain
        :icon="Delete"
        @click="handleClean(load)"
      >
        清空
      </el-button>
    </template>
  </CrudPage>
</template>
