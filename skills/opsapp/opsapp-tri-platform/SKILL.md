---
name: opsapp-tri-platform
description: >-
  OpsApp 新增或修改页面、组件时，一次写出 Android、iOS、HarmonyOS 三端通用的实现，
  避免「安卓和苹果用一种组件，鸿蒙又要重写一遍」。提供三端安全选型表、鸿蒙差异收敛决策树、
  页面级 #ifdef APP-HARMONY 的准入条件与防分叉规则。
  Use when writing or reviewing any pages/**/*.uvue or components/**/*.uvue,
  when choosing which component or API to use for a new page, when a HarmonyOS-only
  bug needs fixing, when adding or editing any #ifdef APP-HARMONY / #ifndef APP-HARMONY block,
  or when the user mentions 三端、跨端、鸿蒙适配、harmony、referenceNode、条件编译、鸿蒙要重写.
---

# OpsApp 三端同构开发

## 为什么有这条规范

项目要同时交付 Android、iOS、HarmonyOS。历史上遇到鸿蒙渲染问题时，最省事的做法是给页面再写一份
`#ifdef APP-HARMONY` 的原生壳。代价现在已经显现：

- 46 个 `.uvue` 带鸿蒙条件编译分支，`#ifdef APP-HARMONY` 出现 111 次。其中 10 个在 `components/`
  （属于正确用法，见下文），**36 个在 `pages/`——这些才是要治的**
- 3 个页面整份 `<template>` 复制两份：`pages/onboarding/onboarding.uvue`（5585 行）、
  `pages/merchant-manage/edit-store.uvue`（6480 行）、`pages/after-sale/detail.uvue`（2845 行）
- 已经出过回归：登录页禁用态色彩对比度修过一次，后来改其他功能时只改了一侧分支，问题复发

**一份业务逻辑写两遍，就一定会分叉。** 本规范的目标不是"鸿蒙出问题后怎么修"，
而是"写的时候就选对，让鸿蒙不出问题"。

## 铁律

**页面模板永远只写一份。** 鸿蒙差异只允许存在于这三个位置，按优先级从高到低：

1. 共享组件的 `<style>` 里（已有 10 处先例，是正确示范）
2. 共享组件的模板内小范围分支（单个图标、单个节点级别）
3. 独立的小子组件内部（结构确实不同时）

页面级整块 `#ifdef APP-HARMONY` 是最后手段，需满足下文的准入条件。

**引入原生 View 组件前先确认业务是否真的需要交互。** 原生组件是三端分叉最大的单一来源：
自建高德地图插件只为「地图落点示意」这一个只读展示需求，先后引发 iOS 闪退、鸿蒙底图空白与卸载崩溃、
Android 返回崩溃四轮问题，累计写了条件编译卸载、延迟导航、冻结渲染三层规避代码，最终整体下线改用静态图。
只读展示优先选非原生方案（静态图、`<image>`、H5），能省掉的不只是包体，更是一整类三端崩溃面。

## 第一步：动手前照选型表选组件

新页面的组件选型决定了它以后要不要为鸿蒙返工。下表左列的写法三端通用，右列的写法在鸿蒙上会崩溃、
空白或失效，**不要因为"安卓和 iOS 上跑通了"就提交**。

| 你要做的事 | 三端一次写对 | 不要这样写 | 鸿蒙上的后果 |
| --- | --- | --- | --- |
| 页面根容器 | `<view>` + `<scroll-view>`，嵌套层级尽量浅 | `ops-page` 套多层 `ops-card` / `ops-cell` 深插槽树 | `mountPage` 阶段抛 `referenceNode is not in DOM`，冷启动白屏 |
| 条件渲染大块内容 | `<view v-if>` / `<view v-else>` | `<template v-if>` 包业务树 | Vue Fragment 走 `processFragment`，同上报错 |
| 刷新后滚回顶部 | `:scroll-top` / `:scroll-into-view` 配顶部锚点 | 给容器 `scroll-view` 挂自增 `:key` 强制重建 | 整棵子树卸载重建，`insertBefore` 拿到旧锚点抛 referenceNode；首屏看不出异常，只在离开页面时卸载崩溃、返回不到工作台 |
| 任何可见文字 | 一律包在 `<text>` 里 | `<view>门店</view>`、`<view>🏪</view>` | `processText` 抛 `referenceNode is not in DOM`。⚠️ 包 `<text>` 只解决**裸文本**这一种成因；若外层容器是带 `<slot/>` 的 `ops-*`，包了照样抛，见上一行 |
| 接口返回后才 `v-if` 翻真、且套在两层以上插槽里的按钮 | `view` + `text`，样式逐项抄 `ops-btn*` 类 | `ops-button`（哪怕内容已包 `<text>`） | `<slot/>` 编译成 Fragment，锚点在鸿蒙原生树上不存在，插任何子节点都抛 referenceNode；**包 `<text>` 或加 `label` prop 都无效** |
| 金额展示 | 单个 `text`，如 `¥{{ amount }}` | 「¥」和金额拆两个 `text` 再加 `v-if` | 同上 |
| 图标 | `<image src="*.png" mode="aspectFit">` | `<image src="*.svg">`；深层嵌套里的 `<ops-icon>` | SVG 三端都可能完全不展示；`ops-icon` 见下文「已知未收敛的坑」 |
| 日期录入 | `ops-form-date`，或底部 sheet 内年/月/日三列 `scroll-view` 点选 | `<picker mode="date">` | picker 内部 Fragment 触发 referenceNode |
| 主按钮（首屏静态渲染） | `ops-button`（已收敛按压动效） | 原生 `<button>` + `:disabled` | 系统样式覆盖自定义色，禁用态变系统灰底，按钮变窄偏左。**例外：patch 中途才挂载 + 多层插槽的位置不能用 `ops-button`，见上面第 5 行** |
| 定长数字输入 | `type="tel"` + `:maxlength="11"`，`@input` 内过滤截断 | `type="number"` + `maxlength="11"` | maxlength 不生效，可输入超长；截断后值不变时 UI 不回刷 |
| 列表底部避让 | 避让写在滚动内容内层：`.content { padding-bottom: 100px }`，配 `lower-threshold="120"` | `.scroll { padding-bottom: 88px }` 写在 `scroll-view` 自身 | padding 不计入可滚动高度，末尾内容和「暂无更多」被固定底栏挡住 |
| 横向 Tab / 横向滚动 | inner 容器显式 `width: Npx` | 靠内容自然撑开 | 被裁成视口宽，超出部分看不到 |
| 保存图片到相册 | `uni_modules/lf-album-save` | 直接 `uni.saveImageToPhotosAlbum` | 沙箱 URI 不合法报 `14000011`；声明 ACL 写相册权限会导致安装失败 `9568289` |
| 地图 | 高德静态图 `<image>`（`utils/amap-static-map.uts`） | 内置 `<map>`；自建原生地图插件 | 内置 map 只支持腾讯不支持高德；原生地图三端各崩过一次，已整体下线 |
| 返回工作台 | `guardSwitchTab('/pages/index/index')` | `uni.switchTab` | 项目已移除原生 tabBar，`guardSwitchTab` 内部走 `uni.reLaunch` |
| 列表页系统返回 | 补 `onBackPress` 兜底（全平台，不要只包鸿蒙） | 完全依赖默认 `navigateBack` | 页面栈被掏空后回不到工作台，退化成「再按一次退出应用」 |
| 外跳支付宝 / 微信 | `uni_modules/lengfeng-cashier` | 自己拼 scheme 调起 | 鸿蒙需 `openLink` + `module.querySchemes`，否则报 `17700056` |
| 扫码 | `utils/scan-guard.uts` 的 `tryEnterScan` / `exitScan` | 直接裸调 `uni.scanCode` | 重叠调用被原生层静默吞掉 |

CSS 属性级和 UTS 编译级的完整清单（`overflow`、`box-shadow`、`transform`、ArkTS 显式类型、
高德枚举导入路径等）见 `.cursor/rules/styling-design-tokens.mdc` 的 HarmonyOS 专节，
本 skill 不重复，遇到具体报错去查那里。

## 第二步：遇到鸿蒙差异时的收敛决策树

先判断差异的性质，再决定放在哪一层。**永远从第 1 级开始试，不要直接跳到第 4 级。**

### 第 1 级：只是样式属性不同 → 写进共享组件的 `<style>`

模板一份不动，只在组件样式里覆盖。这是项目验证过的正确模式：

```scss
/* components/primitives/ops-card/ops-card.uvue */
/* #ifdef APP-HARMONY */
.ops-card {
	overflow: visible;
}
/* #endif */
```

所有用到这个组件的页面自动受益，页面侧零改动。

### 第 2 级：单个节点渲染不同 → 写进共享组件的模板

范围控制在一个图标、一个节点，不要扩大到整块结构：

```vue
<!-- components/primitives/ops-drawer/ops-drawer.uvue -->
<view class="ops-drawer__close" @click="close">
	<!-- #ifdef APP-HARMONY -->
	<text class="ops-drawer__close-text">×</text>
	<!-- #endif -->
	<!-- #ifndef APP-HARMONY -->
	<ops-icon name="x" size="sm" variant="muted" />
	<!-- #endif -->
</view>
```

### 第 3 级：结构确实不同 → 拆成独立小子组件

把两套结构关进一个小组件内部，页面模板只留一行 `<ops-xxx-card />`。
条件编译的复杂度被限制在小文件里，不污染页面。

### 第 4 级：页面级整块 `#ifdef` → 需满足准入条件

见下一节。

### 关于运行时判断

理论上样式差异也能用 `uni.getSystemInfoSync().platform` 做运行时 class 切换，但**项目当前没有任何
运行时平台判断的先例**，也没验证过 uni-app x 各端返回值。如果要引入，先在一个小页面验证真机行为再推广，
不要直接大面积改造。另外注意：如果差异是"鸿蒙编译期就不支持某个 API"，运行时判断救不了——
代码不会被移除，鸿蒙端照样编译失败，这种必须用 `#ifdef`。

## 页面级 `#ifdef APP-HARMONY` 的准入条件

同时满足以下三条才允许新增：

1. 问题是**崩溃或编译失败级别**（典型是 `referenceNode is not in DOM` 白屏），不是样式偏差
2. 已经确认第 1、2、3 级收敛都解决不了，并在方案文档里写明试过什么
3. 分支范围**只包住出问题的那一块结构**，不是整份 `<template>`

新增后必须做两件事：

- 在 `docs/` 写方案文档，记录报错原文、触发条件、为什么没能收敛到组件层
- 在分支起始处加一行注释，标明另一侧需要同步维护

```vue
<!-- #ifdef APP-HARMONY -->
<!-- 三端同步：本块与下方 #ifndef 块是同一业务区域，改动需两侧同时改 -->
<view class="harmony-shell">
	...
</view>
<!-- #endif -->
```

**禁止**为了"鸿蒙上差几个像素""鸿蒙圆角不太对"这类视觉微调新增页面级分支。

## 改到已有 `#ifdef` 文件时的防分叉规则

这是历史回归的直接来源，**每次都要做**：

- 改动前先 `rg -c 'APP-HARMONY' <文件>` 确认这个文件有没有分支
- 修改任何一侧分支后，**必须去另一侧确认是否要同步改**，不能默认不用管
- 提交前对照 diff 自查：如果 diff 只动了一侧，要能说清楚为什么另一侧不用动
- 共用的 class 必须写在条件编译块**之外**。只写在 `#ifdef APP-HARMONY` 里，iOS 和 Android 编译不到，
  会出现「鸿蒙正常、另外两端完全不生效」

分支数最多的文件，改到时格外小心：`pages/store-member-code/store-member-code.uvue`（14 处）、
`pages/qrcode-store/qrcode-store.uvue`（12 处）、`pages/load-ship/pending-packages.uvue`
与 `loaded-packages.uvue`（各 7 处）。

## 已在组件内收敛的组件（用这些就免疫）

这 10 个组件内部已经处理好鸿蒙差异，页面直接用即可，**不要在页面里为它们再写一遍鸿蒙分支**：

| 组件 | 已替你处理的鸿蒙坑 |
| --- | --- |
| `ops-button` | 关闭 `transition` / `transform` 按压缩放，改用 `opacity` 反馈 |
| `ops-card` | `overflow: visible`，避免圆角裁掉子元素 |
| `ops-cell` | 各层 `overflow: visible` |
| `ops-input` | 输入框容器 `overflow: visible` |
| `ops-drawer` | 关闭按钮改 `×` 文字；容器 `overflow: visible` + 底部圆角补齐 |
| `ops-action-bar` | `box-shadow: none`（鸿蒙阴影渲染异常） |
| `ops-upload-box` | 上传区 `overflow: visible`；图标区去阴影 |
| `ops-scan-input` | 扫码框 `overflow: visible`；扫码按钮背景色兜底 |
| `ops-typography-tabs` | Tab 容器 `overflow: visible` |
| `ops-select-card` | 选中勾选改 `✓` 文字 |

发现某个 `ops-*` 组件在鸿蒙有问题时，**优先修组件、让所有页面一起受益**，而不是在自己这个页面绕过去。

## 已知未收敛的坑

| 坑 | 现状 | 你该怎么做 |
| --- | --- | --- |
| `ops-icon` | 内部是 65 个 `v-else-if` 串起来的 `<image>` PNG 链（535 行）。深层嵌套时是 referenceNode 高危源，`ops-drawer` 和 `ops-select-card` 都是靠换成文字符号绕开的 | 鸿蒙高风险页面（首屏、深嵌套、大表单）不要用 `ops-icon`，直接写 `<image src="*.png">` 或文字符号 |
| 带 `<slot/>` 的 `ops-*` 组件（`ops-button`、`ops-action-bar` 等） | `<slot/>` 编译成 Fragment，鸿蒙拿不到 fragment 锚点。首屏静态渲染没事，**patch 中途挂载 + 多层插槽嵌套时必炸**，且包 `<text>` / 加 `label` prop 都绕不过去 | 满足该场景就整个弃用组件，改写 `view` + `text`，样式按原组件类名逐项抄。判定与替换细则见 `.cursor/rules/styling-design-tokens.mdc` |
| `<picker mode="date">` | 无组件级封装，各页面自行处理 | 用 `ops-form-date`，或参考商户进件的三列 sheet 实现 |
| 三个整页复制的大文件 | `onboarding.uvue`、`edit-store.uvue`、`after-sale/detail.uvue` 仍是两份完整模板 | 改这三个文件时严格执行防分叉规则；不要在它们身上加新的整块分支 |

## referenceNode 的定位方法：先看堆栈，不要先套清单

**这是遇到 referenceNode 报错的第一步，不是最后一步。** 上面的选型表适合**写代码时预防**，
不适合**出错后定位**。门店档案那个 bug 前三轮都在逐条比对高危写法清单（包裸文本、换 `ops-icon`、
删动态 `:key`），第四轮才改成堆栈逐帧对齐，一次命中。

### 三步定位

1. **留下修复前的完整堆栈**：从 `insertBefore` 往下十帧左右，包含 `processFragment` 的行号
2. **改一处，再取一份堆栈，两份并排逐帧对齐**
3. 只看抛错帧（`insert` → `insertBefore`）的位置变没变：
   - **位置不变，只有更内层的节点类型变了**（典型：`processText` 变成 `mountElement`）
     → 改动根本没碰到根因。别再换子节点的写法，往**上**一层找 `anchor` 是谁给的
   - **抛错帧整个消失** → 这一处修对了，但不代表问题结束，见下面第三小节

`processFragment` 的两个行号语义完全不同，必须分清：

- **9169 = 挂载分支**，说明有 Fragment 正在首次插入子节点 —— 高危信号
- **9187 = 更新分支**，正常 patch，通常无害

### `anchor` 的两类来源

确定要「往上找 anchor」之后，本项目目前只见过两类，逐一排掉即可：

| 来源 | 长什么样 | 怎么修 |
| --- | --- | --- |
| Fragment 锚点在鸿蒙原生树上从未真正插入 | `<slot/>` 或 `<template v-if>` 编译出的 Fragment，尤其是 patch 中途才挂载 + 多层插槽嵌套 | 去掉这层 Fragment：弃用带 `<slot/>` 的 `ops-*`，改写 `view` + `text` |
| 子树被整体卸载重建，锚点随旧子树一起被摘掉 | 容器节点绑了运行时会变的 `:key` | 去掉动态 `:key`，滚动位置改用 `scroll-top` / `scroll-into-view` |

第二类有个很容易误判的特征：**它不影响首屏观感**。最后一次 patch 通常能把界面画对，
所以表现是「控制台爆红但功能正常，只是返回不到工作台」——因为 patch 中途抛错让组件实例的
`subTree` 停在半写状态，离开页面时 `unmountComponent` 走这棵坏树抛 `type of null`，
页面栈弹不掉。**看到这个组合症状，直接去搜容器节点上的 `:key`。**

### 一处修好后仍复现 ≠ 之前的判断错了

门店档案最终是**两个独立成因叠加**：容器 `scroll-view` 的自增 `:key`（进一次页面整页子树重建 3 次）
和 `ops-button` 的 `<slot/>` Fragment。两个都是真缺陷，**两个都修掉才收敛**。

所以删掉一处、真机仍然爆红时，**不要顺手把刚做的正确修改回退掉**。先用上面第 2 步确认抛错帧
是否已经换了位置：换了就说明前一处确实修对了，你现在面对的是下一个成因。
把「还在报错」直接读成「我改错了」，会在正确答案之间来回横跳，这是那次拖到四轮的直接原因。

完整过程见 `docs/20260821-鸿蒙门店档案referenceNode-bug修复方案.md` 第 12、13 节。

## 新增/修改页面的检查清单

- [ ] 所有可见文字都包在 `<text>` 里，包括按钮文案、emoji、符号
- [ ] 条件渲染用 `<view v-if>`，没有 `<template v-if>` 包业务树
- [ ] 容器节点（`scroll-view` / 外层 `view` / `swiper`）没有绑运行时会变的 `:key`
- [ ] 接口返回后才 `v-if` 翻真、且套在两层以上插槽里的位置，没有用带 `<slot/>` 的 `ops-*` 组件
- [ ] 图标走 PNG，没有运行时 `<image src="*.svg">`
- [ ] `scroll-view` 的底部避让写在内层内容节点上，不在 `scroll-view` 自身 padding
- [ ] 有分页的列表补了 `lower-threshold` 和「暂无更多」空状态
- [ ] 相册、地图、支付外跳、扫码走的是项目封装，不是裸 `uni.*` API
- [ ] 列表页有 `onBackPress` 兜底，且没有只包在鸿蒙分支里
- [ ] 新写的 `#ifdef APP-HARMONY` 满足准入条件，且加了同步维护注释
- [ ] 改到已有分支文件时，另一侧已确认过是否需要同步
- [ ] 三端共用的 class 写在条件编译块外面
- [ ] 改完跑一次 `ReadLints` 确认无报错

## 参考

- 条件编译现状盘点：`docs/20260819-鸿蒙条件编译收敛-评估方案.md`
- 收敛的量化排序与执行方案：`docs/20260821-鸿蒙条件编译收敛执行方案.md`
- CSS 属性级与 UTS 编译级的完整鸿蒙清单：`.cursor/rules/styling-design-tokens.mdc`
- referenceNode 系列根因与修法：`docs/20260729-鸿蒙登录页referenceNode-bug修复方案.md` 等 16 篇
- 列表触底与底部留白：`docs/20260803-鸿蒙进货首页底部留白与暂无更多-bug修复方案.md` 等 6 篇
- 返回工作台：`docs/20260805-鸿蒙门店管理详情返回后无法回工作台-bug修复方案.md`
- 相册与 Canvas 海报：`docs/20260730-鸿蒙门店拓展二维码保存相册-bug修复方案.md`
- 原生地图为何整体下线（原生 View 组件的三端代价）：`docs/20260821-地图依赖收敛与高德key平台错配-方案.md` 第 11 节
