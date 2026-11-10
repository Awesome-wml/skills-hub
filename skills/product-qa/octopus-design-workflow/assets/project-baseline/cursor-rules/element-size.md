---
description: Element Plus 组件尺寸与间距规范
globs: "**/*.vue"
alwaysApply: false
---

# Element Plus 组件样式规范

---

## 一、组件尺寸

**禁止硬编码 `size="small"` / `size="default"` / `size="large"`。**
尺寸由用户选择的布局密度（`layoutDensity`）统一控制。

### VabSchemaTable 插槽内

slot props 已暴露 `elSize`，直接用，不要自己计算：

```vue
<template #toolbar-left="{ elSize }">
  <el-button :icon="Plus" :size="elSize" type="primary">新增</el-button>
</template>
<template #cell-status="{ row, elSize }">
  <el-tag :size="elSize" :type="row.enabled ? 'success' : 'danger'">启用</el-tag>
</template>
<template #actions="{ row, elSize }">
  <el-button :size="elSize" text type="primary" @click="handleEdit(row)">编辑</el-button>
</template>
```

### 其他场景（独立按钮、详情页等）

```typescript
import { getDensityEpSize } from '/@/utils/layoutDensity'
import { useSettingsStore } from '/@/store/modules/settings'

const settingsStore = useSettingsStore()
const elSize = computed(() => {
  const epSize = getDensityEpSize(settingsStore.theme?.layoutDensity)
  return epSize === 'large' ? 'default' : epSize  // EP 部分组件不支持 large
})
```

### 密度与 size 对照

| 用户选择 | `layoutDensity` | 实际 `elSize` |
|---------|----------------|--------------|
| 紧凑 | `'compact'` | `'small'` |
| 正常（默认） | `'default'` | `'default'` |
| 宽松 | `'comfortable'` | `'default'`（large 降级） |

---

## 二、间距系统

所有 `margin` / `padding` / `gap` 必须使用以下 CSS 变量，**禁止直接写 px 数值**。

变量定义在 `library/styles/var.scss`，全局可用。

| Token | 值 | 典型用途 |
|-------|----|---------|
| `--spacing-1` | 4px | 图标内间距、细微偏移 |
| `--spacing-2` | 8px | 图标与文字间距、副标题上边距 |
| `--spacing-3` | 12px | Section header 下边距、页签上边距 |
| `--spacing-4` | 16px | 卡片内边距、Section 底部间距、按钮区左边距 |
| `--spacing-5` | 20px | 表单栅格 gutter、页面内边距（= `--el-padding`） |
| `--spacing-6` | 24px | 页面底部 padding、大区块间距 |

```scss
/* ✅ 正确 */
.my-section {
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-3) var(--spacing-4);
  gap: var(--spacing-2);
}

/* ❌ 禁止 */
.my-section {
  margin-bottom: 16px;
  padding: 12px 16px;
  gap: 8px;
}
```

### 超出 scale 的场景

如果需要的值不在 scale 内（如 6px、10px），优先用最近的 token 调整设计，确实需要时可用 `calc()`：

```scss
/* 允许：在 scale 基础上微调 */
margin-bottom: calc(var(--spacing-4) + 2px);
```
