---
name: octoups-spec-to-code
description: >-
  Use when a result page in `octoups-user-results.pen` has been confirmed and
  the user wants real miniprogram components or pages implemented with TDesign
  and the repo's business components. First verify that the relevant formal
  components in `octoups-user-spec.lib.pen` are correct; if component details
  are wrong, update `lib.pen` and the result file first, then implement code
  from a clear spec-vs-code diff. For elderly mode, prefer the repo's global
  mode switch plus token inheritance; do not add component-level `mode` or
  `elderly` props unless structure or isolation truly requires it.
---

# octoups-user：结果稿确认后的代码落地流程

## 什么时候用

以下请求直接使用本 skill：

- “结果稿确认了，开始写真实组件代码”
- “把 `Component/*` 落成小程序组件”
- “按 `octoups-user-results.pen` 改页面”
- “基于 TDesign 实现这个结果稿”

## 同时启用

- 先加载 `../octoups-miniapp-standards/SKILL.md`
- 如果这次落地还要接真实接口、改 `services/*.ts`，或碰
  `miniprogram/sdk/**` / `openapi/**` / `scripts/gen-sdk.mjs`，同时加载
  `../octoups-miniprogram-dev/SKILL.md` 和
  `../octoups-miniprogram-sdk/SKILL.md`
- 遇到按钮、navbar、弹层原生组件穿透、适老化时，按需补读对应 `.mdc` 规则

## 先决条件

开始写代码前，至少满足：

1. 目标结果页已经在 `octoups-user-results.pen` 确认
2. 对应 formal component 已经在 `octoups-user-spec.lib.pen`
3. `Result/*` 没有再依赖 preview / showcase / 临时容器语义
4. `results.pen` 里的 use component 来源已经收敛到 formal component 或 `tgIgB`

如果以上任一不满足，先回到 `octoups-screenshot-to-spec`。

## 执行顺序

### 1. 先做 spec -> code 映射

对当前任务先列出三层映射：

- formal component
- 真实业务组件
- 内部复用的 TDesign 原子组件

例如：

- `Component/PickupInfo/Map` -> `components/pickup-info-card` -> `t-tag` / `t-cell` / `t-icon`
- `Component/OrderConfirm/CostCard` -> `components/order-cost-card` -> `t-cell`
- `Bar/Checkout` -> `components/bottom-action-bar` 的 `checkout` variant -> `t-button`

### 2. 如果组件细节不对，先改 spec，不要先改代码

这是强规则：

- 如果你发现真实需要的组件细节和 `lib.pen` 不一致
- 或结果页已经确认，但 formal component 本身还不对

必须先做：

1. 更新 `octoups-user-spec.lib.pen`
2. 如有必要，同步更新 `octoups-user-results.pen`
3. 再根据最新 spec 生成 diff
4. 最后才改 `miniprogram/components/*` 和 `miniprogram/pages/*`

不要反过来先把代码修歪，再回头追认 spec。

### 3. 用 diff 驱动代码修改

优先执行 `references/diff-driven-implementation.md` 里的 diff checklist。

至少列清这 5 类差异：

- 结构差异：节点顺序、容器拆分、是否缺组件
- props 差异：组件输入字段、命名、默认值
- 样式差异：token、圆角、间距、字号、选中态
- 状态差异：默认态、选中态、缺货态、支付态
- 交互差异：点击行为、弹层、切换、禁用态

### 4. 实现顺序固定

1. 优先复用 TDesign
2. 再实现或修正业务组件
3. 最后改页面装配

页面文件里不要重新长出可复用结构。
组件文件先于页面文件变更，不要反过来。

### 5. TDesign 使用边界

- 通用交互优先用 TDesign：`t-button`、`t-cell`、`t-tag`、`t-tabs`、`t-popup`、`t-dialog`、`t-search`、`t-switch`、`t-checkbox`
- 业务组合件自己写：`pickup-info-card`、`order-cost-card`、`bottom-action-bar` 这类
- 不要为了“纯 TDesign”把业务语义拆碎到页面里

### 6. 适老化接入策略（强规则）

默认按仓库现有主路径实现，不要上来就给组件加 `mode`：

1. 页面根节点负责挂 `{{mode}}`
2. 共享组件优先消费全局 token / 全局变量
3. 能通过结构调整继承适老化变量的，先改结构，不要先扩 props

先检查这 3 件事：

- 目标节点是不是还在带 `{{mode}}` 的页面根节点内部
- 共享组件是不是已经在吃 `var(--font-*)`、`var(--radius-*)`、`var(--space-*)`
- 当前“不适老”的原因是不是写死字号、圆角、间距，而不是缺一个 `mode`

只有在下面场景才允许增加组件级 `mode` / `elderly`：

- 组件必须脱离页面根节点单独渲染
- 组件 family 已经公开了 `mode` / `elderly` API，需要保持兼容
- 样式隔离或渲染结构决定了全局变量路径不可用，且不能通过结构调整解决

额外硬规则：

- 固定底栏、弹层、吸底按钮如果要继承适老化变量，不能挂在带 `{{mode}}` 根节点之外
- 共享组件不要写死本应跟随适老化变化的 `40rpx`、`16rpx`、`6px`
- 如果问题本质是 token 没接上，先接 token，不要先复制两套组件
- `--font-body` = 正文 / 主信息 / 操作文案；`--font-small` = caption / hint / 次级说明；新代码不要再新增 `--font-meta`
- 卡片里的主阅读信息（label / value / 地址 / 电话 / 退款按钮文案）默认用 `--font-body`，不要误挂到 `--font-small`

### 7. 样式规则

- 优先用全局 token
- 不要把结果稿视觉写成页面私有硬编码
- 适老模式继续靠 token / mode 兼容，不复制两套组件

### 8. 验证

至少做：

- 相关 TypeScript / JSON / WXML 文件静态检查
- `tsc --noEmit`
- 如能运行，微信开发者工具构建和编译
- 手工对照 `octoups-user-results.pen`

如果某一步不能跑，要明确说明没跑。

## 高频反模式

- formal component 细节不对，却先硬改页面代码
- 看到适老化没生效，就默认给所有组件加 `mode`
- 固定底栏或弹层被挂在页面根节点外，导致吃不到全局 `{{mode}}`
- 共享组件继续写死字号、圆角、按钮高度，而不是接全局 token
- 页面里重新长出本该复用的业务结构

## 需要时再读

- 仓库通用规范：`../octoups-miniapp-standards/SKILL.md`
- 真实数据错误边界：`../octoups-miniapp-standards/references/error-exposure.md`
- diff 方法：`references/diff-driven-implementation.md`
- 接口 / SDK 工作流：`../octoups-miniprogram-sdk/SKILL.md`
