<script setup lang="ts" generic="T extends object">
import { Plus, Delete, Refresh, Search, Download, Upload, UploadFilled } from '@element-plus/icons-vue'
import { computed, reactive, useSlots } from 'vue'
import { ElMessageBox } from 'element-plus/es'
import type { CrudApi } from '@/api'
import { useCrud } from '@/composables/useCrud'
import type { FormValue, QueryValue } from '@/composables/useCrud'
import type { CrudColumn, CrudFormField, TagType } from '@/composables/crud-config'
import { readQueryRange, writeQueryRange } from '@/utils/query-range'

/**
 * 配置驱动的 CRUD 页面。
 *
 * 传入接口、列定义、表单定义，就能得到一个完整的列表页：
 *   搜索区 + 工具栏 + 表格 + 分页 + 新增/编辑弹窗 + 删除确认
 *
 * 为什么值得做抽象：PGuide-Manage 的业务模块全是 RuoYi 生成器产物，
 * 约定完全一致。老 ruoyi-ui 每个页面各拷一份这套逻辑（67 个页面），
 * 改一个交互要改 67 处；这里页面文件只剩配置。
 *
 * 与 Vue3 的 `<script setup generic>` 配合，列定义里的 prop 会被约束成
 * 真实的字段名 —— 写错字段名类型检查就报错。
 */

const props = withDefaults(
  defineProps<{
    /** 资源名，用于提示文案与按钮，如「项目」 */
    resource: string
    api: CrudApi<T>
    /** 主键字段名 */
    idKey: keyof T & string
    columns: CrudColumn<T>[]
    formFields?: CrudFormField<T>[]
    /** 权限前缀，如 `manage:projectinfo`，用于按钮显隐 */
    permission?: string
    defaultQuery?: Record<string, QueryValue>
    formDefaults?: () => Record<string, FormValue>
    /**
     * 只读页面：等于同时打开 hideAdd / hideEdit / hideRemove。
     * 导出不受影响 —— 只读页面（操作日志、登录日志）恰恰最需要导出。
     */
    readonly?: boolean
    /** 单独隐藏新增（如日志类页面：只能看和删，不能改） */
    hideAdd?: boolean
    /** 单独隐藏「修改」 */
    hideEdit?: boolean
    /** 单独隐藏「删除」（同时也去掉多选列） */
    hideRemove?: boolean
    /**
     * 树形数据（菜单、部门）。
     * 开启后表格按 row-key + children 渲染成可展开的树，并隐藏分页
     * （树接口返回全量，不分页）。
     */
    tree?: boolean
  }>(),
  {
    formFields: () => [],
    permission: '',
    defaultQuery: () => ({}),
    formDefaults: undefined,
    readonly: false,
    hideAdd: false,
    hideEdit: false,
    hideRemove: false,
    tree: false,
  },
)

defineSlots<{
  /**
   * 工具栏左侧的自定义按钮（如「清空日志」）。
   * 插槽给 `load`，自定义按钮改完数据后可以直接刷新列表。
   */
  toolbar?: (props: { load: () => void; selectedIds: Array<number | string> }) => unknown
  /** 表格右侧的自定义操作列 */
  actions?: (props: { row: T }) => unknown
  /** 弹窗表单底部的自定义内容 */
  'form-extra'?: (props: { form: Record<string, unknown> }) => unknown
}>()

const crud = useCrud<T>({
  api: props.api,
  idKey: props.idKey,
  resourceName: props.resource,
  defaultQuery: props.defaultQuery,
  formDefaults: props.formDefaults,
})

// 页面打开就加载
void crud.load()

const slots = useSlots()

/**
 * 三组按钮的显隐。
 *
 * `readonly` 是「全隐藏」的快捷写法；单独的 hideXxx 用来应付
 * 日志类页面（操作日志：只读 + 可删除，导入导出另说）。
 */
const showAdd = computed(() => !props.readonly && !props.hideAdd)
const showEdit = computed(() => !props.readonly && !props.hideEdit)
const showRemove = computed(() => !props.readonly && !props.hideRemove)
/** 操作列：只要还有按钮、或者外面塞了自定义操作，就留着 */
const showActionsColumn = computed(
  () => showEdit.value || showRemove.value || Boolean(slots.actions),
)

/** 权限点：RuoYi 的约定是 {prefix}:list / :add / :edit / :remove */
function perm(action: string): string[] {
  return props.permission ? [`${props.permission}:${action}`] : []
}

const searchColumns = props.columns.filter((c) => c.searchable)

/** 表格里要展示的列 */
const tableColumns = props.columns

function renderCell(row: T, column: CrudColumn<T>): string {
  // T 是泛型对象，取值时按 Record 读；列定义里的 prop 已被约束为 keyof T
  const raw = (row as Record<string, unknown>)[column.prop]
  if (raw === null || raw === undefined || raw === '') return '—'

  switch (column.display) {
    case 'datetime':
      return String(raw).replace('T', ' ').slice(0, 19)
    case 'bool':
      return raw === 1 || raw === '1' || raw === 'Y' ? '是' : '否'
    // tag 和 dict 都要按字典把值翻译成文案。
    // 第一版漏了 'tag' 分支，导致所有标签列（用户状态、角色状态、
    // 项目状态……）显示的都是原始数字而不是「待审核」这类文案 ——
    // 由 CrudPage 的渲染测试抓出来。
    case 'tag':
    case 'dict':
      return column.dict?.find((d) => String(d.value) === String(raw))?.label ?? String(raw)
    default:
      return String(raw)
  }
}

function tagOf(row: T, column: CrudColumn<T>): TagType {
  const raw = (row as Record<string, unknown>)[column.prop]
  return column.dict?.find((d) => String(d.value) === String(raw))?.tag ?? 'info'
}

async function handleSubmit(): Promise<void> {
  await crud.submit()
}

/**
 * 导入弹窗的本地状态。
 *
 * 导入是「选文件 → 勾选项 → 确定」三步，和新增/编辑弹窗的字段表单不是一回事，
 * 所以单独一份状态，不塞进 useCrud 的 dialog。
 */
const importDialog = reactive({
  visible: false,
  file: null as File | null,
  updateSupport: false,
})

function openImport(): void {
  importDialog.file = null
  importDialog.updateSupport = false
  importDialog.visible = true
}

/** el-upload 的 on-change：只留最后一个文件（:limit="1" 已经限制，这里再兜一层） */
function handleFileChange(uploadFile: { raw?: File }): void {
  importDialog.file = uploadFile.raw ?? null
}

function handleFileRemove(): void {
  importDialog.file = null
}

async function handleImport(): Promise<void> {
  if (!importDialog.file) return

  const message = await crud.importData(importDialog.file, importDialog.updateSupport)
  if (message === null) return

  importDialog.visible = false
  // RuoYi 的导入结果是一段多行文案（成功几条、失败几条、失败原因），
  // 用 alert 展示才看得清，ElMessage 会被截断
  void ElMessageBox.alert(message, '导入结果', { confirmButtonText: '确定' })
}

function handleRemoveSelected(): void {
  void crud.remove()
}

function handleRemoveRow(row: T): void {
  void crud.remove([row[props.idKey] as number | string])
}

defineExpose({ crud })
</script>

<template>
  <div class="crud-page">
    <!-- 搜索区 -->
    <el-card v-if="searchColumns.length" class="crud-page__search" shadow="never">
      <el-form :model="crud.query" inline @submit.prevent="crud.search()">
        <el-form-item v-for="col in searchColumns" :key="col.prop" :label="col.label">
          <el-select
            v-if="col.searchType === 'select'"
            v-model="crud.query[col.prop]"
            :placeholder="col.placeholder ?? `请选择${col.label}`"
            clearable
            style="width: 180px"
          >
            <el-option
              v-for="opt in col.searchOptions ?? []"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <el-date-picker
            v-else-if="col.searchType === 'daterange'"
            :model-value="readQueryRange(crud.query, col)"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 260px"
            @update:model-value="(value: unknown) => writeQueryRange(crud.query, col, value)"
          />

          <el-input
            v-else
            v-model="crud.query[col.prop]"
            :placeholder="col.placeholder ?? `请输入${col.label}`"
            clearable
            style="width: 180px"
            @keyup.enter="crud.search()"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="crud.search()">查询</el-button>
          <el-button :icon="Refresh" @click="crud.reset()">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区 -->
    <el-card class="crud-page__table" shadow="never">
      <div class="crud-page__toolbar">
        <div class="crud-page__toolbar-left">
          <el-button
            v-if="showAdd"
            v-has-permi="perm('add')"
            type="primary"
            :icon="Plus"
            @click="crud.openAdd()"
          >
            新增
          </el-button>
          <el-button
            v-if="showRemove"
            v-has-permi="perm('remove')"
            type="danger"
            plain
            :icon="Delete"
            :disabled="crud.selectedIds.value.length === 0"
            @click="handleRemoveSelected"
          >
            删除
          </el-button>
          <!--
            导出不受 readonly 影响：操作日志、登录日志这类只读页面
            恰恰是最需要导出的（列表不允许改，但要能带走分析）。
          -->
          <el-button
            v-if="crud.canExport.value"
            v-has-permi="perm('export')"
            type="warning"
            plain
            :icon="Download"
            :loading="crud.exporting.value"
            @click="crud.exportData()"
          >
            导出
          </el-button>
          <el-button
            v-if="crud.canImport.value"
            v-has-permi="perm('import')"
            type="info"
            plain
            :icon="Upload"
            @click="openImport"
          >
            导入
          </el-button>
          <slot name="toolbar" :load="crud.load" :selected-ids="crud.selectedIds.value" />
        </div>
        <div class="crud-page__toolbar-right">
          <el-button :icon="Refresh" circle @click="crud.load()" />
        </div>
      </div>

      <el-table
        v-loading="crud.loading.value"
        :data="crud.list.value"
        border
        :row-key="idKey"
        :tree-props="tree ? { children: 'children', hasChildren: 'hasChildren' } : undefined"
        :default-expand-all="tree"
        @selection-change="crud.handleSelectionChange"
      >
        <!-- 多选列只在「有批量删除」时出现，否则是个没用的勾选框 -->
        <el-table-column v-if="showRemove" type="selection" width="48" />

        <el-table-column
          v-for="col in tableColumns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth ?? 120"
          :align="col.align ?? 'left'"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-tag v-if="col.display === 'tag'" :type="tagOf(row, col)" size="small">
              {{ renderCell(row, col) }}
            </el-tag>
            <span v-else>{{ renderCell(row, col) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          v-if="showActionsColumn"
          label="操作"
          width="160"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="showEdit"
              v-has-permi="perm('edit')"
              type="primary"
              link
              @click="crud.openEdit(row)"
            >
              修改
            </el-button>
            <el-button
              v-if="showRemove"
              v-has-permi="perm('remove')"
              type="danger"
              link
              @click="handleRemoveRow(row)"
            >
              删除
            </el-button>
            <slot name="actions" :row="row" />
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="!tree"
        class="crud-page__pagination"
        :current-page="crud.query.pageNum"
        :page-size="crud.query.pageSize"
        :total="crud.total.value"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="crud.handleSizeChange"
        @current-change="crud.handleCurrentChange"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="crud.dialog.visible"
      :title="crud.dialog.title"
      width="640px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="crud.form.value" label-width="110px">
        <el-row :gutter="16">
          <el-col
            v-for="field in formFields.filter((f) => !(f.onlyOnCreate && crud.dialog.isEdit))"
            :key="field.prop"
            :span="field.span ?? 24"
          >
            <el-form-item
              :label="field.label"
              :prop="field.prop"
              :rules="field.required ? [{ required: true, message: `请填写${field.label}` }] : []"
            >
              <el-select
                v-if="field.type === 'select'"
                v-model="crud.form.value[field.prop]"
                :placeholder="field.placeholder ?? `请选择${field.label}`"
                :disabled="field.readonly"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="opt in field.options ?? []"
                  :key="String(opt.value)"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <el-radio-group
                v-else-if="field.type === 'radio'"
                v-model="crud.form.value[field.prop]"
                :disabled="field.readonly"
              >
                <el-radio
                  v-for="opt in field.options ?? []"
                  :key="String(opt.value)"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </el-radio>
              </el-radio-group>

              <el-input
                v-else-if="field.type === 'textarea'"
                v-model="crud.form.value[field.prop] as string"
                type="textarea"
                :rows="4"
                :maxlength="field.maxlength"
                :placeholder="field.placeholder"
                :disabled="field.readonly"
              />

              <el-input-number
                v-else-if="field.type === 'number'"
                v-model="crud.form.value[field.prop] as number"
                :disabled="field.readonly"
              />

              <el-date-picker
                v-else-if="field.type === 'datetime'"
                v-model="crud.form.value[field.prop]"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
                :disabled="field.readonly"
              />

              <el-input
                v-else
                v-model="crud.form.value[field.prop] as string"
                :maxlength="field.maxlength"
                :placeholder="field.placeholder"
                :disabled="field.readonly"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <slot name="form-extra" :form="crud.form.value" />
      </el-form>

      <template #footer>
        <el-button @click="crud.dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="crud.submitting.value" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 导入弹窗（只有配置了 importable 的模块才会打开） -->
    <el-dialog v-model="importDialog.visible" :title="`导入${resource}`" width="420px" append-to-body>
      <el-upload
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
      >
        <el-icon class="crud-page__upload-icon"><UploadFilled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">
            仅允许导入 xls、xlsx 格式文件。
            <!-- underline 用 'never' 字符串：Element Plus 2.14 起布尔写法已废弃 -->
            <el-link type="primary" underline="never" @click="crud.downloadTemplate()">
              下载模板
            </el-link>
          </div>
        </template>
      </el-upload>

      <el-checkbox v-model="importDialog.updateSupport" class="crud-page__update-support">
        是否更新已经存在的{{ resource }}数据
      </el-checkbox>

      <template #footer>
        <el-button @click="importDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!importDialog.file"
          :loading="crud.importing.value"
          @click="handleImport"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.crud-page {
  display: flex;
  flex-direction: column;
  gap: var(--pg-spacing-md);

  &__search {
    :deep(.el-form-item) {
      margin-bottom: 0;
    }
    :deep(.el-card__body) {
      padding-bottom: 0;
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--pg-spacing-md);
  }

  &__toolbar-left {
    display: flex;
    align-items: center;
    gap: var(--pg-spacing-sm);
  }

  &__pagination {
    margin-top: var(--pg-spacing-md);
    justify-content: flex-end;
  }

  &__upload-icon {
    font-size: 48px;
    color: var(--pg-text-placeholder);
    margin-bottom: 8px;
  }

  &__update-support {
    margin-top: var(--pg-spacing-md);
  }
}
</style>
