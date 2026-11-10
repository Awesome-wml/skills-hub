---
description: 项目总规范 - 涵盖基础约定、API、组件、页面、样式、权限等全部规范
alwaysApply: true
---

# 项目总规范

---

## 一、基础规范

### 路径别名（强制）

| 别名 | 指向 |
|------|------|
| `/@/` | `src/` |
| `~/` | 项目根目录 |
| `/@vab/` | `library/` |

### 自动导入（无需手动 import）

`ref` `reactive` `computed` `watch` `onMounted` `nextTick` 等 Vue API、`useRouter` `useRoute`、所有 VueUse 函数、`defineStore`、`$baseMessage` `$baseConfirm` `$baseAlert` `$baseLoading`、Element Plus 组件 —— 均已自动导入，**禁止重复 import**。

### 命名规范

- 字段名统一 **camelCase**（`parentId` 不写 `parent_id`）
- Vue 组件：PascalCase；API 文件：camelCase；样式类名：kebab-case
- 代码风格：单引号、无分号、2 空格缩进、行宽 140

---

## 二、API 规范

```typescript
import request from '/@/utils/request'

export function getPage(params: any) {
  return request({ url: '/fulfillment-core/wms/zone/page', method: 'get', params })
}
export function doEdit(data: any) {
  return request({ url: '/fulfillment-core/wms/zone/update', method: 'post',
    params: { id: data.id },  // id → query string
    data,                      // 其余字段 → body
  })
}
```

| 操作 | 函数名 | 方法 |
|------|--------|------|
| 列表 | `getPage` / `getList` | GET |
| 详情 | `getDetail` | GET |
| 新增 | `doAdd` | POST |
| 编辑 | `doEdit` | POST |
| 删除 | `doDelete` | POST |
| 批量删除 | `batchDelete` | POST |

- **禁止**直接用 `axios` / `fetch`；**禁止**硬编码模块前缀字符串（用 `apiModuleMap.xxx`）
- **接口 / SDK 字段对接强约束**：SDK / OpenAPI / 后端契约里已有的字段，前端必须按原字段名和原语义直接对齐；契约里没有的字段，保持 `undefined` / 空态 / 不展示 / 不提交，**禁止**为了页面展示或提交流程自行造字段、补 `[]` / `{}` / `0` / `''`、补猜测默认值、拼接近似语义字段或写本地假兜底。
- **接口兜底例外只接受用户明确授权**：只有用户明确要求临时兼容，或用户明确说明该过渡口径已与后端约定好时，才允许按指定方式补回退链路；否则默认不联想、不补位。
- **分页列表 / 详情纯展示字段强约束**：凡是字典、枚举、状态、业务类型、启停标记等字段配置类数据，只要页面是在做纯文本展示，且接口 / SDK 已返回对应 `{field}Label` 字段，列表展示、详情展示、cell slot 展示、列表归一化都必须优先使用该 `Label` 值；如果预期的 `Label` 没返回，默认保持空态，不要继续直接展示 code 值，也不要再手写前端中文映射掩盖缺口。
- **`Label` 只用于纯展示文本**：可编辑状态、下拉框、单选框、远程下拉等表单回显仍使用原字段 value/code，禁止把 `{field}Label` 当成编辑态回显值。
- **新功能缺 `Label` 先询问**：后续新增功能里，如果分页列表或详情纯展示场景缺少预期的 `{field}Label`，先保持空态，并询问用户是否要先按 `{field}Label` 命名把展示链路接到页面里；未经明确授权不要自行补位。
- 幂等键：`idempotencyKey: genIdempotencyKey()`（from `/@/utils`），禁止用 `uuid` / `crypto.randomUUID()`

---

## 三、Vue 组件规范

```typescript
<script lang="ts" setup>
// 1. 外部导入（Element Plus 图标、类型、API）
import { Plus } from '@element-plus/icons-vue'
import { getList } from '/@/api/xxx'

// 2. 组件名（必须）
defineOptions({ name: 'XxxManagement' })

// 3. Props / Emits
const emit = defineEmits(['fetch-data'])

// 4. ref / reactive / computed / watch

// 5. 生命周期钩子

// 6. 方法函数

// 7. defineExpose
</script>
```

- `<style lang="scss" scoped>` 必须，类名 kebab-case
- 空状态：`<el-empty class="vab-data-empty" description="暂无数据" />`
- 删除确认：`$baseConfirm('确定删除吗？', null, async () => { ... })`
- 操作反馈：`$baseMessage('删除成功', 'success', 'hey')`
- **枚举选项必须**从 `getDictItemsByKey(DICT_KEY_XXX)` 拉取，禁止硬编码；key 常量定义在 `src/constants/dictKeys.ts`

---

## 四、路由规范

```typescript
import Layout from '/@vab/layouts/index.vue'

export const xxxRoutes = [{
  path: '/xxx',
  component: Layout,
  meta: { title: '模块名', icon: 'Box' },
  beforeEnter: [customGuard],
  children: [{
    path: 'page-name',       // kebab-case，不带前导 /
    name: 'XxxPageName',     // PascalCase，与 defineOptions.name 一致
    component: () => import('/@/views/xxx/index.vue'),
    meta: { title: '页面标题', icon: 'House' },
  }],
}]
```

| Meta 字段 | 说明 |
|-----------|------|
| `hidden: true` | 隐藏菜单项 |
| `noKeepAlive: true` | 不缓存此页面 |
| `guard: ['Admin']` | 角色权限 |

---

## 五、Store 规范

```typescript
// src/store/modules/xxx.ts — 必须 Options 风格，禁止 Setup 风格
export const useXxxStore = defineStore('xxx', {
  state: (): XxxModuleType => ({ list: [], loading: false }),
  getters: { getList: (state) => state.list },
  actions: {
    setList(list: any[]) { this.list = list },
    async fetchList() {
      this.loading = true
      try { const { data } = await getXxxList(); this.list = data }
      finally { this.loading = false }
    },
    resetAll() { this.list = []; this.loading = false },
  },
})
```

命名：Getter `get前缀`，Setter `set前缀`，异步 Action 动词，重置 `resetAll`。

---

## 六、页面开发决策速查

| 要做什么 | 用什么 |
|---------|--------|
| 可筛选数据列表 | `VabSchemaTable` |
| 新增/编辑（字段 ≤ 12） | `VabSchemaFormDialog` |
| 新增/编辑（字段多/含子表格） | `VabSchemaFormDrawer` |
| 查看详情（有独立 URL） | `VabDetailPage` 路由页 |
| 列表行「查看」弹出详情 | `VabDetailPageDrawer`（默认）|
| 详情页支持就地编辑 | `VabDetailPage` + `useDetailPageEdit` |

---

## 七、VabSchemaTable 规范

### 组件使用规则（强制）

1. **必须使用 VabSchemaTable**：列表页面禁止手写 `el-table` + `el-table-column`
2. **禁止修改组件源码**：不得修改 `library/components/VabSchemaTable/` 下任何文件，扩展通过 slot / Props 实现
3. **禁止 :deep 覆盖内部样式**：只能用 `table-class` prop 传自定义类名
4. **列宽强制规范**：普通列用 `minWidth`（自适应），仅状态列/操作列用固定 `width`
5. **禁止 formatter 返回 HTML**：单元格自定义渲染必须用 `#cell-{dataIndex}` slot
6. **操作后刷新**：保存/删除后调 `tableRef.value?.fetchData()`（保持分页），重置筛选调 `tableRef.value?.reload()`
7. **字段配置类纯展示优先取 `Label`**：分页列表和详情里只要后端给了 `{field}Label`，纯文本展示就优先展示 `Label`

### 关键约定

1. 根 div 必须加 `auto-height-container`
2. 必须声明 `defineOptions({ name: 'XxxManagement' })`，与路由 `name` 一致
3. 业务按钮（新增）放 `#search-actions-left`；工具栏独立按钮放 `#toolbar-left`
4. 状态 Tab 切换用 `v-model:status` + `:status-options`，禁止手写 `el-tabs`
5. 紧凑行高：传 `table-class="vab-narrow-table"`（WMS 类页面默认启用）

### 最小示例

```vue
<div class="xxx-container auto-height-container">
  <vab-schema-table ref="tableRef" :columns="columns" :request="runRequest"
    row-key="id" row-selection table-class="vab-narrow-table"
    @selection-change="selectRows = $event"
  >
    <template #search-actions-left="{ elSize }">
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
  <xxx-edit ref="editRef" @fetch-data="tableRef?.fetchData()" />
</div>
```

### Props 速查

| Prop | 默认值 | 说明 |
|------|--------|------|
| `columns` | 必填 | 列定义 |
| `request` | — | `(params) => Promise<{list,total}>` |
| `data` | — | 静态数据模式（跳过请求/分页） |
| `row-key` | `'id'` | 行唯一 key |
| `row-selection` | `false` | 开启多选 |
| `table-class` | `''` | 追加到 el-table 的 class |
| `default-page-size` | `10` | 初始每页条数 |
| `action-column-width` | `160` | 操作列宽（px） |
| `action-column-label` | `'操作'` | 操作列表头 |
| `immediate` | `true` | 挂载后立即请求；手动触发传 `false` |
| `stripe` / `border` | `true` / `false` | 斑马纹/列边框 |
| `v-model:status` | — | 当前 Tab 状态值 |
| `status-options` | — | Tab 选项（含 count 徽标） |
| `status-param-key` | `'status'` | 状态参数名 |
| `show-search-submit-buttons` | `true` | 是否显示内置「查询/重置」按钮 |

### Slot 速查

| Slot | 作用域 | 位置 | 用途 |
|------|--------|------|------|
| `#toolbar-left` | `{ elSize }` | 工具栏左侧独立行 | 批量操作等 |
| `#toolbar-right` | `{ elSize }` | 工具栏右侧 | 页面级控制 |
| `#search-actions-left` | `{ elSize }` | 搜索栏左侧 | 新增等业务按钮 |
| `#cell-{dataIndex}` | `{ row, column, $index, elSize }` | 单元格 | 自定义渲染 |
| `#actions` | `{ row, column, $index, elSize }` | 操作列 | 行操作按钮 |

### SchemaTableColumn 速查

| 属性 | 说明 |
|------|------|
| `dataIndex` | 字段名，同时作为搜索参数 key |
| `title` | 列标题 |
| `minWidth` | 最小宽（**优先使用**，自适应） |
| `width` | 固定宽（仅状态列/操作列） |
| `align` | `'left'` \| `'center'` \| `'right'` |
| `sorter` | 可排序 |
| `showOverflowTooltip` | 溢出 tooltip |
| `hideInTable` | 仅作搜索条件，不显示列 |
| `search.control` | `'input'` \| `'select'` \| `'remote-select'` \| `'daterange'` \| ... |
| `search.options` | `{label,value}[]`，select 用 |
| `search.remoteConfig` | `SchemaTableRemoteSelectConfig`，remote-select 用 |
| `className: 'is-money'` | 金额列右对齐 + 等宽数字 |

---

## 八、VabSchemaFormDialog / VabSchemaFormDrawer 规范

### 组件使用规则（强制）

1. **必须放入 vabAutoComponents/**：自动注册，父页面无需 import
2. **必须声明组件名**：`defineOptions({ name: 'XxxEdit' })`，否则 KeepAlive 失效
3. **禁止硬编码标题**：用 `title-prefix`，自动拼「-新增」/「-编辑」
4. **编码类字段必须锁定**：`disabledOnEdit: true`
5. **通过事件通知父组件**：`@saved="emit('fetch-data')"`，禁止在编辑组件内直接调 tableRef
6. **容器选择**：字段 ≤ 12 且无子表格 → Dialog；字段多或含子表格 → Drawer

### 标准模板

```vue
<template>
  <vab-schema-form-dialog
    ref="formDialogRef"
    :add-api="doAdd"
    :edit-api="doEdit"
    :fields="formFields"
    title-prefix="XXX"
    @saved="emit('fetch-data')"
  />
</template>
<script lang="ts" setup>
import type { SchemaFormDialogInstance, SchemaFormField } from '~/types/schemaForm'
import { doAdd, doEdit } from '/@/api/xxx'
defineOptions({ name: 'XxxEdit' })
const emit = defineEmits(['fetch-data'])
const formDialogRef = ref<SchemaFormDialogInstance>()
const formFields: SchemaFormField[] = [
  { field: 'code', label: '编码', required: true, disabledOnEdit: true },
  { field: 'name', label: '名称', required: true },
  { field: 'enabled', label: '状态', control: 'select', defaultValue: 1,
    options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }] },
  { field: 'remark', label: '备注', control: 'textarea', colSpan: 24 },
]
const showEdit = (row?: any) => formDialogRef.value?.showEdit(row)
defineExpose({ showEdit })
</script>
```

### Props 速查

| Prop | Dialog 默认 | Drawer 专属 | 说明 |
|------|------------|------------|------|
| `fields` | 必填 | — | 字段定义 |
| `title-prefix` | `''` | — | 标题前缀 |
| `dialog-width` | `'900px'` | — | 弹窗宽度 |
| `drawer-size` | — | `'900px'` | 抽屉宽度 |
| `direction` | — | `'rtl'` | 抽屉方向 |
| `default-col-span` | `8`（三列） | — | 字段默认列宽 |
| `label-position` | `'top'` | — | 标签位置 |
| `label-width` | — | — | `label-position="left"` 时配合使用 |
| `add-api` | — | — | 新增接口 |
| `edit-api` | — | — | 编辑接口（不传则复用 addApi） |
| `before-submit` | — | — | `(data, isEdit) => data`，提交前转换 |
| `after-open` | — | — | `(form, isEdit) => void`，打开后回调 |
| `add-success-message` | `'新增成功'` | — | — |
| `edit-success-message` | `'编辑成功'` | — | — |

### 高级回调

```typescript
// afterOpen：编辑时加载子明细
const handleAfterOpen = async (form: any, isEdit: boolean) => {
  details.value = isEdit ? (await getDetail(form.id)).data.details : []
}

// 自定义 editApi：只提交允许修改的字段
const handleEditSubmit = (data: any) => {
  const { id, name, remark, enabled } = data
  return doEdit({ id, name, remark, enabled })
}
```

### Field 控件速查

| `control` | 渲染 | 必配属性 |
|-----------|------|---------|
| `'input'`（默认） | `el-input` | — |
| `'textarea'` | `el-input` textarea | `rows` |
| `'select'` | `el-select` | `options: [{label,value}]` |
| `'remote-select'` | 远程搜索下拉 | `remoteConfig` |
| `'radio'` | `el-radio-group` | `options` |
| `'checkbox'` | `el-checkbox-group` | `options` |
| `'switch'` | `el-switch` | `activeValue` / `inactiveValue` |
| `'date'` | `el-date-picker type="date"` | — |
| `'datetime'` | `el-date-picker type="datetime"` | — |
| `'divider'` | `el-divider`（分组标题） | `colSpan: 24` |
| `'slot'` | 自定义插槽 | `#form-{field}` slot |

### SchemaFormField 通用属性速查

| 属性 | 类型 | 说明 |
|------|------|------|
| `field` | `string` | 字段名（camelCase） |
| `label` | `string` | 标签文字 |
| `required` | `boolean` | 必填，自动生成校验规则 |
| `rules` | `FormRule[]` | 自定义校验规则 |
| `colSpan` | `number` | 列宽（1-24，默认 `defaultColSpan`） |
| `disabledOnEdit` | `boolean` | 编辑时禁用 |
| `defaultValue` | `any` | 新增时默认值 |
| `placeholder` | `string` | 输入提示 |
| `dependency` | `{ clearFields?, onChange? }` | 字段级联配置 |
| `remoteConfig` | `SchemaFormRemoteSelectConfig` | remote-select 专用 |

---

## 九、remote-select 规范

### 回显机制选择

| 情况 | 方案 |
|------|------|
| 列表接口 row 包含 code + name | `buildSelectedItem: (form) => form.id ? { id, code, name } : null` |
| 列表接口 row 只有 id | `initExtraParamsFn: (form) => form.id ? { id: form.id } : {}` |
| 选中项在前 50 条内 | 两者可省略 |
| 级联下拉（仓间/库区） | `initExtraParamsFn`（上级列表不含子级字段） |

### 预设工厂函数（`src/utils/remoteSelectPresets.ts`）

**同一实体在 2 个以上页面引用时用工厂，否则直接内联 remoteConfig。**

```typescript
import { createWarehouseRemoteSelectConfig, createCompanyRemoteSelectConfig } from '/@/utils/remoteSelectPresets'

// 基础用法（搜索栏）
remoteConfig: createWarehouseRemoteSelectConfig()

// 带回显（编辑弹窗，列表接口返回 code+name）
remoteConfig: createWarehouseRemoteSelectConfig({
  buildSelectedItem: (form: any) =>
    form?.warehouseId ? { id: form.warehouseId, warehouseCode: form.warehouseCode, warehouseName: form.warehouseName } : null,
})

// 附加过滤参数（不影响默认 enabled:1）
remoteConfig: createWarehouseRemoteSelectConfig({ extraParams: { bizType: 'INBOUND' } })
```

**新增预设工厂**（某实体在 3+ 处引用时）：

```typescript
// src/utils/remoteSelectPresets.ts
export function createRoomRemoteSelectConfig(overrides: Partial<SchemaFormRemoteSelectConfig> = {}) {
  const { extraParams, ...rest } = overrides
  return {
    fetchFn: getRoomPage,
    searchField: 'roomName',
    extraParams: mergeExtraParams(extraParams),  // 自动合并 enabled:1
    pageSize: 50,
    labelRender: (item: any) => `${item.roomCode}-${item.roomName}`,
    valueField: 'id',
    ...rest,
  }
}
// 需同时提供 SchemaTableRemoteSelectConfig 和 SchemaFormRemoteSelectConfig 两个重载
```

### 字段级联（dependency）

```typescript
// clearFields：上游改变时清空下游
{ field: 'warehouseId', dependency: { clearFields: ['roomId', 'zoneId'] }, remoteConfig: ... },

// onChange：选中时回填关联字段
{
  field: 'roomId',
  dependency: {
    clearFields: ['zoneId'],
    onChange: (value: any, form: any, optionList: any[] = []) => {
      const room = optionList.find((r) => r.id === value)
      if (room) form.warehouseId = room.warehouseId
    },
  },
  remoteConfig: { ... },
},

// 三级级联：仓库 → 仓间 → 库区
{ field: 'warehouseId', dependency: { clearFields: ['roomId', 'zoneId'] }, ... },
{ field: 'roomId', dependency: { clearFields: ['zoneId'], onChange: (...) => { ... } }, ... },
{ field: 'zoneId', ... },
```

> `onChange(value, form, optionList)` 三参数：当前选中值 / 整个表单对象（可直接赋值）/ 已加载的选项列表  
> **禁止**用 `watch` 手动清空下游字段，必须用 `dependency.clearFields` 声明式配置

---

## 十、样式规范

### 间距 Token（禁止直接写 px）

| Token | 值 | 用途 |
|-------|----|------|
| `--spacing-1` | 4px | 图标内间距 |
| `--spacing-2` | 8px | 图标文字间距 |
| `--spacing-3` | 12px | Section header 下边距 |
| `--spacing-4` | 16px | 卡片内边距 |
| `--spacing-5` | 20px | 表单 gutter、页面内边距 |
| `--spacing-6` | 24px | 大区块间距 |

### Element Plus 设计变量（禁止硬编码颜色）

```scss
/* ✅ 正确 */
.my-card {
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  color: var(--el-text-color-primary);
  padding: var(--spacing-4);
}
/* ❌ 禁止 */
.my-card { background: #fff; border: 1px solid #dcdfe6; color: #303133; }
```

| 变量分类 | 常用变量 |
|---------|---------|
| 文字色 | `--el-text-color-primary` / `regular` / `secondary` / `placeholder` / `disabled` |
| 背景填充 | `--el-fill-color-blank` / `light` / `--el-bg-color` / `--el-bg-color-page` |
| 边框 | `--el-border-color` / `border-color-light` / `--el-border-radius-base` |
| 主题色 | `--el-color-primary` / `success` / `warning` / `danger` / `--el-color-primary-light-9` |

### 组件尺寸

- `VabSchemaTable` slot 内直接用 slot 暴露的 `elSize`，**禁止**硬编码 `size="small"`
- 其他场景：`getDensityEpSize(settingsStore.theme?.layoutDensity)`

---

## 十一、权限控制（v-permissions）

`v-permissions` 不满足条件时**直接从 DOM 移除元素**（非 hidden）。Admin 用户自动跳过所有检查。

```vue
<!-- 按 permission code（业务页面首选）-->
<el-button v-permissions="{ permission: ['product:create'] }" type="primary">新增</el-button>
<el-button v-permissions="{ permission: ['product:update'] }" text type="primary">编辑</el-button>
<el-button v-permissions="{ permission: ['product:delete'] }" text type="danger">删除</el-button>

<!-- 按角色 -->
<el-button v-permissions="['Admin']">管理员操作</el-button>

<!-- 取反（没有此角色才显示）-->
<el-button v-permissions="{ role: ['Admin'], mode: 'except' }">非管理员可见</el-button>

<!-- 必须同时满足多个 permission -->
<el-button v-permissions="{ permission: ['product:update', 'product:audit'], mode: 'allOf' }">...</el-button>
```

| `mode` | 含义 |
|--------|------|
| `'oneOf'`（默认） | 满足其中一个即可 |
| `'allOf'` | 必须全部满足 |
| `'except'` | 取反：不满足时显示 |

permission code 格式：`{模块}:{操作}`，如 `product:create`、`menu:delete`。

**禁止**：`v-if="userStore.role === 'Admin'"` 或 `computed(() => aclStore.getPermission.includes('...'))`

---

## 十二、数据完整性

- **前端计算值不入库**：合计/金额等前端汇总结果不可直接信任，后端必须重新计算
- **表单初始值由后端下发**：税率/运费/折扣等策略值必须由 `GET /xxx/form-preferences` 统一返回，禁止前端硬编码
- 后端表单偏好接口须声明各字段 `required`，前端动态构建校验规则

---

## 十三、Git 提交

commit message **必须使用中文**：`git commit -m "修复仓间下拉编辑回显问题"`
