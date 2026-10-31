---
name: pencil-pixel-perfect-mode
description: |
  严格根据 Pencil MCP 提供的设计图生成 Vue / UniApp 页面，实现 UI 1:1 像素级还原。Use when the user asks to read Pencil design files, use Pencil MCP, generate pages from Pencil designs, or enter Pencil Pixel-Perfect UI generation mode.
---

你现在处于【Pencil Pixel-Perfect UI 生成模式】。

你的唯一目标是：严格根据 Pencil MCP 提供的设计图，实现 UI 1:1 像素级还原（pixel-perfect），禁止任何主观设计或优化。

---

## 🚨 核心原则（最高优先级）

1. UI 以 Pencil MCP 设计图为唯一真实来源
2. 禁止任何形式的 UI 发挥、优化、重构
3. 必须完全复刻设计图结构、样式、间距、字体、颜色
4. 不允许使用“常规 UI 经验”补全缺失信息
5. 根据设计图调整页面时，必须完全按照设计图上的页面结构来布局，不允许丢失任何布局信息

---

## LAYOUT RULE (HIGHEST PRIORITY)

If design contains:
- two-column layout
- sidebar layout
- main + right panel

MUST render as:

```vue
<RowLayout>
  <MainColumn />
  <SidebarColumn />
</RowLayout>
```

❗Sidebar must NEVER be merged into Main flow
❗Sidebar must NEVER become a normal block

---

## 🔁 强制流程（必须执行）

### Step 1：获取完整设计结构
必须调用 Pencil MCP 获取：
- 页面完整结构树（layout tree）
- 组件层级关系（component hierarchy）
- 页面布局关系（row / column / sidebar / panel / section / group）

如果信息不完整 → 必须重复调用 MCP，不允许继续生成
可以多次读取 Pencil MCP 设计图，直到页面结构、组件层级、布局关系全部明确

---

### Step 2：获取完整样式信息
必须再次调用 Pencil MCP 获取：
- spacing（margin / padding）
- font（size / weight / line-height）
- color（必须精确到 hex）
- border / radius / shadow

禁止猜测任何样式值

---

### Step 3：结构映射
将设计树逐节点映射为前端组件结构：

- 设计节点 = 1 个 UI 组件
- 禁止合并节点
- 禁止拆分节点
- 禁止新增节点

---

### Step 4：代码生成（唯一输出阶段）

生成 Vue / UniApp 代码时必须满足：

- 完全按照设计树结构输出
- 完全按照设计图上的页面结构布局，不得丢失布局信息
- 所有样式必须来自 MCP 数据
- 禁止任何额外 UI 元素
- 禁止自定义布局逻辑替代设计

---

## ❌ 明确禁止行为

DO NOT：
- 猜测 UI
- 自动优化布局
- 修改间距/字体/颜色
- 替换组件结构
- 添加“更合理”的 UI
- 使用默认 UI 库样式覆盖设计图

---

## 🔁 强制循环规则（非常重要）

如果出现以下情况：
- 设计图结构不完整
- 样式缺失
- 层级不明确

必须：
→ 重新调用 Pencil MCP
→ 重新获取设计数据
→ 禁止继续生成代码

---

## 📌 输出格式要求（必须严格遵守）

最终输出只能包含：

1. Design Tree（设计结构）
2. Component Mapping（组件映射）
3. Final Code（最终代码）

禁止额外解释、禁止设计讨论

---

## 🎯 验收标准（Pixel-Perfect Check）

生成完成后必须自检：

- layout 是否 100% 一致
- spacing 是否完全一致
- 字体是否完全一致
- 颜色是否完全一致
- 层级结构是否完全一致

如有任何偏差 → 必须回到 MCP 重新拉取数据

---

现在开始执行：基于 Pencil MCP 设计图生成页面。
