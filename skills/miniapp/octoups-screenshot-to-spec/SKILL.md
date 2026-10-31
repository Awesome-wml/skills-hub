---
name: octoups-screenshot-to-spec
description: >-
  Use when the user provides a screenshot, PNG, or design image and wants the
  octoups-user repo to rebuild, refine, or formalize the UI. Follow the repo
  workflow: audit existing code, formalize missing components in
  `octoups-user-spec.lib.pen`, assemble result pages in
  `octoups-user-results.pen`,
  validate disk files, and only then implement real miniprogram code after the
  result pen is confirmed.
---

# octoups-user：截图驱动的规范补齐流程

## 什么时候用

以下请求直接使用本 skill：

- “参考这张截图实现页面”
- “把这个页面重做进 `lib.pen`”
- “这个截图里缺组件，补齐组件库”
- “先出结果稿，我确认后再写真实代码”
- “按我们现有规范和组件复刻这个界面”

## 同时启用

- 先加载 `../octoups-miniapp-standards/SKILL.md`
- 处理布局、token、组件边界时，按需补读 `../../rules/octoups-design-system.mdc`
  和 `../../rules/screenshot-to-spec-workflow.mdc`

## 目标产物

按顺序产出：

1. `miniprogram/COMPONENT_AUDIT.md`
2. `octoups-user-spec.lib.pen`
3. `octoups-user-results.pen`
4. 确认后再进入 `miniprogram/components/*` 和 `miniprogram/pages/*`

不要跳步骤。不要先做页面 demo 再回头补 formal component。

## 仓库内固定分工

- `octoups-user-spec.lib.pen`
  - 正式组件库
  - 只保留 `Component/*`、`Field/*`、`Bar/*`、`Sheet/*`、说明区
- `octoups-user-results.pen`
  - 结果页和 demo
  - 放 `Result/*`、页面态、变体演示
  - 顶层 `tgIgB / Library/UsedComponents` 是合法的本地组件副本区，不要清掉
- `miniprogram/COMPONENT_AUDIT.md`
  - 代码组件和规范组件的映射矩阵

如果 `Result/*` 还留在 `lib.pen`，这是要先清理的错误，不是正常状态。

## 执行步骤

### 1. 先找真实来源，不要只盯截图

先读：

- 仓库级规范：`../octoups-miniapp-standards/SKILL.md`
- 对应页面：`miniprogram/pages/*`
- 对应组件：`miniprogram/components/*`
- 现有规范：`octoups-user-spec.lib.pen`

截图只负责告诉你“视觉目标”，不负责告诉你“组件边界”。

### 2. 先做组件审计

更新 `miniprogram/COMPONENT_AUDIT.md`，把相关代码组件归类为：

- `mapped`
- `spec-only`
- `helper-only`
- 缺失正式组件

如果某个结构已经在代码里稳定存在，但 `lib.pen` 还没有正式组件，先补 `lib.pen`。

### 3. 先补 formal component，再画结果页

必须先完成下面这些动作，才能开始 `Result/*`：

- 新增缺失的 `Component/*` / `Bar/*` / `Sheet/*`
- 清掉“demo 容器冒充正式组件”的情况
- 把上层业务卡片改成只引用正式原子组件

禁止：

- 用 `Result/*` 回填正式组件语义
- 用 showcase / preview 节点代替正式组件
- 把 `StoreItem` 和 `PickupInfo` 混成一个 family

### 4. 再装配 `octoups-user-results.pen`

结果稿只能：

- 引用正式组件或 `tgIgB` 里的本地副本
- 加必要页面脚手架，如导航、mask、页面背景、滚动容器

额外硬规则：

- `results.pen` 里的 reusable component 只允许集中放在 `tgIgB`
- 单个 `Result/*` 页面内部不要新建散落的 reusable component
- 不要把 preview / showcase / result 容器当成 use component 来源

滚动页面要遵守：

- 页面根节点使用 `height: "fit_content(812)"`
- 页面根节点不要 `clip`
- 固定底栏和弹层单独表达

### 5. 修改后必须做磁盘校验

始终把磁盘文件当最终真值；编辑器状态可能和磁盘不一致。

优先执行 `references/validation.md` 里的校验命令。

最低要求：

- `jq empty octoups-user-spec.lib.pen`
- `jq empty octoups-user-results.pen`
- `dupIds=[]`
- `dupNames=[]`
- `missingRefs=[]`

### 6. 对关键节点截图复核

至少对这些节点出图：

- 当前核心 `Result/*`
- 新增 family 的 demo
- 复杂弹层或固定底栏场景

重点检查：

- 有没有裁切
- 有没有重复文案
- 有没有顶部 / 底部重叠
- 有没有“本该滚动却被固定高度截断”

### 7. 用户确认结果稿后，再写真实代码

确认前：

- 不进入页面代码重构
- 不开始真实组件 API 设计

确认后：

1. 优先复用已有业务组件
2. 再把新 formal component 映射成真实组件
3. 最后改页面装配

## 这类任务的高频反模式

- 还没补业务原子组件，就先拼 `Result/*`
- 一个 `Component/*` 实际上引用的是 preview 或 result 容器
- 滚动页面根节点写死 `height: 812`
- `lib.pen` 里同时堆正式组件和结果稿壳子
- `results.pen` 里没有 `tgIgB` 本地副本区，却在 `Result/*` 里散落 reusable component
- 只看 Pencil 当前状态，不校验磁盘 JSON

## 需要时再读

- 仓库通用规范：`../octoups-miniapp-standards/SKILL.md`
- 校验命令与审计脚本：`references/validation.md`
- 结果稿确认后的代码落地：`../octoups-spec-to-code/SKILL.md`
