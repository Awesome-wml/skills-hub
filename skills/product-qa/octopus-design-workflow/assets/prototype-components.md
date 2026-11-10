> 历史原型适配：新 HTML 原型优先使用 [工程真实组件运行入口](../../prototype-runtime/README.md)。本文的两个 Octo 组合只保留旧版兼容，不继续扩为独立组件库。

# 原型组件契约：组合筛选与表格操作组

状态：订单首批原型组合的实现规范；本地未发布，未替换 Admin 组件。全系统范围见 [跨模块组件目录](component-catalog.md)。本页操作收纳策略只验证订单，不作为所有模块默认行为。

## 来源与层级

- 结构：设计师 `XKraFkdmnv4ZTSQLiIbjGO`，订单收起 `12:564`，时间组合节点 `87:8657`～`87:8662`；展开 `4:12` 的买家组合。
- 当前样式：Octopus Dev 零售订单页，2026-10-28 实际读取时间/买家组合与行操作；运行 Token 快照记录在 Skill 的 `assets/runtime-baseline.json`。
- 操作语义：`retailOrder/list/index.vue` 的 `#actions`、`getPrimaryRowActions`、`getMoreRowActions`；当前原型误用了 link，并单独给 dropdown 加间距，不能成为规范。
- 基础层直接复用 Element Plus 的 Button / Select / Input / DatePicker / Checkbox / Tag。组合层负责连接和排布；页面传入业务值、选项、已决定可见性的动作与事件。

## PATTERN-001/query-group

实现：Skill `assets/prototype-ui/components.js` 的 `OctoQueryGroup`；样式只在同目录 `components.css`。

- 输入：`dimension`、`options`（已确认 Label 列表）、`prefixLabel`；`update:dimension` 只转交选择值。默认 slot 放输入或范围组件。
- 默认密度：整体 32px，使用运行控件高度 Token。前缀四字文本、12px 箭头、8px 内边距和间距构成紧凑宽度，当前样本为 94px。
- 整组只有一圈 1px 外框及外侧圆角；前缀与内容之间只有一条分隔线，内部连接处无圆角。内部控件不能再绘制自己的整圈边框和阴影。
- Hover / focus：统一外框反馈，聚焦使用主色；输入、日期图标与前缀文字垂直居中。弹出下拉或日历仍使用真实组件。
- 页面不得覆盖连接圆角、前缀宽度或内部阴影。窄窗口通过页面栅格换行，不能压扁前缀或让字段与按钮重叠。
- 不定义日期默认值、快捷范围、时间精度、切换是否清空或查询触发；这些来自本页业务契约。

## PATTERN-004 / table-actions

实现：`OctoTableActions`；动作数组 `{key,label,type?,disabled?}` 已由调用层决定可见性，组件发出 `action(key)`。

- 所有直出动作和“更多”触发器均使用 Element Plus **text / default**，不混用 link、裸文字或不同 size。
- 默认密度：同为 32px 高、14px 字号、500 字重，使用同一字体、内边距和垂直基线；主动作 primary，更多 info。更多因箭头自然更宽，不通过放大字号或高度来补宽。
- 组内统一 `spacing-1` 间距；不在页面给 dropdown 添加独立左边距。箭头使用 ArrowDown，间距来自同一组件规则。
- 当前订单已有规则：动作不超过两个时全部直出；超过两个时直出第一个，其余进更多。不会因组件化增加、删除动作或推断权限。
- Disabled 来自调用者，透传真实控件；组件不执行请求、不判断订单状态、不生成成功反馈。

## 原型生成约束

先引用这份契约及其来源，再选择基础控件和组合组件。组件有缺口时先补组件、在独立样例验证，然后重生成页面消费处。不能只给具体订单页追加 CSS 以绕过组件定义。

`components.html` 只用于验读基础控件及组合，不能代替实际订单页交付。页面验收须检查默认、下拉/焦点、操作组默认/更多、窄窗口与原有查询事件。组件样例、实际页面、业务 UAT 分别记录；整个设计系统尚未完成。

## 运行依赖与复用

原型加载顺序：Element Plus CSS → `assets/prototype-ui/tokens.css` → `components.css` → 页面布局。Vue 与 Element Plus 初始化后注册 `OctopusPrototypeUI`，并注册真实 Element Plus ArrowDown 图标。共享 Token 来自本轮运行基线；页面只保留导航、图片和栅格等尺寸，不另设组合组件 Token。

默认密度本轮验证为 32px；其他密度未验收。禁用组合时调用者须同时禁用 slot 中的真实输入控件。当前前缀宽度对应本轮四字标签；新标签超出当前样本时须先检查组件，而不是在页面压缩文字。
