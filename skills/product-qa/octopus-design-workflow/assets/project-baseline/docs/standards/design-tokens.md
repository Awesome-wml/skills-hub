# Design Tokens

> 本文件是规范里**所有色值、间距、字号、圆角的唯一来源**。其他规范文档只引用语义名（如"主色""卡片间距""页面标题字号"），**禁止写死色值或 px 数值**。
> 实际取值由 CSS 变量在 `library/styles/var.scss` 和 Element Plus 主题里定义；本表只声明"语义 → 变量"映射，色值与数值以代码为准。

## 一、色彩

| 语义 | CSS 变量 | 用途 |
|---|---|---|
| 主色 | `--el-color-primary` | `type="primary"` 按钮、链接、主操作 |
| 已访问单据号链接 | `--doc-no-link-visited` | 点过的导航单号（主色与主文字色混合，比未访问链接更深） |
| 成功色 | `--el-color-success` | 启用、已通过、销售中 |
| 警告色 | `--el-color-warning` | 进行中、待审核、停用按钮 |
| 危险色 | `--el-color-danger` | 删除、驳回、异常 |
| 信息色 | `--el-color-info` | 停用 Tag、辅助说明 |

### 文字色

| 语义 | CSS 变量 |
|---|---|
| 主文字 | `--el-text-color-primary` |
| 次文字 | `--el-text-color-regular` |
| 辅助文字 | `--el-text-color-secondary` |
| 占位/禁用 | `--el-text-color-placeholder` / `--el-text-color-disabled` |

### 背景与边框

| 语义 | CSS 变量 |
|---|---|
| 卡片/弹层背景 | `--el-fill-color-blank` |
| 浅色填充 | `--el-fill-color-light` |
| 页面背景 | `--el-bg-color-page` |
| 抽屉主体背景 | `--vab-drawer-body-bg` |
| 表格数量异常行背景 | `--vab-table-warning-row-bg` |
| 边框 | `--el-border-color` |
| 浅边框 | `--el-border-color-light` |

**禁止硬编码颜色**——所有 `background` / `color` / `border-color` 必须用上述变量。

## 二、间距

采用 4 倍数体系。token 定义在 `library/styles/var.scss`：

| 语义 | CSS 变量 |
|---|---|
| 图标内间距、细微偏移 | `--spacing-1` |
| 图标与文字间距 | `--spacing-2` |
| Section header 下边距 | `--spacing-3` |
| 卡片内边距、Section 底部 | `--spacing-4` |
| 表单 gutter、页面内边距 | `--spacing-5` |
| 页面底部、大区块间距 | `--spacing-6` |

**禁止直接写 px**。超出 scale 用 `calc(var(--spacing-x) + Npx)`。

## 三、字号层级

Element Plus 字号变量以 `--el-font-size-base`（正文）为锚点，其他档位均通过 `calc()` 派生：

| 语义 | CSS 变量 | 派生关系 |
|---|---|---|
| 辅助信息（caption） | `--el-font-size-extra-small` | base − 2px |
| 副标题 / 小字 | `--el-font-size-small` | base − 1px |
| 正文 / 表格 / 表单 | `--el-font-size-base` | 锚点 |
| 模块标题 | `--el-font-size-medium` | base + 2px |
| 子页面标题 | `--el-font-size-large` | base + 4px |
| 页面标题 | `--el-font-size-extra-large` | base + 6px |

修改全局基础字号只需调 `var.scss` 中的 `--el-font-size-base`，所有派生档位自动等比缩放。

## 四、圆角

| 语义 | CSS 变量 |
|---|---|
| 按钮 / 输入框 / 卡片 | `--el-border-radius-base` |
| 紧凑场景（小标签等） | `--el-border-radius-small` |
| 圆形头像 / 徽章 | `--el-border-radius-round` / `--el-border-radius-circle`（Element Plus 内置） |

## 五、组件尺寸

不写死 `size="small"` 等字符串，统一跟随用户布局密度（`layoutDensity`）：

- VabSchemaTable 插槽内：用 slot 暴露的 `elSize`
- 其他场景：`getDensityEpSize(settingsStore.theme?.layoutDensity)`

详见 [element-size.mdc](../../cursor-rules/element-size.md)。

## 六、修改流程

1. 改 token 值时只改 `library/styles/var.scss` 或 Element Plus 主题，**不改文档**。
2. 新增语义需要新 token 时，先在 `var.scss` 定义变量，再在本文件登记，最后在其他规范文档中按语义名引用。
3. **禁止**在业务代码、其他规范文档、specs 中写死色值（`#FA541C`、`#fff` 等）或 px 数值（`16px`、`24px` 等）。
