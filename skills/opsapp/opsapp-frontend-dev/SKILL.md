---
name: opsapp-frontend-dev
description: OpsApp 项目前端页面、组件、路由、能力守卫、API 对接、设计稿样式统一与新增图标规范。用于当前仓库的 uni-app x / UTS 前端开发：新增或修改 `pages/**/*.uvue` 页面、`components/**/*.uvue` 组件、`api/*.uts` 请求模块、`pages.json` 路由与 easycom，根据接口文档完成字段对齐、上传/OCR 接入、能力控制、联调收口，按设计稿执行样式统一/布局重构，或新增/替换项目图标时使用。所有需求必须先输出 `docs/` 方案文档，再输出 `dev-plan/` 任务 plan，最后才进入开发；涉及根因分析、跨文件改动或契约/权限/路由调整的较深 bug 也要走同流程；按设计稿统一样式时仅允许重构布局（Layout），严禁调整字体尺寸与功能逻辑，该规则强制适用于 iOS、Android 及苹果生态所有界面；项目新增图标必须使用纯 SVG，禁止 SVG 内嵌 `<image>`。
---

# OpsApp Frontend Dev

## 核心目标

围绕当前仓库的前端代码工作，稳定完成以下任务：

- 开发新页面或扩展已有页面
- 抽取或新增可复用组件
- 新增或修改 `api/*.uts` 接口封装
- 注册页面路由、easycom 组件映射、能力守卫映射
- 在拿到接口文档后，把静态页面或半成品页面接成真实链路
- 按项目规范新增、替换或统一前端图标资产

始终基于当前项目事实开发，不照搬 Vue Web 项目或其他 uni-app 项目的习惯。

## 标准工作流

无论是新需求，还是涉及较深修复的 bug，都必须严格按这个顺序执行：

1. 分析需求 / bug，并阅读涉及的项目代码
2. 输出方案文档，放到 `docs/`
3. 输出任务 plan，放到 `dev-plan/`
4. 等待用户确认或调整方案 / plan
5. 用户同意后，再进入实际开发

这是强约束：

- 用户提需求：先分析代码，再写需求方案，再写任务 plan
- 用户提 bug：如果是局部、低风险的小修，可直接处理；如果涉及根因分析、跨文件改动、接口/路由/权限/字段对齐，就先分析代码和问题根因，再写修复方案，再写任务 plan
- 用户直接要求“改代码”或“修一下”时，先判断是否属于较深修复；属于较深修复时，必须先完成“分析代码 → 方案 → plan”，再等待确认
- 如果用户要求调整方案，先更新 `docs/*.md`，再同步更新 `dev-plan/*.md`

例外说明：

- 如果任务只是纯调试日志调整，例如仅新增、删除或修改 `console.log` / 打印语句，且不改变业务逻辑、接口契约、路由、权限或页面结构，可直接处理，不需要先走 `docs/` 方案和 `dev-plan/` 任务 plan
- 如果调试过程中发现需要进一步修改业务逻辑、接口字段、路由、权限或跨文件行为，再切回标准流程，先补方案与 plan

设计稿样式统一强约束：

- 根据设计稿执行样式统一时，只允许重构布局（Layout），包括容器层级、间距、对齐、宽高、栅格/弹性布局、安全区、滚动区域和元素排列方式。
- 严禁调整字体尺寸，包括直接修改 `font-size`、间接切换 `$font-size-*` token，或通过其他方式改变既有字号表现。
- 严禁调整功能逻辑，包括接口请求、数据结构、权限守卫、路由跳转、事件处理、表单校验、状态流转和业务判断。
- 该规则强制适用于 iOS、Android 及苹果生态所有界面；不要因为平台差异为 iOS、iPadOS、macOS 或其他苹果生态目标端单独放宽字号或逻辑限制。

确认前允许做的事情：

- 阅读代码、文档、接口说明、计划文件
- 必要的只读排查
- 必要的低风险复现与日志确认
- 新建或更新 `docs/*.md` 方案文档
- 新建或更新 `dev-plan/*.md` 任务 plan

确认前禁止做的事情：

- 修改业务代码
- 新增页面、组件、接口封装
- 修改 `pages.json`、能力映射、请求逻辑
- 对需要走方案 + plan 的需求或较深 bug，直接修 bug 或直接开始联调

如果任务已经有对应方案文档，优先更新原文档，而不是重复新建。

如果任务已经有对应 plan 文件，优先更新原 plan，而不是重复新建。

### 方案文档位置与命名

方案文档统一放在 `docs/` 下。

可直接参考模板：`docs/前端需求与Bug方案模板.md`

默认命名建议：

- 新需求：`docs/YYYYMMDD-模块名-需求方案.md`
- Bug：`docs/YYYYMMDD-模块名-bug修复方案.md`

如果用户已经指定名称，优先按用户指定名称创建。

### 方案文档最少应包含的内容

需求方案至少包含：

- 背景与目标
- 当前现状
- 方案说明
- 涉及页面 / 组件 / API / 路由 / 权限
- 风险与影响范围
- 待确认项
- 实施步骤

Bug 方案至少包含：

- 问题现象
- 复现路径
- 根因分析
- 修复思路
- 影响范围与回归点
- 风险与待确认项
- 实施步骤

### 任务 plan 的位置与要求

任务 plan 统一放在 `dev-plan/` 下。

plan 文件必须在开发前输出，不是开发完后补写。

如果方案规模较大，plan 不能只写一层平铺任务，必须拆成“总任务 + 子任务”。

以下情况视为“大方案”，应优先拆层：

- 涉及多个页面或多个业务域
- 同时涉及页面、组件、接口、路由、能力控制中的多个维度
- 需要分阶段上线、分步骤联调或分批回归
- 单个任务如果不继续拆分，就难以判断完成边界

拆分原则：

- 总任务用于表达阶段目标或模块目标
- 子任务用于表达可独立实施、可独立验证、可独立标记完成的最小单元
- 执行时按子任务推进，不要只停留在总任务层
- 每完成一个子任务，就及时更新 plan；总任务在其子任务全部完成后再标记完成
- 如果字段差异、字段缺失或接口缺口属于某个主任务，就必须记录为该主任务下的待完成子任务；子任务未完成时，主任务不能标记完成

plan 至少包含：

- 任务背景或目标
- 对应方案文档路径
- 任务拆分列表
- 大方案时的“总任务 + 子任务”层级
- 涉及文件
- 每个任务的验证方式
- 完成记录

用户确认“方案 + plan”后，再进入实际开发流程。

## 开发前先建立上下文

开始编码前，先读取与任务直接相关的现有文件。

优先阅读这些文件：

1. `pages.json`
2. 相关页面：`pages/<domain>/<name>.uvue`
3. 相关组件：`components/primitives/**`、`components/domain/**`
4. 相关 API：`api/*.uts`
5. 请求与登录上下文：`utils/request.uts`、`utils/auth.uts`
6. 能力控制：`utils/capabilities.uts`、`utils/capability-guard.uts`、`utils/capability-store.uts`
7. 设计 token：`uni.scss`
8. 接口现状文档：`api_contract/项目页面流程与接口梳理.md`、`api_documents/OpsApp接口对照文档.md`
9. 对应业务的 `dev-plan/*.md`

先判断任务属于哪一类：

- 新页面
- 新组件
- 已有页面接接口
- 已有页面改交互或补能力控制

如果相关 `dev-plan/*.md` 已存在，优先更新它；如果是新的业务域，再补新的 plan 文件。

注意区分两个前置产物：

- `docs/*.md` 用于需求或 bug 的分析与方案
- `dev-plan/*.md` 用于该方案对应的任务拆分和执行计划

两者都要先产出，并等待用户确认；不是只出方案不出 plan，也不是直接跳过方案只写 plan。

## 新页面开发流程

以下流程只在“方案文档 + 任务 plan”都已获用户确认后执行。

### 1. 先确定页面归属

先判断页面是：

- 普通业务页
- tabBar 页面
- 需要自定义导航的页面
- 受组织能力控制的页面

除非用户明确要求修改底部导航，否则默认不要新增 tabBar 页面。当前 tabBar 只包含：

- `pages/workbench/workbench`
- `pages/ai/ai`
- `pages/more/more`

### 2. 先注册再开发

在 `pages.json` 注册页面。

遵循当前项目的写法：

- 普通页面配置 `navigationBarTitleText`
- 需要自定义头部时配置 `navigationStyle: "custom"`
- 页面路径保持 `pages/<domain>/<name>`

如果页面需要从工作台或其他受控入口进入，同时更新：

- `utils/capabilities.uts` 里的 `capabilityEntryMappings`
- 相关跳转逻辑里对 `guardNavigateTo` / `guardSwitchTab` / `ensureRouteCapability` 的使用

### 3. 优先复用现有布局骨架

新建或改版页面的页边距、卡片间距、字号，先读并遵守  
`.cursor/skills/opsapp-ui-layout/SKILL.md`：全局页边距 12px，卡片间距 8px，卡片内边距 12px（内容多可改 8px）；字号按 Title / SubTitle / Body / Minor / Tip。

页面根容器优先使用：

- `ops-page`
- `ops-col`
- `ops-row`
- `scroll-view`
- `ops-card`
- `ops-section-title`

表单与详情优先复用：

- `ops-form-field`
- `ops-form-select`
- `ops-form-date`
- `ops-form-region`
- `ops-upload-box`
- `ops-cell`
- `ops-detail-item`

反馈与交互优先复用：

- `ops-button`
- `ops-modal`
- `ops-drawer`
- `ops-tabs`
- `ops-radio-tabs`
- `ops-checkbox`
- `ops-switch`

不要引入这个仓库里不存在的 UI 体系。

### 4. 遵循当前代码风格

页面文件使用：

- `.uvue`
- `<script setup lang="uts">`
- `ref` / `computed` / `watch`
- `UTSJSONObject` 作为动态对象载体

导入路径沿用当前项目的相对路径风格，例如：

```uts
import { apiGetMe } from '../../api/user.uts'
import { ensureRouteCapability } from '../../utils/capability-guard.uts'
```

不要擅自切换为 `@/` 别名风格。

输入控件沿用当前项目事件方式：

```uts
const onInput = (e : InputEvent) => {
  value.value = e.detail.value
}
```

UTS 语法注意事项：

- 匿名箭头函数不要给参数写默认值，例如不要写 `const showError = (msg : string, title : string = '登录失败') => {}`。
- 需要默认值时，改成显式包装函数或在函数体内自行兜底，避免触发 `Anonymous functions cannot specify default values for their parameters` 编译错误。
- 对 `decodeURIComponent(...)`、`Map.get(...)`、动态对象取值后的字符串处理，不要直接赋给 `string` / `ref('')`；先落局部变量，再做 `!= null ? value : ''` 兜底，避免 `String?` 到 `String` 的赋值不匹配。
- 在页面里写 `const onConfirmXxx = () => {}` 这类函数时，UTS 对声明顺序很敏感：如果前面的函数要调用它，就把 `onConfirmXxx` 提前定义到前面。仅仅把 `setTimeout(() => { onConfirmXxx() }, 30)` 改成 `setTimeout(onConfirmXxx, 30)` 还不够，定义顺序不对时仍然可能触发“找不到名称”编译错误。
- `.uvue` 样式不要照搬 Web CSS，像 `display: block` 这类写法可能直接编译失败；文本展示场景优先删除该声明，需要布局时改用 `view` 容器或现有 `ops-row` / `ops-col` 承接。
- 对 `ref(null as UTSJSONObject | null)` 这类可空对象，读取字段时不要写 `selected.value!['xxx']` 这种不稳定断言；统一先落局部变量，再显式判空。
- 对已经在 `pages.json` 注册的页面文件，禁止默认使用“先删旧文件、再新建同路径文件”的重构方式。增量编译会抓到瞬时 `ENOENT`；优先使用 `Update File` 原位改内容。
- 不要把接口返回的 `data` 凭印象直接断言成数组；先确认是 `data`、`data.list` 还是 `data.records`，必要时写 `extractXxxList()` 收口。
- 涉及 `UTSJSONObject` 的 `resourceId`、路由参数、Long/String 混合字段时，优先判空后 `toString()`，不要直接 `as number` / `as string` 强转。
- 本仓库已沉淀一份高频编译坑清单：`docs/20260515-uts-compile-pitfalls.md`。改动 UTS 页面或组件前，先按这份清单自检。

接口契约收口强约束：

- 接口字段缺失时，不做兜底。
- 禁止为了“先跑通页面”补假值、补默认展示文案、补占位业务值、补旧逻辑回退。
- 禁止把后端缺字段场景偷偷改成前端降级成功。
- 如果接口没返回页面依赖字段，应直接：
  - 打日志，包含缺失字段名与原始返回
  - 在方案 / plan 中记录为接口缺口
- 对于“接口字段缺失 / 接口返回结构异常”这类问题，默认不要弹业务兜底提示去干扰排查；优先保留原始日志，让问题暴露在接口层。
- 只有用户明确要求临时兜底，或者方案文档中已经明确约定了临时降级策略，才允许做前端兜底。

Git 提交注意事项：

- 这个仓库需要使用中文 `commit message`。
- 提交信息优先简洁描述本次业务改动，不要默认写英文模板式摘要。

### 5. 收口页面状态

页面至少补齐这些状态：

- 首次加载
- 空数据
- 加载失败或接口失败
- 分页加载或触底加载
- 成功后的跳转或提示

如果后端接口未就绪，不要伪造“已完成联调”；要在 plan 中记录为待完成任务，并注明依赖后端补充。

## 新组件开发流程

以下流程只在“方案文档 + 任务 plan”都已获用户确认后执行。

### 1. 先判断放到哪一层

按复用范围选择目录：

- 通用基础组件放 `components/primitives/ops-xxx/ops-xxx.uvue`
- 业务域组件放 `components/domain/ops-xxx/ops-xxx.uvue`

判断标准：

- 只关心样式和通用交互，不带业务语义：放 `primitives`
- 带明显业务语义或组合结构：放 `domain`

### 2. 注意 easycom 映射差异

当前 `pages.json` 的 easycom 有两个规则：

- `^ops-(.*)` 指向 `components/primitives/ops-$1/ops-$1.uvue`
- domain 组件不是全量通配，而是白名单正则

这意味着：

- 新增 primitive 组件时，通常不需要改 `pages.json`
- 新增 domain 组件时，必须把组件名补进 `pages.json` 的 domain 正则白名单，否则解析会落到 primitive 路径并报错

这是当前项目里最容易漏掉的点之一。

### 3. 组件设计保持当前习惯

优先使用：

- `props + emits`
- `v-model:modelValue` / `v-model:visible` / `v-model:checked`
- 尽量清晰的默认值
- 插槽扩展而不是复制页面结构

优先让组件解决一个明确问题，不要把页面整块塞进单个“大组件”。

### 4. 视觉与样式规则

优先使用 `uni.scss` 中已有 token：

- 颜色：`$color-primary`、`$color-foreground`、`$color-muted-foreground`、`$color-divider` 等
- 间距：`$spacing-*`
- 圆角：`$radius-*`
- 字号：`$font-size-*`

保持当前橙色主题，不额外发明一套新色板。

优先使用 `ops-icon` 和现有 `static/icons/**` 资产；新增图标前先确认现有图标是否可复用。

新增图标强约束：

- 项目中新增的图标必须使用 SVG。
- 新增 SVG 必须是纯矢量内容，禁止在 SVG 内嵌 `<image>`，也禁止用 base64、png、jpg、webp 等位图伪装成 SVG。
- 如果设计稿只提供位图图标，先转绘为真实 SVG path / shape；无法转绘时先说明阻塞，不要提交内嵌位图的 SVG。
- 新增图标优先放入现有 `static/icons/**` 体系，并通过 `ops-icon` 或当前项目已有图标入口使用。
- 如果同一批新增图标需要反复在页面中引用，可以新增或扩展一个统一图标方法 / 映射入口，让页面按名称引入或取用；不要在多个页面硬编码重复路径。

## 拿到接口文档后的对接流程

收到接口文档后，不要直接改页面，先做接口对齐。

如果这次对接属于一个新需求，或一个需要根因分析 / 跨文件改动 / 契约调整的较深 bug 修复，仍然先在 `docs/` 输出方案，再在 `dev-plan/` 输出任务 plan，等用户确认后再开始改 `api/*.uts` 和页面。

### 1. 先比对现状

同时阅读：

- 用户给的新接口文档
- `api_documents/OpsApp接口对照文档.md`
- `api_contract/项目页面流程与接口梳理.md`
- 对应业务的 `dev-plan/*.md`

先整理一张最小对照表，至少覆盖：

- 页面动作
- 实际接口路径
- 请求方法
- 请求参数
- 响应字段
- 字段名
- 字段类型
- 当前前端是否已有封装
- 是否存在路径差异或字段差异
- 是否仍然缺接口

如果新文档和旧 PRD 不一致，优先按最新可执行接口契约开发，同时把差异写回 plan 或注释语境中。

如果发现后端提供的接口字段与前端有差异或缺失，必须同时做两件事：

- 在 `docs/*.md` 方案文档中明确告诉用户，单独写出“字段差异 / 字段缺失”与影响
- 在 `dev-plan/*.md` 任务 plan 中把这些差异或缺失记录成明确的待完成任务或待完成子任务
- 如果这些差异或缺失归属于某个主任务，必须挂到该主任务下面；在对应子任务完成前，主任务不能标记完成

### 2. 先改 `api/*.uts`，再改页面

接口封装放在 `api/<domain>.uts`。

保持当前项目写法：

```uts
export function apiGetSomething(id : string) : Promise<ApiResult> {
  return request({
    url: '/system-core/v1/xxx?id=' + id,
    method: 'GET'
  } as UTSJSONObject)
}
```

约定如下：

- 使用 `request(...)`
- 返回 `Promise<ApiResult>`
- `GET` 参数手动拼接到 URL
- `POST` 参数通过 `data`
- 响应统一走 `res.code`、`res.message`、`res.data`

字段对齐是硬约束：

- 以后端接口文档为准，优先参考 `api_documents/OpsApp接口对照文档.md`
- 如果前端现有字段名与接口文档不一致，必须调整前端字段名
- 如果前端现有字段类型与接口文档不一致，必须调整前端字段类型
- 不允许为了兼容旧前端结构，在前端新增字段 rename 层、adapter 层、类型兜底层
- 不允许通过“先取后端字段，再转成前端自定义字段”来长期兼容
- 页面状态、表单字段、列表字段、详情字段、组件 props 命名都应直接贴后端契约

允许的只有展示层格式化，例如日期展示文案、状态文案、金额格式化；这类展示处理不属于字段映射。

联调日志要求：

- 只要是在做接口对接、联调、字段排查或返回结构确认，默认都要打印本次接口的联调日志。
- 日志至少包含三项：接口地址、请求参数、接口返回值。
- HBuilderX 控制台如果分三次 `console.log`，会显示成三条独立日志，不算“换行展示”。
- 因此默认必须使用单次 `console.log` 输出一个多行字符串，把三项内容放进同一条日志里。
- 推荐写法如下：

```uts
const paramsText = params != null ? JSON.stringify(params) : 'null'
const resText = res != null ? JSON.stringify(res) : 'null'
console.log(`接口：${url}\n入参：${paramsText}\n返回值：${resText}`)
```

- 如果 `JSON.stringify(...)` 在当前场景不可用或输出不理想，至少也要保证是单次打印的换行文本，不要退回三次独立 `console.log`，例如：

```uts
console.log(`接口：${url}\n入参：${params}\n返回值：${res}`)
```

- 这里的“接口地址”指最终请求 URL；“请求参数”指 query、body 或关键业务入参；“接口返回值”优先打印原始响应或足够排查问题的核心响应对象。
- 日志应尽量贴近具体接口调用位置，便于按单个接口快速增加和删除；不要为了临时联调把全局请求层改成长期噪音日志，除非用户明确要求。
- 这类日志默认视为临时联调日志，不属于最终交付的一部分。
- 当用户要求提交代码、分批提交或推送前，必须主动清理本次为联调新增的 `console.log`，再继续提交流程。
- 如果用户在当前线程明确回复“完成了”或“ok了”，且后续进入收尾或提交流程，也要先清理本次联调新增的 `console.log`。
- 清理范围仅限本次联调新增的临时打印；不要顺手删除用户原本就保留的日志或其他排查代码。

### 3. 识别特殊链路

遇到以下场景时，走项目现成工具，不要重造：

- 登录态和上下文：`utils/auth.uts`
- 能力拉取与路由守卫：`utils/capability-store.uts`、`utils/capability-guard.uts`
- 文件上传：`utils/upload.uts`
- 图片压缩：`compressImage(...)`
- 文件展示地址：`getFileUrl(...)`
- 通知连接：`utils/notify.uts`

上传类字段重点区分：

- 页面展示可能需要 `fileUrl`
- 表单提交往往需要 `objectKey`
- `ops-upload-box` 支持传入 `objectKey` 或可访问 URL

OCR 类接口优先在上传成功后立即回填，不要把识别逻辑散落在多个地方。

### 4. 再把页面数据流接起来

页面对接时，按这个顺序处理：

1. 初始化入参和页面参数
2. 加载列表或详情
3. 按后端字段结构直接回填页面状态；如果现有前端字段名或类型不一致，先改前端
4. 补齐提交、下一步、保存草稿、删除、切换等动作
5. 补空态、错误态、loading 态
6. 验证跳转参数、回填链路和返回链路

如果接口未返回页面必须字段，先标记契约缺口，不要私造字段兜底。

### 5. 最后更新计划文件

对接完成后，更新对应 `dev-plan/*.md`：

- 已完成的接口标记为 `[done]`
- 尚未完成的接口、字段差异或字段缺失保留待完成说明
- 把关键路径差异、字段差异、需要调整的前端字段对齐项写清楚
- 如果存在后端字段缺失，也要在 plan 中显式记录，不允许只在方案里提到
- 不写“前端映射兜底方案”，因为字段名和字段类型不一致时应直接调整前端

目标不是只改代码，而是让下次继续开发的人一眼看懂“现在哪些已打通，哪些还欠后端”。

## 编码约定

### 页面与组件

- 页面放 `pages/<domain>/<name>.uvue`
- 组件放 `components/primitives` 或 `components/domain`
- 统一使用 `<script setup lang="uts">`
- 优先小步复用，不复制粘贴大段页面

### 样式

- 优先使用 `uni.scss` token
- 保持当前橙色品牌方向
- 不引入外部样式系统
- 按设计稿统一样式时，仅重构 Layout；不要修改字体尺寸或功能逻辑
- 新增图标必须使用纯 SVG，禁止 SVG 内嵌 `<image>` 或位图数据

### 请求

- 基础封装在 `utils/request.uts`
- 当前 `BASE_URL` 与 `useMock` 以仓库现状为准，不擅自切换环境策略
- 新接口按业务域归类到现有 `api/*.uts`
- 接口字段名和字段类型以后端文档为准，不做前端字段映射适配

### 跳转与权限

- 受能力控制的页面，进入前要接能力守卫
- 从工作台入口进入的页面，通常要同步补 `capabilityEntryMappings`
- 新增页面如果不需要能力隔离，也要确认无需守卫，而不是遗漏

### 文档与计划

- 优先复用并更新已有 `dev-plan/*.md`
- 没有 plan 时再新增
- 所有需求都先在 `docs/` 产出方案文档
- 所有需求都要在 `dev-plan/` 产出任务 plan
- 涉及较深修复的 bug 也要先在 `docs/` 产出方案文档，再在 `dev-plan/` 产出任务 plan
- 未经用户确认“方案 + plan”，不进入代码实施
- 遇到接口缺口或文档差异，要写进 plan，而不是只留在对话里
- 遇到后端字段差异或字段缺失，要在方案里明确告诉用户，并同步记录到 plan

## 交付前检查清单

- [ ] 页面已在 `pages.json` 注册
- [ ] 如果新增 domain 组件，已更新 `pages.json` easycom 白名单
- [ ] 如果新增受控入口，已更新 `utils/capabilities.uts`
- [ ] 代码使用 `.uvue` + `lang="uts"`，没有混入不兼容写法
- [ ] 样式优先复用 `uni.scss` token
- [ ] 如果本次根据设计稿统一样式，只改 Layout，没有调整字体尺寸或功能逻辑
- [ ] 图标优先复用 `ops-icon` 与现有静态资源
- [ ] 如果本次新增图标，已使用纯 SVG，没有内嵌 `<image>`、base64 或位图资源
- [ ] 接口已落到正确的 `api/*.uts`
- [ ] 页面字段与后端响应字段一致
- [ ] 页面字段类型与后端接口文档一致
- [ ] 没有新增前端字段映射层、adapter 层或类型兜底层
- [ ] loading / empty / error / success 状态完整
- [ ] 上传、OCR、详情回填、提交链路已串通
- [ ] 相关 `dev-plan/*.md` 已更新
- [ ] 如果本次为接口联调新增了临时日志，在提交代码前已清理对应 `console.log`

## 遇到阻塞时的处理原则

如果发现以下问题，先停在“对齐契约”而不是硬写页面：

- 接口路径与文档不一致
- 页面依赖字段未返回
- 提交流程缺少关键接口
- 新组件命名会撞现有 easycom 映射
- 页面需要能力控制，但能力编码或入口映射未定义

此时优先输出：

1. 现状
2. 缺口
3. 建议的前端处理方式
4. 需要后端或产品补充的最小信息
