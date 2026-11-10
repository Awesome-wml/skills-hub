---
description: 编辑弹窗/抽屉（VabSchemaFormDialog / VabSchemaFormDrawer）开发规范
globs: src/views/**/vabAutoComponents/**Edit*.vue
alwaysApply: false
---

# 编辑规范（VabSchemaFormDialog / VabSchemaFormDrawer）

同一套模式，两种容器：
- `VabSchemaFormDialog`：弹窗，默认首选
- `VabSchemaFormDrawer`：抽屉，字段较多或含子表格时使用

## 布局结构

```
Dialog / Drawer
├─ 标题区（自动拼接「-新增」/「-编辑」）
├─ 表单主体（VabSchemaForm，声明式字段配置）
│   ├─ 标准字段（网格排布，默认一行三列）
│   └─ 扩展区域（上传、富文本、自定义控件）
└─ 底部操作区（取消 + 保存）
```

## 强制规则

- 编辑组件放 `vabAutoComponents/` 目录下，自动注册无需 import
- 必须声明 `defineOptions({ name: 'XxxEdit' })`
- 标题用 `titlePrefix`，自动区分新建/编辑；不可硬编码标题
- 编码类字段必须设 `disabledOnEdit: true`
- 字段默认 `defaultColSpan: 8`（一行三列）；复杂字段设 `colSpan: 24` 独占一行
- 分组标题用 `control: 'divider'`，不绑数据，仅视觉分隔
- 自定义控件（上传/树形下拉/金额等）用 `control: 'slot'` + `#form-{field}` slot
- 保存成功通过 `@saved` 事件通知父组件，父组件调 `fetchData()` 刷新列表

## 控件类型速查

| `control` | 渲染为 | 备注 |
|-----------|--------|------|
| `'input'`（默认） | `<el-input>` | 自动 trim |
| `'textarea'` | `<el-input type="textarea">` | 默认 3 行 |
| `'select'` | `<el-select>` | 需配 `options` |
| `'remote-select'` | `<el-select remote>` | 需配 `remoteConfig` |
| `'date'` / `'datetime'` | `<el-date-picker>` | 标准日期/时间 |
| `'switch'` | `<el-switch>` | 支持 `activeValue`/`inactiveValue` |
| `'radio'` / `'checkbox'` | radio/checkbox group | 需配 `options` |
| `'divider'` | `<el-divider>` | 分组标题，占满整行，不绑数据 |
| `'slot'` | 自定义 | 必须配 `#form-{field}` slot |

## 标准模板

```vue
<!-- vabAutoComponents/XxxEdit.vue -->
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
import type { SchemaFormField, SchemaFormDialogInstance } from '~/types/schemaForm'
import { doAdd, doEdit } from '/@/api/xxx'

defineOptions({ name: 'XxxEdit' })
const emit = defineEmits(['fetch-data'])
const formDialogRef = ref<SchemaFormDialogInstance>()

const formFields: SchemaFormField[] = [
  { field: 'code', label: '编码', required: true, disabledOnEdit: true },
  { field: 'name', label: '名称', required: true },
  {
    field: 'enabled', label: '状态', control: 'select', required: true, defaultValue: 1,
    options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }],
  },
  { field: 'remark', label: '备注', control: 'textarea', colSpan: 24 },
]

const showEdit = (row?: any) => formDialogRef.value?.showEdit(row)
defineExpose({ showEdit })
</script>
```

抽屉版本只需将 `vab-schema-form-dialog` 替换为 `vab-schema-form-drawer`，`dialogWidth` 替换为 `drawerSize`，其余完全一致。
