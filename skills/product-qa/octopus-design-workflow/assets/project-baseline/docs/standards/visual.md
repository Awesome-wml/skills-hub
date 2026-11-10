# 基础视觉规范

> 所有色值、字号、圆角的实际取值见 [design-tokens.md](./design-tokens.md)，本文件只描述视觉原则与语义对应关系。
> 工程实现参考：[master-conventions.mdc 十、样式规范](../../cursor-rules/master-conventions.md) / [element-size.mdc](../../cursor-rules/element-size.md)

## 1. 视觉原则

ERP 后台视觉风格以**清晰、稳定、高效、可读、一致**为核心。避免过度装饰化设计，优先保证**信息识别效率和开发复用性**。

## 2. 色彩使用

中性色 + 单一主色方案。语义到 CSS 变量的映射见 [design-tokens.md §一、色彩](./design-tokens.md)。

| 语义场景 | 使用的色彩语义 |
|---|---|
| 主操作（按钮、链接、当前选中） | 主色 |
| 成功 / 启用 / 已通过 | 成功色 |
| 进行中 / 待处理 / 警示 | 警告色 |
| 危险操作 / 失败 / 异常 | 危险色 |
| 停用 / 中性辅助 | 信息色 |

**禁止硬编码颜色值**，统一通过 CSS 变量调用：

```scss
/* ✅ 正确 */
.my-card {
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  color: var(--el-text-color-primary);
}

/* ❌ 禁止：写具体色值 */
.my-card { background: #fff; border: 1px solid #ccc; color: #333; }
```

## 3. 字号层级

| 语义 | 用途 |
|---|---|
| 页面标题 | 页面顶部主标题 |
| 模块标题 | 卡片/Section 标题 |
| 正文 | 表格、表单、详情主信息 |
| 辅助信息 | 副标题、说明、Hint |

字号、行高的具体值见 [design-tokens.md §三、字号层级](./design-tokens.md)。**同一层级字号必须一致**。

## 4. 圆角

| 元素 | 语义 |
|---|---|
| 按钮 / 输入框 | 基础圆角 |
| 卡片 | 卡片圆角 |
| 圆形头像 / 徽章 | 完全圆角 |

## 5. 边框与阴影

- **优先使用边框分层**，不依赖重阴影。
- 输入框、表格、卡片**边框统一使用浅灰色**变量。
- 卡片**不使用重阴影**，需要层级区分时使用浅背景填充。

## 6. 图标

- 图标**仅作为辅助识别**，不替代文字。
- **复杂业务操作优先采用"图标 + 文字"组合**。
- 图标尺寸跟随组件尺寸语义（slot 暴露的 `elSize` 或 `getDensityEpSize`）。

## 7. 一致性

- 同一层级**标题字号一致**。
- 同类**按钮样式一致**。
- 同类**状态颜色一致**（详见 [status-dictionary.md](./status-dictionary.md)）。
- 同一业务对象在不同页面的**命名一致**（详见 [copywriting-normalization.mdc](../../cursor-rules/copywriting-normalization.md) 行业术语表）。
