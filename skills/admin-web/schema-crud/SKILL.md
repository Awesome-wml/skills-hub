---
name: schema-crud
description: |
  Schema 驱动的 CRUD 页面生成指南。使用 VabSchemaTable + VabSchemaForm / VabSchemaFormDialog / VabSchemaFormDrawer 组件，
  通过声明式 JSON 配置生成完整的增删改查页面，替代手写 el-table / el-form 样板代码。
  适用于所有列表页、编辑弹窗、编辑抽屉、页面内嵌表单场景。
metadata:
  last-updated: '2026-10-31'
---

# Schema CRUD 开发指南

> **核心思路**：用 JSON Schema 描述「有哪些列 / 字段」，组件自动渲染表格搜索、表单控件、校验规则、远程下拉。
> 一个典型 CRUD 页面只需 **列定义 + 字段定义 + API 函数**，不写任何 `<el-form-item>` / `<el-table-column>`。
> **接口对接强约束**：SDK / OpenAPI / 后端接口有的字段就直接对齐；没有的字段就空着，禁止前端为列表、搜索、表单提交自行造字段兜底、补 `[]` / `{}` / `0` / `''` 或猜测默认值。
> **分页列表展示强约束**：凡是字段配置类数据（字典、枚举、状态、业务类型等），只要接口返回了对应 `{field}Label` 字段，列表纯文本展示统一取 `Label` 值。
> 涉及字段映射、返回值归一化、临时兼容判断时，同时遵守 [`../api-contract-strict/SKILL.md`](../api-contract-strict/SKILL.md)。
> **菜单强约束**：侧栏菜单以后端返回为准。新增列表页不要再声明一条可见静态菜单，也不要把静态路由补进后端菜单树。无独立入口的子页面必须 `meta.hidden: true`。

---

## 一、文件结构约定

```
src/views/{module}/{page}/
  index.vue                              ← 列表页（VabSchemaTable）
  vabAutoComponents/
    {PageName}Edit.vue                   ← 编辑弹窗（VabSchemaFormDialog）
    {PageName}DrawerEdit.vue             ← 编辑抽屉（VabSchemaFormDrawer，可选）
src/api/{moduleName}.ts                  ← API 函数
```

- 列表页根 div **必须**加 `auto-height-container`
- 编辑组件放 `vabAutoComponents/` 下，自动注册无需 import
- `defineOptions({ name: 'ComponentName' })` **必须**声明
- **Plop `pnpm run template` → curd**：会提示 **`folder`**（相对 `src/views/`，可多级如 `fulfillment/basic`），再输入英文 `name`；生成 `src/views/{folder}/{ProperCase}.vue` 与 `vabAutoComponents/{ProperCase}Edit.vue`
- **表格/密度/分页细节**以组件 README 为准：`library/components/VabSchemaTable/README.md`

---

## 二、VabSchemaTable — 列驱动表格

### 分页列表字段展示硬规则

- 只要列表列展示的是字段配置类数据，并且接口 / SDK 返回了对应 `{field}Label` 字段，列展示必须优先取 `Label` 字段。
- 适用位置包括：`columns.formatter`、`#cell-{dataIndex}` 插槽、请求返回后的列表数据归一化层。
- 不要把 `status`、`type`、`bizType`、`mode`、`enabled` 这类 code 值直接展示到列表上。
- 已有 `{field}Label` 时，不要再查一遍前端字典、手写 `switch`、手拼中文文案去覆盖它。
- 如果预期的 `{field}Label` 当前没返回，默认保持空态，不要自行回退到本地字典、原 code 值或别的近义字段；只有用户明确要求临时兼容，或用户明确说明已和后端约定该过渡口径时，才允许按指定方式处理。
- 这条规则只用于纯展示文本；搜索区下拉、编辑弹窗/抽屉里的 `select`/`radio`/远程下拉回显仍绑定原字段 value/code，不用 `{field}Label`。
- 后续新增功能里，如果列表纯展示场景缺少预期的 `{field}Label`，先保持空态，并询问用户是否要先按 `{field}Label` 命名把展示链路接到页面里。
- **`{field}Label` 从哪来**：后端 DTO 字段加 `@DictLabel("dict_key")` 后，响应自动注入 `{字段名}Label`（如 `settleStatus` → `settleStatusLabel`）。缺 Label 的正解是让后端新建字典 + 加注解（记为 `⚠️ 【待后端】` 子任务），**不是在 `.vue` 里写 code→中文 map**——前端 map 会与后端枚举漂移，后端加一个状态、前端漏一个键，列表就裸露英文 code。
- **允许留在前端的只有颜色**：`el-tag` 的 `type`（success / warning / danger）可用前端小 map 按 code 判断，文案仍取 `{field}Label`。
- **搜索下拉选项**：用 `getDictItemsByKey(DICT_KEY_XXX)`（`/@/api/dictManagement`，key 常量在 `src/constants/dictKeys.ts`）拉取；已加载选项后需要按 code 取 label 时，用页面内的 `resolveDictLabel(options, code)` 小工具（项目里是各页面自带的局部函数，没有全局导出；找不到时返回空，不回退 code）。启用/停用这类固定二值可直接写 `options`。

#### 推荐写法

```typescript
{
  dataIndex: 'status',
  title: '状态',
  formatter: (row: any) => row.statusLabel ?? '',
}
```

```vue
<!-- 状态列：颜色前端判断，文案读 Label -->
<template #cell-settleStatus="{ row, elSize }">
  <el-tag :size="elSize" :type="SETTLE_TAG_TYPE[row.settleStatus]">{{ row?.settleStatusLabel || '' }}</el-tag>
</template>
```

```typescript
// 搜索区下拉：选项来自字典接口，绑定 code
import { getDictItemsByKey } from '/@/api/dictManagement'
import { DICT_KEY_XXX } from '/@/constants/dictKeys'

const settleStatusOptions = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const { data } = await getDictItemsByKey(DICT_KEY_XXX) // { code, label }[]
  settleStatusOptions.value = data.map((i: any) => ({ label: i.label, value: i.code }))
})

// 选项异步加载，columns 要用 computed 才能拿到更新后的 options
const columns = computed<SchemaTableColumn[]>(() => [
  { dataIndex: 'settleStatus', title: '结款状态', search: { control: 'select', options: settleStatusOptions.value } },
])
```

如果列表接口已经在 API 层做过归一化，也应保持同一规则，例如保持 `statusLabel` 原样透传，不要再从 `status`、本地字典或近义字段反推一个展示值来掩盖契约缺口。

### 最小示例

```vue
<template>
  <div class="carrier-container auto-height-container">
    <vab-schema-table
      ref="tableRef"
      :columns="columns"
      :request="runRequest"
      row-key="id"
      row-selection
      @selection-change="selectRows = $event"
    >
      <template #toolbar-left="{ elSize }">
        <el-button :icon="Plus" :size="elSize" type="primary" @click="handleAdd">新增</el-button>
      </template>
      <template #cell-enabled="{ row, elSize }">
        <el-tag :size="elSize" :type="row.enabled === 1 ? 'success' : 'danger'">
          {{ row.enabledLabel ?? '' }}
        </el-tag>
      </template>
      <template #actions="{ row, elSize }">
        <el-button :size="elSize" text type="primary" @click="handleEdit(row)">编辑</el-button>
        <el-button :size="elSize" text type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </vab-schema-table>

    <carrier-edit ref="editRef" @fetch-data="handleFetchData" />
  </div>
</template>

<script lang="ts" setup>
import { Plus } from '@element-plus/icons-vue'
import { doDelete, getPage } from '/@/api/carrier'
import type { SchemaTableColumn, SchemaTableInstance } from '~/types/schemaTable'

defineOptions({ name: 'CarrierManagement' })

const editRef = ref<any>(null)
const tableRef = ref<SchemaTableInstance | null>(null)
const selectRows = ref<any[]>([])

const columns: SchemaTableColumn[] = [
  { dataIndex: 'carrierCode', title: '承运商编码', minWidth: 110, search: { control: 'input' } },
  { dataIndex: 'carrierName', title: '承运商名称', minWidth: 120, search: { control: 'input' } },
  {
    dataIndex: 'enabled', title: '是否启用', width: 100, align: 'center',
    search: {
      control: 'select',
      options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }],
    },
  },
  { dataIndex: 'companyFullname', title: '公司名称', minWidth: 150 },
  // 时间列(createdAt/updatedAt/xxxAt/xxxTime)无需 formatter:VabSchemaTable 自动识别时间串
  // 渲染为 YYYY-MM-DD HH:mm(纯日期只显日期),走 /@/utils/dateFormat,东八区墙上时间不偏移
  { dataIndex: 'updatedAt', title: '更新时间', minWidth: 160, sorter: true },
]

const runRequest = async (params: Record<string, any>) => {
  const res = await getPage(params)
  return { list: res.data.list, total: res.data.total }
}

const handleFetchData = () => tableRef.value?.fetchData()
const handleAdd = () => editRef.value.showEdit()
const handleEdit = (row: any) => editRef.value.showEdit(row)
const handleDelete = (row: any) => {
  $baseConfirm('确定删除吗', null, async () => {
    await doDelete(row.id)
    $baseMessage('删除成功', 'success', 'hey')
    handleFetchData()
  })
}
</script>
```

### SchemaTableColumn 字段说明

| 属性 | 类型 | 说明 |
|------|------|------|
| `dataIndex` | `string` | 行数据字段名，同时作为搜索参数名 |
| `title` | `string` | 列标题 |
| `minWidth` / `width` | `number \| string` | 列宽（**优先用 minWidth 让表格自适应**） |
| `align` | `'left' \| 'center' \| 'right'` | 对齐 |
| `fixed` | `boolean \| 'left' \| 'right'` | 固定列 |
| `showOverflowTooltip` | `boolean` | 溢出提示 |
| `className` | `string` | 列 CSS class（如 `'is-money'` 实现金额右对齐） |
| `formatter` | `(row, column, cellValue, index) => string` | 单元格格式化函数 |
| `hideInSearch` | `boolean` | 不生成搜索项 |
| `hideInTable` | `boolean` | 不渲染列（搜索专用字段） |
| `sorter` | `boolean \| { sortField }` | 服务端排序 |
| `search` | `SchemaTableSearchConfig` | 搜索配置（见下方） |

#### 列宽最佳实践

- **优先用 `minWidth`**：el-table 会自动将剩余空间分配给 minWidth 列，实现自适应
- **只在固定宽度列用 `width`**：如状态标签（`width: 100`）、操作列
- 不设 width 也不设 minWidth 时，el-table 会均分剩余空间

#### 金额列配置

```typescript
{
  dataIndex: 'amount',
  title: '金额',
  minWidth: 120,
  className: 'is-money',  // 自动右对齐 + 等宽数字
  formatter: (row, col, val) => val != null ? `¥${Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '',
}
```

全局 CSS 已内置 `.is-money .cell { text-align: right; font-variant-numeric: tabular-nums; }`。

### SchemaTableSearchConfig

| 属性 | 类型 | 说明 |
|------|------|------|
| `control` | `'input' \| 'select' \| 'date' \| 'daterange' \| ...` | 搜索控件类型 |
| `placeholder` | `string` | 占位文本 |
| `options` | `{ label, value }[]` | select 选项 |
| `rangeParamKeys` | `[string, string]` | 日期范围拆分为两个参数 |
| `valueFormat` | `string` | 日期格式化 |

### VabSchemaTable Props

| Prop | 默认值 | 说明 |
|------|--------|------|
| `columns` | 必填 | 列定义数组 |
| `request` | 必填 | 请求函数，返回 `{ list, total }` |
| `rowKey` | `'id'` | 行唯一键 |
| `rowSelection` | `false` | 是否显示多选列 |
| `tableClass` | `'vab-narrow-table'` | 表格额外 class |
| `showPagination` | `true` | 是否显示分页 |
| `paginationSmall` | 不传 | 强制分页 `size`：`true`→小号 / `false`→默认档；不传则与 `elSize` 一致 |
| `density` | `'auto'` | `'small'` \| `'default'` \| `'auto'`（见下文「密度与全局字号」） |
| `autoDensityFontPx` | `15` | `density=auto` 时，全局字号 ≥ 该 px 则用 `default` 密度，否则 `small` |
| `defaultPageSize` | `10` | 默认每页条数 |
| `pageField` | `'pageNum'` | 页码参数名 |
| `sizeField` | `'pageSize'` | 每页条数参数名 |
| `sortFieldParam` / `sortOrderParam` | `'sortField'` / `'sortOrder'` | 服务端排序请求参数名 |
| `actionColumnWidth` | `160` | 操作列宽度 |
| `actionColumnLabel` | `'操作'` | 操作列标题 |
| `immediate` | `true` | 挂载时自动请求 |

#### 密度与全局字号（`density` / `elSize`）

- 与顶部 **VabFontSize** 同源：读 Pinia `settings.theme.fontSize`。
- 映射规则：`src/utils/epComponentSize.ts` 中 **`epComponentSizeFromFontSize`**，默认阈值 **`autoDensityFontPx === 15`**（字号 &lt; 15px → EP `small`，否则 `default`）。
- 统一 token **`elSize`** 同时作用于：`el-form`、搜索控件、工具栏默认按钮、`el-table`、`vab-pagination` 的 **`size`**（以及插槽里的 `elSize`）。
- 应用根 **`library/components/VabApp/index.vue`** 的 **`ElConfigProvider :size`** 使用同一规则，未显式写 `size` 的 EP 组件会跟随全局。

#### 列表占满屏（`auto-height-container`）

全局样式 `library/styles/vab.scss` 中 `.auto-height-container` 为 **column flex**，且 **仅直接子元素** 是 flex 子项；原手写页 **`el-table` 直接挂在 container 下**，故 `.el-table { flex: 1 }` 能撑满中间区域。**VabSchemaTable** 在根节点 **`.vab-schema-table`** 上增加了 **`display:flex; flex-direction:column; flex:1; min-height:0`**，内部 **`el-table` 再 `flex:1`**，避免 Schema 页「表格不跟屏」的问题。若页顶还有 **`el-alert`** 等块，仍把 **`auto-height-container`** 写在最外层包裹即可。

### VabSchemaTable Slots

| Slot | 作用域 | 说明 |
|------|--------|------|
| `#toolbar-left` | `{ elSize }` | 表格上方左侧工具栏（新增/删除按钮） |
| `#toolbar-right` | `{ elSize }` | 表格上方右侧工具栏 |
| `#cell-{dataIndex}` | `{ row, column, $index, elSize }` | 自定义单元格渲染 |
| `#actions` | `{ row, column, $index, elSize }` | 操作列 |

### SchemaTableInstance 方法

| 方法 | 说明 |
|------|------|
| `reload()` | 重置分页并重新加载 |
| `fetchData()` | 保持当前分页重新加载 |
| `queryData()` | 触发搜索（重置到第一页） |
| `resetSearch()` | 清空搜索条件并加载 |

---

## 三、VabSchemaFormDialog — 弹窗表单

### 最小示例

```vue
<!-- vabAutoComponents/CarrierEdit.vue -->
<template>
  <vab-schema-form-dialog
    ref="formDialogRef"
    :add-api="doAdd"
    :edit-api="doEdit"
    :fields="formFields"
    title-prefix="承运商"
    @saved="emit('fetch-data')"
  />
</template>

<script lang="ts" setup>
import type { SchemaFormField, SchemaFormDialogInstance } from '~/types/schemaForm'
import { doAdd, doEdit } from '/@/api/carrier'

defineOptions({ name: 'CarrierEdit' })
const emit = defineEmits(['fetch-data'])
const formDialogRef = ref<SchemaFormDialogInstance>()

const formFields: SchemaFormField[] = [
  { field: 'carrierCode', label: '承运商编码', required: true, disabledOnEdit: true },
  { field: 'carrierName', label: '承运商名称', required: true, disabledOnEdit: true },
  {
    field: 'enabled', label: '是否启用', control: 'select', required: true, defaultValue: 1,
    options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }],
  },
  { field: 'companyFullname', label: '公司名称' },
  { field: 'contactName', label: '联系人' },
  { field: 'phone', label: '电话' },
  { field: 'address', label: '地址', colSpan: 24 },
  { field: 'remark', label: '备注', control: 'textarea', colSpan: 24 },
]

const showEdit = (row?: any) => formDialogRef.value?.showEdit(row)
defineExpose({ showEdit })
</script>
```

### VabSchemaFormDialog Props

| Prop | 默认值 | 说明 |
|------|--------|------|
| `fields` | 必填 | 字段配置数组 |
| `addApi` | — | 新增 API 函数 |
| `editApi` | — | 编辑 API 函数 |
| `titlePrefix` | `''` | 标题前缀（自动拼接「-新增」/「-编辑」） |
| `title` | — | 固定标题（优先于 titlePrefix） |
| `dialogWidth` | `'900px'` | 弹窗宽度 |
| `gutter` | `20` | 列间距 |
| `defaultColSpan` | `8` | 默认列宽（24栅格，8=一行三列） |
| `labelPosition` | `'top'` | 标签位置 |
| `rowKeyField` | `'id'` | 判断编辑模式的字段名 |
| `beforeSubmit` | — | `(data, isEdit) => data` 提交前拦截 |
| `afterOpen` | — | `(form, isEdit) => void` 打开后回调 |
| `appendToBody` | `true` | 挂载到 body |

### Events

| Event | 说明 |
|-------|------|
| `@saved` | 保存成功后触发 |

### SchemaFormDialogInstance 方法

| 方法 | 说明 |
|------|------|
| `showEdit(row?)` | 打开弹窗，传 row 为编辑模式 |
| `close()` | 关闭弹窗 |
| `validate()` | 校验，返回 Promise<boolean> |
| `getValues()` | 获取表单数据副本 |
| `setValues(data)` | 填充表单数据 |
| `resetFields()` | 重置为默认值 |

---

## 四、VabSchemaFormDrawer — 抽屉表单

API 与 Dialog 完全一致，仅容器不同。

```vue
<template>
  <vab-schema-form-drawer
    ref="formDrawerRef"
    :add-api="doAdd"
    :edit-api="doEdit"
    :fields="formFields"
    title-prefix="承运商"
    @saved="emit('fetch-data')"
  />
</template>
```

### Drawer 特有 Props

| Prop | 默认值 | 说明 |
|------|--------|------|
| `drawerSize` | `'900px'` | 抽屉宽度 |
| `direction` | `'rtl'` | 方向：rtl / ltr / ttb / btt |

其余 Props（fields, addApi, editApi, titlePrefix, gutter, defaultColSpan 等）与 Dialog 相同。

---

## 五、VabSchemaForm — 纯表单（无容器）

当需要嵌入 Drawer / 页面 / 自定义容器时，直接用纯表单组件：

```vue
<el-drawer v-model="visible" title="编辑" size="900px">
  <vab-schema-form ref="formRef" :fields="fields" />
  <template #footer>
    <el-button @click="visible = false">取消</el-button>
    <el-button type="primary" @click="handleSave">保存</el-button>
  </template>
</el-drawer>

<script setup>
const formRef = ref()
const handleSave = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return
  const data = formRef.value.getValues()
  await doEdit(data)
  // ...
}
</script>
```

### SchemaFormInstance 方法

| 方法 | 说明 |
|------|------|
| `validate()` | 校验，返回 Promise<boolean> |
| `resetFields()` | 重置为默认值 |
| `clearValidate()` | 清除校验状态 |
| `setValues(data)` | 填充表单数据 |
| `getValues()` | 获取表单数据副本 |
| `setEditMode(isEdit)` | 设置编辑/新增模式 |
| `initRemoteSelects(formData?)` | 初始化远程下拉（含回显） |
| `form` | reactive 表单对象（只读访问） |
| `isEdit` | 当前是否编辑模式 |

---

## 六、SchemaFormField 完整配置

### 基础属性

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `field` | `string` | 是 | 字段名 |
| `label` | `string` | 是 | 标签文本 |
| `control` | `SchemaFormControl` | — | 控件类型，默认 `'input'` |
| `colSpan` | `number` | — | 栅格宽度（默认取 defaultColSpan=8） |
| `placeholder` | `string` | — | 占位提示 |
| `defaultValue` | `any` | — | 默认值 |

### 控件类型（SchemaFormControl）

| 类型 | 渲染为 | 备注 |
|------|--------|------|
| `'input'` | `<el-input>` | 默认，自动 trim |
| `'textarea'` | `<el-input type="textarea">` | rows 默认 3；maxlength 默认 200，可用 `maxlength` 覆盖，`0` 表示不限制；disabled / readonly 时仍显示字数 |
| `'inputnumber'` | `<el-input-number>` | 支持 min/max/step/precision |
| `'select'` | `<el-select>` | 需配 options |
| `'remote-select'` | `<el-select remote filterable>` | 需配 remoteConfig |
| `'date'` | `<el-date-picker type="date">` | 默认 YYYY-MM-DD |
| `'datetime'` | `<el-date-picker type="datetime">` | 默认 YYYY-MM-DD HH:mm:ss |
| `'daterange'` | `<el-date-picker type="daterange">` | |
| `'datetimerange'` | `<el-date-picker type="datetimerange">` | |
| `'switch'` | `<el-switch>` | 支持 activeValue/inactiveValue |
| `'radio'` | `<el-radio-group>` | 需配 options |
| `'checkbox'` | `<el-checkbox-group>` | 需配 options，默认值 `[]` |
| `'divider'` | `<el-divider>` | 段落分隔线，占满整行，不绑定数据 |
| `'slot'` | 用户自定义 | 纯占位，必须通过 `#form-{field}` slot 提供内容，默认 colSpan=24 |

### 校验

| 属性 | 类型 | 说明 |
|------|------|------|
| `required` | `boolean` | 自动生成必填规则（input 触发 blur，select 类触发 change） |
| `rules` | `FormItemRule[]` | 自定义校验规则，与 required 可叠加 |

### 行为控制

| 属性 | 类型 | 说明 |
|------|------|------|
| `disabledOnEdit` | `boolean` | 编辑模式下禁用（编码类字段常用） |
| `disabled` | `boolean` | 始终禁用 |
| `hidden` | `(form, isEdit) => boolean` | 动态隐藏字段 |

### 控件专属属性

| 属性 | 适用控件 | 说明 |
|------|---------|------|
| `rows` | textarea | 行数，默认 3 |
| `maxlength` | textarea / input / digit-input / telephone-input | textarea 默认 200，正整数覆盖，`0` 不限制；disabled / readonly 时组件补绘字数；digit-input 默认 6；telephone-input 默认 20 |
| `min` / `max` / `step` / `precision` | inputnumber | 数字范围和精度 |
| `options` | select / radio / checkbox | `{ label, value, disabled? }[]` |
| `multiple` | select / remote-select | 是否多选 |
| `remoteConfig` | remote-select | 远程下拉配置（见下方） |
| `valueFormat` / `format` | date 类 | 日期格式化 |
| `startPlaceholder` / `endPlaceholder` | daterange / datetimerange | 范围占位 |
| `activeValue` / `inactiveValue` | switch | 激活/非激活值 |

---

## 七、远程下拉（remote-select）

远程下拉内部使用 `useRemoteSelect` hook，自动处理搜索防抖、分页加载、编辑回显。

```typescript
{
  field: 'warehouseId',
  label: '仓库',
  control: 'remote-select',
  required: true,
  disabledOnEdit: true,
  remoteConfig: {
    fetchFn: getWarehousePage,                              // API 函数
    searchField: 'warehouseName',                           // 搜索关键字参数名
    extraParams: { enabled: 1 },                            // 固定查询参数
    labelRender: (item) => `${item.warehouseCode}-${item.warehouseName}`, // 显示文本
    valueField: 'id',                                       // 取值字段，默认 'id'
    buildSelectedItem: (form) =>                            // 编辑回显
      form.warehouseId
        ? { id: form.warehouseId, warehouseCode: form.warehouseCode, warehouseName: form.warehouseName }
        : null,
  },
}
```

### remoteConfig 完整字段

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fetchFn` | `(params) => Promise` | 是 | API 请求函数，返回 `{ data: { list, total } }` |
| `searchField` | `string` | 是 | 搜索关键字对应的接口参数名 |
| `extraParams` | `Record<string, any>` | — | 固定附加查询参数 |
| `pageSize` | `number` | — | 每页条数，默认 50 |
| `labelRender` | `(item) => string` | 是 | 下拉选项显示文本 |
| `valueField` | `string` | — | 取值字段，默认 `'id'` |
| `buildSelectedItem` | `(form) => item \| null` | — | 编辑回显：根据表单数据构造已选项 |

---

## 八、字段依赖

当一个字段的值变化时，需要清空或联动其他字段：

```typescript
{
  field: 'warehouseId',
  label: '仓库',
  control: 'remote-select',
  dependency: {
    clearFields: ['roomId', 'zoneId', 'areaId'],  // 仓库变更时清空仓间、库区、作业区域
    onChange: (value, form, optionList) => {
      // 自定义联动逻辑
      const selected = optionList?.find(item => item.id === value)
      if (selected) {
        form.warehouseCode = selected.warehouseCode
      }
    },
  },
},
```

### dependency 字段

| 属性 | 类型 | 说明 |
|------|------|------|
| `clearFields` | `string[]` | 值变更时清空的字段名数组 |
| `onChange` | `(value, form, optionList?) => void` | 值变更回调，optionList 为当前字段的选项列表 |

---

## 九、自定义控件（Slot 覆盖）

VabSchemaForm 为每个字段预留了 `form-{field}` 具名 slot，可以覆盖内置控件渲染任意自定义组件：

```vue
<vab-schema-form-dialog ref="formDialogRef" :fields="formFields" ...>
  <!-- 用 slot 覆盖 progress 字段，渲染 el-slider -->
  <template #form-progress="{ form, disabled }">
    <el-slider v-model="form.progress" :disabled="disabled" :max="100" :min="0" show-input />
  </template>

  <!-- 金额输入：自定义 money-input 组件 -->
  <template #form-amount="{ form, disabled }">
    <money-input v-model="form.amount" :disabled="disabled" />
  </template>

  <!-- 上传图片 -->
  <template #form-avatar="{ form }">
    <el-upload :http-request="handleUpload" :show-file-list="false" accept="image/*">
      <el-avatar v-if="form.avatar" :src="form.avatar" :size="80" />
      <el-icon v-else style="font-size:30px;color:#ccc"><Plus /></el-icon>
    </el-upload>
  </template>

  <!-- 树形下拉 -->
  <template #form-deptId="{ form, disabled }">
    <el-tree-select
      v-model="form.deptId"
      :data="deptTree"
      :disabled="disabled"
      node-key="id"
      check-strictly
      :props="{ label: 'name', children: 'children' }"
      clearable
      filterable
      placeholder="请选择部门"
      style="width: 100%"
    />
  </template>
</vab-schema-form-dialog>
```

### Slot 作用域

| 属性 | 类型 | 说明 |
|------|------|------|
| `form` | `Record<string, any>` | 表单响应式对象，直接 v-model 绑定 |
| `field` | `SchemaFormField` | 当前字段配置 |
| `isEdit` | `boolean` | 当前是否编辑模式 |
| `disabled` | `boolean` | 当前字段是否禁用 |

### 常见自定义控件场景

| 场景 | Slot 内使用 |
|------|-------------|
| 金额输入（分/元转换） | 自定义 money-input 或 el-input-number + 格式化 |
| 滑块 | `<el-slider>` |
| 评分 | `<el-rate>` |
| 颜色选择 | `<el-color-picker>` |
| 树形下拉 | `<el-tree-select>` |
| 级联选择 | `<el-cascader>` |
| 文件/图片上传 | `<el-upload>` |
| 富文本编辑器 | 第三方编辑器组件 |
| 穿梭框 | `<el-transfer>` |

**重要**：使用 slot 自定义控件时，字段仍需在 `formFields` 中声明（用于校验、默认值、hidden 等），只是渲染由 slot 接管。

### divider（段落分隔线）

不绑定数据，只渲染 `<el-divider>` 做视觉分组，自动占满整行：

```typescript
const formFields: SchemaFormField[] = [
  { field: 'basicInfo', label: '基本信息', control: 'divider' },
  { field: 'name', label: '名称', required: true },
  { field: 'code', label: '编码', required: true },
  { field: 'financeInfo', label: '财务信息', control: 'divider' },
  { field: 'amount', label: '金额', control: 'slot' },
  { field: 'currency', label: '币种', control: 'select', options: [...] },
]
```

### slot（纯占位控件）

当 `control: 'slot'` 时，组件不渲染任何内置控件，**必须**通过 `#form-{field}` slot 提供内容。默认 colSpan=24（占满整行），适合嵌入自定义组件或复杂布局：

```typescript
{ field: 'details', label: '明细', control: 'slot' },  // colSpan 默认 24
{ field: 'amount', label: '金额', control: 'slot', colSpan: 8 },  // 也可指定宽度
```

---

## 十、VabMoneyInput — 金额输入组件

`library/components/VabMoneyInput/index.vue`，自动注册无需 import。

**特性**：
- v-model 绑定值为**元**（number | null）
- 失焦后自动格式化为千分位（如 1,234.56）
- 聚焦时显示纯数字便于编辑
- 支持精度、前缀符号、最大最小值

### 用法

#### 表单中（通过 slot）

```vue
<vab-schema-form-dialog :fields="formFields" ...>
  <template #form-amount="{ form, disabled }">
    <vab-money-input v-model="form.amount" :disabled="disabled" />
  </template>
</vab-schema-form-dialog>

<script setup>
const formFields = [
  { field: 'amount', label: '金额', control: 'slot', colSpan: 8, required: true },
]
</script>
```

#### 独立使用

```vue
<vab-money-input v-model="form.price" prefix="$" :precision="2" :min="0" :max="999999" />
```

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `number \| string \| null` | `null` | 绑定值（元） |
| `precision` | `number` | `2` | 小数位数 |
| `prefix` | `string` | `'¥'` | 前缀符号 |
| `suffix` | `string` | `''` | 后缀文本 |
| `min` | `number` | — | 最小值 |
| `max` | `number` | — | 最大值 |
| `disabled` | `boolean` | `false` | 禁用 |
| `placeholder` | `string` | `'请输入金额'` | 占位文本 |

---

## 十一、完整实战示例：仓库库位管理

展示远程下拉 + 字段依赖 + 自定义控件的综合场景：

```vue
<!-- vabAutoComponents/LocationEdit.vue -->
<template>
  <vab-schema-form-dialog
    ref="formDialogRef"
    :add-api="doAdd"
    :edit-api="doEdit"
    :fields="formFields"
    title-prefix="库位"
    @saved="emit('fetch-data')"
  />
</template>

<script lang="ts" setup>
import type { SchemaFormField, SchemaFormDialogInstance } from '~/types/schemaForm'
import { doAdd, doEdit } from '/@/api/location'
import { getPage as getWarehousePage } from '/@/api/warehouse'
import { getPage as getRoomPage } from '/@/api/room'
import { getPage as getZonePage } from '/@/api/zone'

defineOptions({ name: 'LocationEdit' })
const emit = defineEmits(['fetch-data'])
const formDialogRef = ref<SchemaFormDialogInstance>()

const formFields: SchemaFormField[] = [
  {
    field: 'warehouseId', label: '仓库', control: 'remote-select',
    required: true, disabledOnEdit: true,
    remoteConfig: {
      fetchFn: getWarehousePage,
      searchField: 'warehouseName',
      extraParams: { enabled: 1 },
      labelRender: (item) => `${item.warehouseCode}-${item.warehouseName}`,
      buildSelectedItem: (form) =>
        form.warehouseId ? { id: form.warehouseId, warehouseCode: form.warehouseCode, warehouseName: form.warehouseName } : null,
    },
    dependency: {
      clearFields: ['roomId', 'zoneId'],
    },
  },
  {
    field: 'roomId', label: '仓间', control: 'remote-select',
    required: true, disabledOnEdit: true,
    remoteConfig: {
      fetchFn: getRoomPage,
      searchField: 'roomName',
      extraParams: { enabled: 1 },
      labelRender: (item) => `${item.roomCode}-${item.roomName}`,
      buildSelectedItem: (form) =>
        form.roomId ? { id: form.roomId, roomCode: form.roomCode, roomName: form.roomName } : null,
    },
    dependency: {
      clearFields: ['zoneId'],
    },
  },
  {
    field: 'zoneId', label: '库区', control: 'remote-select',
    disabledOnEdit: true,
    remoteConfig: {
      fetchFn: getZonePage,
      searchField: 'zoneName',
      extraParams: { enabled: 1 },
      labelRender: (item) => `${item.zoneCode}-${item.zoneName}`,
      buildSelectedItem: (form) =>
        form.zoneId ? { id: form.zoneId, zoneCode: form.zoneCode, zoneName: form.zoneName } : null,
    },
  },
  { field: 'locationCode', label: '库位编码', required: true, disabledOnEdit: true },
  { field: 'locationName', label: '库位名称', required: true, disabledOnEdit: true },
  {
    field: 'locationType', label: '储位类型', control: 'select', required: true,
    options: [
      { label: '普通', value: 'NORMAL' },
      { label: '暂存', value: 'TEMP' },
      { label: '异常', value: 'EXCEPTION' },
    ],
  },
  {
    field: 'enabled', label: '是否启用', control: 'select', required: true, defaultValue: 1,
    options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }],
  },
  { field: 'remark', label: '备注', control: 'textarea', colSpan: 24 },
]

const showEdit = (row?: any) => formDialogRef.value?.showEdit(row)
defineExpose({ showEdit })
</script>
```

---

## 十二、API 文件规范

```typescript
// src/api/carrier.ts
import request from '/@/utils/request'
import { apiModuleMap } from '/@/config/net.config'

export const getPage   = (params: any) => request({ url: '/v1/carrier/page',   method: 'get',  params, module: apiModuleMap.fulfillmentCore })
export const doAdd     = (data: any)   => request({ url: '/v1/carrier/add',    method: 'post', data,   module: apiModuleMap.fulfillmentCore })
export const doEdit    = (data: any)   => request({ url: '/v1/carrier/edit',   method: 'post', data,   module: apiModuleMap.fulfillmentCore })
export const doDelete  = (id: string)  => request({ url: `/v1/carrier/${id}`,  method: 'delete',       module: apiModuleMap.fulfillmentCore })
```

**规则**：
- URL 从版本号 `/v1/` 开始，模块前缀通过 `module` 传
- **禁止**硬编码模块前缀字符串，**必须**用 `apiModuleMap.xxx`
- 命名约定：`getPage` / `getList` 查询，`doAdd` 新增，`doEdit` 编辑，`doDelete` 删除

---

## 十三、反馈 Hooks

以下函数自动导入，无需 import：

| 函数 | 用法 | 说明 |
|------|------|------|
| `$baseMessage(msg, type, 'hey')` | `$baseMessage('删除成功', 'success', 'hey')` | 消息提示 |
| `$baseConfirm(content, title, onOk)` | `$baseConfirm('确定删除吗？', null, async () => {...})` | 确认弹窗 |
| `$baseNotify(message, title, type)` | `$baseNotify('已保存', '提示', 'success')` | 通知 |
| `$baseAlert(content, title)` | `$baseAlert('操作不可撤销', '警告')` | 警告弹窗 |

---

## 十四、决策速查

| 场景 | 用什么 |
|------|--------|
| 标准 CRUD 列表 | `VabSchemaTable` + `VabSchemaFormDialog` |
| 详情侧栏编辑 | `VabSchemaFormDrawer` |
| 页面内嵌表单 | `VabSchemaForm` (纯表单) |
| 字段无内置控件（slider/upload/cascader/tree-select） | 在 fields 中声明字段 + slot 覆盖 |
| 表单分组/段落标题 | `control: 'divider'` |
| 嵌入可编辑子表格或复杂自定义区域 | `control: 'slot'` + `#form-{field}` slot |
| 金额输入 | `<vab-money-input>` 通过 slot 嵌入表单 |
| 状态 / 枚举列展示 | 读 `{field}Label`（后端 `@DictLabel` 注入）；颜色可用前端小 map |
| 状态 / 枚举搜索下拉 | `getDictItemsByKey(DICT_KEY_XXX)` 拉选项，绑定 code |
| 金额列右对齐 + 千分位格式化 | `className: 'is-money'` + `formatter` |
| 多级联动下拉 | `remote-select` + `dependency.clearFields` |
| 编辑时某字段不可改 | `disabledOnEdit: true` |
| 条件显隐字段 | `hidden: (form, isEdit) => boolean` |
| 提交前数据转换 | `beforeSubmit: (data, isEdit) => transformedData` |
| 打开弹窗后额外初始化 | `afterOpen: (form, isEdit) => void` |
| 顶栏切换字号后 EP 组件档位 / 分页与表格对齐 | `density="auto"` + `epComponentSizeFromFontSize`；`VabPagination` 覆盖 `size`；`settings.setCssVar` 同步字体阶梯（见下节） |
| 手写页分页用 `vab-pagination small` | 等价于 `size="small"`；Schema 页用 `:size="paginationSize"` 与 `elSize` 一致即可 |

---

## 十五、VabPagination、EP 字体变量与 Schema 内分页样式（与近期提交对齐）

### `src/utils/epComponentSize.ts`

- **`epComponentSizeFromFontSize(fontSize, thresholdPx?)`**：把 `theme.fontSize`（如 `13px`）映射为 EP 的 **`'small' | 'default'`**，默认阈值 **15**（与 `VabSchemaTable` 的 `autoDensityFontPx` 一致）。

### `src/utils/epFontScale.ts` + `src/store/modules/settings.ts` 的 `setCssVar`

- 仅改 `--el-font-size-base` 时，EP 静态表里的 **`--el-font-size-small` / `--el-font-size-extra-small`** 不会跟顶栏字号联动。
- **`elementPlusFontScaleVarsFromBasePx`** 在 `setCssVar` 里按基准字号比例同步整条字号阶梯（含 `--el-font-line-height-primary`），避免分页等仍像「卡在 12/13px」。

### `library/components/VabPagination/index.vue`

- `defineProps` 在展开 **`paginationProps`** 之后 **显式覆盖 `size`**（`default: undefined`），避免 EP 合法值 **`''`** 参与 `props.size ?? useGlobalSize()` 导致 **`el-pagination--default`** 与表格 **`small`** 不一致。
- **`effectiveSize`**：优先 `props.small`；`props.size` 仅为 **`'small' | 'default' | 'large'`** 时采用；否则 **`epComponentSizeFromFontSize(theme.fontSize)`**。

### `library/components/VabSchemaTable/index.vue` 内分页

- 全局 **`vab.scss`** 曾对 `.el-pagination *` 写死 `font-size: var(--el-font-size-base)`，会盖住 EP **`el-pagination--small`** 的字号。
- 组件内用 **`--el-pagination-font-size` / `--el-pagination-font-size-small`** 绑定主题变量，并按 **`.el-pagination--small`**、**`.el-pagination--large`**、**`:not(.el-pagination--small):not(.el-pagination--large)`** 等分档用 `!important` 压过全局，使 **`size` 档位**与顶栏字号一致。

### 参考示例页

- **承运商 Schema 列表示例**：`src/views/fulfillment/basic/carrier/CarrierSchemaTable.vue`，路由 **`/fulfillment/basic/carrier-schema-table`**（见 `src/router/modules/fulfillment.ts` / `src/utils/routes.ts`）。
