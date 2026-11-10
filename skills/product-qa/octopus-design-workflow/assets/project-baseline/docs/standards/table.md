# 表格产品规范

> 工程实现参考：[page-list.mdc](../../cursor-rules/page-list.md) / [master-conventions.mdc 七、VabSchemaTable 规范](../../cursor-rules/master-conventions.md)
> Tag / 操作列 / 启用停用细则：[docs/superpowers/specs/2026-04-13-table-ui-design.md](../superpowers/specs/2026-04-13-table-ui-design.md)

## 1. 基础样式

样式规范走 design system，**不写死像素值**：

- 表头高度、行高跟随 `layoutDensity`（紧凑/默认/宽松），紧凑模式可加 `table-class="vab-narrow-table"`。
- 表头与单元格字号统一为正文字号（详见 [design-tokens.md §三、字号层级](./design-tokens.md)）。
- 表头背景使用浅灰色填充变量；边框使用浅色变量；行背景白色与浅灰串行（斑马纹由 Element Plus `stripe` 控制）。

组件尺寸控制详见 [element-size.mdc](../../cursor-rules/element-size.md)。

## 2. 对齐

| 字段类型 | 对齐 |
|---|---|
| 普通列（未显式声明 `align`） | 默认居中 |
| 数字、金额、百分比 | 右对齐（`className: 'is-money'` 自动右对齐 + 等宽数字） |
| 状态 | 居中 |
| 操作列 | 默认左对齐 |

- 共享 `VabSchemaTable` 当前默认对齐口径为：普通列居中、操作列表头居中、操作按钮左对齐。
- 商品名称、地址、备注、规格说明等长文本列若需要更利于扫读的左对齐，页面应显式传 `align: 'left'`。
- 操作列默认左对齐，尤其适用于按钮数量会动态显隐的列表，能保持每行按钮起点一致。
- 仅当页面是单按钮或强依赖旧视觉居中时，才显式传 `action-column-align="center"` 覆盖默认值。

## 3. 列宽与超长内容

- **列宽根据字段内容设置，不平均分配**。
- **普通列用 `minWidth`**（自适应）；仅状态列、操作列用固定 `width`。
- 编号、状态、时间、金额等字段采用**固定合理宽度**。
- 长文本字段**优先省略显示**（`showOverflowTooltip: true`），悬停 Tooltip 展示完整信息。
- **列表页不建议大面积多行换行**展示长文本。

### 操作列宽度矩阵

操作列固定宽度按按钮数量分档（具体值见 [docs/superpowers/specs/2026-04-13-table-ui-design.md §2.6](../superpowers/specs/2026-04-13-table-ui-design.md)）：

- 1 个直出按钮：窄档
- 2 个直出按钮：中档
- 2 个直出 + "更多" 下拉：宽档

**不允许**随意填写历史值（70 / 130 / 180 / 220 / 260 等全部废除）。

## 4. 数据格式

见 [data-format.md](./data-format.md)。

## 5. 排序、筛选、冻结列

- **时间类、金额类、数量类字段允许排序**（`sorter: true`）。
- 文本类字段**默认不支持排序**。
- 列表筛选**优先放在顶部查询区**，不用列头筛选。
- 列数较多时**建议冻结首列和操作列**，冻结列数量不宜过多。

## 6. 表格状态

| 状态 | 处理 | 文案 |
|---|---|---|
| Loading | 区域加载动画，不闪屏 | — |
| Empty | 占位状态 | "暂无数据" |
| Error | 错误提示 + 重试 | "暂时无法加载，请稍后重试" |
| No Permission | 权限提示 | "暂无权限查看该数据" |

## 7. 合计行

涉及**财务、库存、订单金额**等业务时：

- 合计行**固定在表格底部**。
- 合计值**与对应列对齐**。
- 合计值由**后端计算**下发，前端不做累加（详见 [data-integrity.mdc](../../cursor-rules/data-integrity.md)）。

## 8. Tag 三层分级

详细写法见 [docs/superpowers/specs/2026-04-13-table-ui-design.md §1](../superpowers/specs/2026-04-13-table-ui-design.md)。

| 层级 | 名称 | 使用场景 | 写法 |
|---|---|---|---|
| L1 | 状态徽标 | 核心业务状态（销售中/已停用/待审核/已通过/已拒绝） | `<el-tag type="xxx">` |
| L2 | 描述标签 | 描述性分类（销售渠道/商品类目/商品类型） | `<el-tag plain>` 或纯文字 |
| L3 | 辅助角标 | 极低优先级内联辅助（版本号/数量徽章） | 纯文字 |

**原则：同一行最多出现 1 个 L1 彩色 tag。**

### Tag 颜色语义映射

| 业务含义 | type | 颜色 |
|---|---|---|
| 正常 / 销售中 / 已通过 / 启用 | `success` | 绿 |
| 待处理 / 待审核 / 进行中 | `warning` | 橙 |
| 停用 / 禁用 / 关闭 / 已取消 | `info` | 灰 |
| 异常 / 已拒绝 / 已冻结 | `danger` | 红 |

> **停用/禁用用 `info`（灰）而非 `danger`（红）**：停用是中性的非激活状态，红色会造成"危险操作"的误读。

### Tag（状态） vs 按钮（操作）的颜色

**刻意区分**：

| 语义 | Tag（当前是什么） | 按钮（点了会做什么） |
|---|---|---|
| 启用 | `type="success"`（成功色） | `type="primary"`（主色） |
| 停用 | `type="info"`（信息色） | `type="warning"`（警告色） |

按钮是操作入口——启用/停用对某行**施加动作**是主操作，用主色；Tag 展示**当前状态**是信息展示，用状态色。色值映射见 [design-tokens.md](./design-tokens.md)。

## 9. 单据号与明文电话

- **导航单号**（单击打开详情）：用 `DocNoLink`，不要用 `el-button`。文字必须可划选；划选后松开不打开详情。点过的单号用 `--doc-no-link-visited`，不要依赖浏览器原生 `:visited`。
- **非导航单号 / 未脱敏电话**：走 `BizNo`。单击本身复制完整串；悬停当前这一段出现浅底与复制图标，同一行其它值不跟着亮；复制成功后图标切成成功色对勾。`VabSchemaTable` 在没有单元格插槽时，列标题以「单号」结尾或为电话/手机号/联系方式类标签会默认渲染 BizNo；可用 `copyable: false` 退出或 `copyable: true` 强制开启。展示含 `*` 的脱敏号只展示、不复制。
- SKU、商品编码、会员号、手机品牌/型号不是这套交互。
