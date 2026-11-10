# 列表页产品规范

> 工程实现参考：[page-list.mdc](../../cursor-rules/page-list.md) / [master-conventions.mdc 七、VabSchemaTable 规范](../../cursor-rules/master-conventions.md)
> Tag / 操作列 / Toolbar 的当前整改细则：[docs/superpowers/specs/2026-04-13-table-ui-design.md](../superpowers/specs/2026-04-13-table-ui-design.md)

## 1. 标准结构

列表页由以下区块组成，页面重点是**高效检索、快速对比、批量处理**：

- 页面标题区
- 查询筛选区
- 操作按钮区
- 表格区
- 分页区

## 2. 查询区

- 默认展示 **3~6 个高频筛选项**，超出使用"展开/收起"。
- 查询按钮与重置按钮**固定在查询区右侧或末位**。
- 支持按 **Enter 键**触发查询。
- 查询条件变更后**不自动请求**，统一点击"查询"执行。
- 优先展示的查询字段建议包括：单据编号、业务状态、日期范围、关键对象名称、创建人/负责人、组织/部门维度。

## 3. 操作区

- **主操作最多 1 个**（新增/新建/创建），使用 `type="primary"`。
- 次操作建议不超过 3 个（导入/导出/批量处理）。
- 辅助操作（刷新/列设置/字段显隐）放在右侧（`#toolbar-right`）。
- **危险操作不作为默认主按钮展示**。
- 区域分工：
  - `#toolbar-left`：主功能区（创建 + 批量操作），用 `el-divider` 竖线分组
  - `#toolbar-right`：视图辅助工具（列设置、导出）
  - `#search-actions-left`：**不放功能按钮**，仅用于搜索相关辅助

## 4. 表格区与行操作

- 表格**必须支持** loading、无数据、异常三种状态（VabSchemaTable 已内置）。
- 批量选择**仅在存在批量业务场景时启用**（`row-selection` prop）。
- **行内直接展示的操作不超过 2 个**，超出收纳至"更多"下拉。
- 优先级：**查看 > 编辑 > 删除**。
- **删除永远进"更多"下拉，不直出**。
- 删除、作废等危险操作需要与普通操作**视觉区分**（`type="danger"`）。
- 所有删除动作**必须二次确认**（`$baseConfirm` / `ElMessageBox.confirm`）。

## 5. 分页

| 项目 | 规范 |
|---|---|
| 分页位置 | 表格底部居中 |
| 默认每页条数 | 20 |
| 可选条数 | 10 / 20 / 50 / 100 |
| 总数显示 | 必须显示 |
| 跳页能力 | 支持快速跳转 |

> 注：VabSchemaTable 的 `default-page-size` 默认值与本规范不一致时，列表页应显式传 `:default-page-size="20"`。

## 6. 列表页状态文案

状态文案统一使用 [copy.md](./copy.md) 的标准文案：

| 状态 | 处理方式 |
|---|---|
| 加载中 | 表格区域显示加载态，不阻断页面其他操作 |
| 无数据 | 显示"暂无数据" |
| 查询无结果 | 显示"未查询到符合条件的数据" |
| 异常状态 | 显示错误提示并提供"重试"入口 |
| 无权限 | 明确提示"暂无权限查看该数据" |

## 7. 反模式

### 7.1 独立 Toggle 列切换启用/停用 ❌

```vue
<!-- 错误 ✗ —— 独立一列 el-switch，无确认、易误触 -->
<el-table-column label="状态" width="80">
  <template #default="{ row }">
    <el-switch v-model="row.enabled" @change="handleToggle(row)" />
  </template>
</el-table-column>
```

**问题**：无二次确认导致误触；占一整列宽度只为一个状态；和操作列"更多→停用"入口冲突；和 toolbar 批量停用语义重叠。

**正确做法**：状态列只读展示（用 L1 彩色 Tag），切换动作走操作列按钮 + 二次确认。详见 [docs/superpowers/specs/2026-04-13-table-ui-design.md §2.4](../superpowers/specs/2026-04-13-table-ui-design.md)。

### 7.2 状态切换用两个互斥 disabled 按钮 ❌

```vue
<!-- 错误 ✗ -->
<el-button :disabled="row.status !== 'enabled'" type="danger">禁用</el-button>
<el-button :disabled="row.status !== 'disabled'" type="primary">开启</el-button>

<!-- 正确 ✓ —— 一个按钮，动态换 label 和 type -->
<el-button :type="row.enabled ? 'warning' : 'primary'" @click="handleToggle(row)">
  {{ row.enabled ? '停用' : '启用' }}
</el-button>
```

### 7.3 功能按钮放在搜索区 ❌

```vue
<!-- 错误 ✗ -->
<template #search-actions-left="{ elSize }">
  <el-button type="primary">新增</el-button>
</template>
```

`#search-actions-left` 只用于搜索相关辅助，业务按钮必须放 `#toolbar-left`。
