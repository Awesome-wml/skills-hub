---
description: 列表页（VabSchemaTable）开发规范
globs: src/views/**/*.vue
alwaysApply: false
---

# 列表页规范（VabSchemaTable）

## 布局结构

```
VabSchemaTable
├─ 顶部容器
│   ├─ 查询区（关键字 / 状态 / 时间范围等筛选条件）
│   └─ 操作区（左：[状态下拉 | 业务动作]  右：查询/重置/折叠）
└─ 结果容器
    ├─ 批量提示条（勾选后出现）
    ├─ 结果列表
    └─ 分页区
```

## 强制规则

- 根 div 必须加 `auto-height-container`，使表格撑满屏幕剩余高度
- 必须声明 `defineOptions({ name: 'XxxManagement' })`
- 列宽**优先用 `minWidth`**，只有状态列、操作列才用 `width`
- 分页列表里凡是字段配置类数据（字典、枚举、状态、业务类型、启停标记等），只要接口 / SDK 返回了对应 `{field}Label` 字段，纯文本展示必须优先使用 `Label` 值，禁止直接展示 code 值
- 业务按钮（新增/导出）放 `#toolbar-left`；查询/重置/折叠在右侧，**不可混淆**
- 非文本渲染（状态 tag、链接等）用 `#cell-{dataIndex}` slot，禁止 `formatter` 返回 HTML
- 操作列用 `#actions` slot（默认宽 160px）
- 金额列：`className: 'is-money'` + `formatter`，全局 CSS 已内置右对齐 + 等宽数字
- 保存/删除后调 `tableRef.value?.fetchData()`（保持分页）；重置筛选用 `reload()`
- **状态维度筛选**（全部/进行中/已完成等）用 `statusOptions` + `v-model:status`，**禁止**在页面上手写 `el-tabs` 或 `el-dropdown`

## 字段配置类展示规则

- 适用位置包括：`columns.formatter`、`#cell-{dataIndex}` slot、列表请求后的数据归一化层。
- 已有 `{field}Label` 时，不要再手写 `switch`、本地字典映射或中文常量去覆盖它。
- 如果预期的 `{field}Label` 当前没返回，默认保持空态，不要自行回退到本地字典、原 code 值或别的近义字段；只有用户明确要求临时兼容，或用户明确说明已与后端约定好该过渡口径时，才允许按指定方式处理。
- 这条规则只用于纯展示文本；搜索区下拉、编辑弹窗/抽屉里的 `select`/`radio`/远程下拉回显仍绑定原字段 value/code，不用 `{field}Label`。
- 后续新增功能里，如果列表纯展示场景缺少预期的 `{field}Label`，先保持空态，并询问用户是否要先按 `{field}Label` 命名把展示链路接到页面里。

```ts
{
  dataIndex: 'status',
  title: '状态',
  formatter: (row: any) => row.statusLabel ?? '',
}
```

## 插槽速查

| Slot | 作用域 | 用途 |
|------|--------|------|
| `#toolbar-left` | `{ elSize }` | 新增、批量操作等业务按钮 |
| `#toolbar-right` | `{ elSize }` | 页面控制（非业务） |
| `#cell-{dataIndex}` | `{ row, column, $index, elSize }` | 自定义单元格渲染 |
| `#actions` | `{ row, column, $index, elSize }` | 行操作按钮 |

## 标准模板

```vue
<template>
  <div class="xxx-container auto-height-container">
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

    <xxx-edit ref="editRef" @fetch-data="tableRef?.fetchData()" />
  </div>
</template>

<script lang="ts" setup>
import { Plus } from '@element-plus/icons-vue'
import { doDelete, getPage } from '/@/api/xxx'
import type { SchemaTableColumn, SchemaTableInstance } from '~/types/schemaTable'

defineOptions({ name: 'XxxManagement' })

const editRef = ref<any>(null)
const tableRef = ref<SchemaTableInstance | null>(null)
const selectRows = ref<any[]>([])

const columns: SchemaTableColumn[] = [
  { dataIndex: 'name', title: '名称', minWidth: 120, search: { control: 'input' } },
  {
    dataIndex: 'enabled', title: '状态', width: 100, align: 'center',
    search: { control: 'select', options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }] },
  },
  { dataIndex: 'createdAt', title: '创建时间', minWidth: 160, sorter: true },
]

const runRequest = async (params: Record<string, any>) => {
  const res = await getPage(params)
  return { list: res.data.list, total: res.data.total }
}

const handleAdd = () => editRef.value.showEdit()
const handleEdit = (row: any) => editRef.value.showEdit(row)
const handleDelete = (row: any) => {
  $baseConfirm('确定删除吗？', null, async () => {
    await doDelete(row.id)
    $baseMessage('删除成功', 'success', 'hey')
    tableRef.value?.fetchData()
  })
}
</script>
```

## 状态筛选模板

当列表需要按状态维度（全部/售卖中/待审核等）筛选时，用 `statusOptions` + `v-model:status`：

```vue
<vab-schema-table
  ref="tableRef"
  v-model:status="activeStatus"
  :columns="columns"
  :request="runRequest"
  :status-options="statusOptions"
>
  <template #toolbar-left="{ elSize }">
    <el-button :icon="Plus" :size="elSize" type="primary" @click="handleAdd">新增</el-button>
  </template>
</vab-schema-table>

<script lang="ts" setup>
import type { SchemaTableStatusOption } from '~/types/schemaTable'

const activeStatus = ref('ALL')
const statusOptions = computed<SchemaTableStatusOption[]>(() => [
  { value: 'ALL', label: '全部', count: 128 },
  { value: 'ON_SALE', label: '售卖中', count: 96 },
  { value: 'PENDING', label: '待审核', count: 12 },
])
</script>
```

组件自动在工具栏左侧渲染下拉，与 `#toolbar-left` 之间用竖线分隔。第一项视为"全部"，选中时不向 request 注入参数。
