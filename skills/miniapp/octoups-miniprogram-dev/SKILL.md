---
name: octoups-miniprogram-dev
description: >-
  Use when the user asks to add, modify, refactor, debug, or integrate features
  in the octoups-user WeChat miniprogram, including `miniprogram/pages/**`,
  `miniprogram/pkg-*/**`, `miniprogram/components/**`,
  `miniprogram/services/*.ts`, `miniprogram/utils/*.ts`,
  `miniprogram/app.json`, `miniprogram/custom-tab-bar/**`, or related docs and
  plans. This skill requires reading the relevant code first, then writing or
  updating a solution doc under `docs/`, then writing or updating a task plan
  under `dev-plan/`, and waiting for user confirmation before implementing
  business code. When scope is broad, it must be split into main tasks and
  subtasks to avoid coarse one-shot execution.
---

# octoups-user: 开发总控 workflow

## 什么时候用

以下请求直接使用本 skill：

- “给这个小程序加一个新页面 / 新功能”
- “修一下这个页面 / 组件 / 接口”
- “把 mock 页面接成真实接口”
- “改路由、分包、tabBar、自定义导航、登录守卫”
- “做一个这个项目专用的前端开发方案”
- “这个需求比较大，先拆任务再做”

如果任务落在 `miniprogram/` 代码、项目开发流程、对接计划、回归收口上，而不是单纯图标同步或纯设计稿编辑，就先走本 skill。

## 同时启用

- 先加载 `../octoups-miniapp-standards/SKILL.md`
- 如果任务涉及 `catch`、错误提示、默认值兜底、空态 / 错误态切换、图片或文件坏链，
  再补读 `../octoups-miniapp-standards/references/error-exposure.md`
- 如果用户给的是截图、PNG、设计稿，要再加载 `../octoups-screenshot-to-spec/SKILL.md`
- 如果 `octoups-user-results.pen` 已确认，准备落真实代码，要再加载 `../octoups-spec-to-code/SKILL.md`
- 如果任务是 iconfont / 阿里图标同步，要再加载 `../octoups-iconfont/SKILL.md`
- 如果任务涉及 `miniprogram/sdk/**`、`openapi/**`、`scripts/gen-sdk.mjs`、
  `orval.config.cjs`、类型化接口接入、SDK 重生成或 DTO / 契约差异，要再加载
  `../octoups-miniprogram-sdk/SKILL.md`

本 skill 负责“任务准入、分析、方案、计划、拆分、收口”，不替代上面这些实现型 skill。

## 项目事实

- 技术栈是原生微信小程序 + TypeScript + glass-easel + `tdesign-miniprogram`
- 主业务代码都在 `miniprogram/`
- 页面分为主包 `miniprogram/pages/*` 和分包 `miniprogram/pkg-*/*`
- 业务组件主要在 `miniprogram/components/*`，直播域还有 `miniprogram/pkg-live/components/*`
- 服务层统一放在 `miniprogram/services/*.ts`
- 通用请求、登录态、守卫、工具放在 `miniprogram/utils/*.ts`
- 路由注册文件是 `miniprogram/app.json`，不是 `pages.json`
- 这个仓库没有 easycom；每个页面 / 组件都要在自己的 `.json` 里声明 `usingComponents`
- 全局样式 token 在 `miniprogram/styles/theme.wxss`，全局基础样式在 `miniprogram/app.wxss`
- 默认显示模式是 `elderly`，来源于 `miniprogram/app.ts`
- 适老切换主要靠页面根节点 `{{mode}}` + token 覆写，不是复制两套页面
- `miniprogram/custom-tab-bar`、`t-popup` 里的弹层、以及一些样式隔离组件，可能吃不到页面根 `.elderly`，只有这类场景才考虑显式传 `mode`
- 接口总线已经收敛到 `miniprogram/utils/request.ts`，支持 `system / commerce / marketing / bff` 四类 base、401/40100 清态、Token 注入和流式请求
- `miniprogram/sdk/**` 是 orval 生成的 C 端 contract layer；`system-core/` 和
  `commerce-core/` 目录默认视为可再生产物，不要手改，稳定手写入口只有
  `miniprogram/sdk/mutator.ts`
- 当前业务主链路仍以 `miniprogram/services/*.ts` + `miniprogram/utils/request.ts`
  为主；`request.ts` 会解包 `R<T>.data`，而 `sdk/mutator.ts` 返回整包 `R<T>`，
  baseURL / 鉴权 / 返回值边界也不同，接入前必须先定边界；但两条链路默认都不应
  吞掉后端错误或改写成前端兜底成功
- 登录保护统一走 `miniprogram/utils/auth-guard.ts` 的 `requireLogin(...)`
- 现有长期对接台账是 `docs/小程序前端对接-实施台账.md`

## 强制工作流

无论是需求、bug、接口对接还是重构，都按这个顺序执行：

1. 判断任务类型，并阅读相关代码与文档
2. 输出或更新 `docs/` 下的方案文档
3. 输出或更新 `dev-plan/` 下的任务 plan
4. 如果范围大，先拆成主任务 + 子任务
5. 等待用户确认方案和 plan
6. 用户同意后，再进入真实代码修改
7. 修改后补验证、补计划状态、补实施台账

这是强约束：

- 用户直接说“改代码”时，也不能跳过方案和 plan
- 用户直接说“修 bug”时，也不能直接修；先分析根因，再写方案和 plan
- 如果发现方案要调整，先更新 `docs/*.md` 和 `dev-plan/*.md`，再继续开发
- 如果任务已经有对应文档，优先更新原文，不重复新建

## 长期文档写入规则

- `docs/小程序前端对接-实施台账.md` 内容很长，完成记录只在文件末尾追加。
- 读取该文件时只看末尾，例如 `tail -n 80 docs/小程序前端对接-实施台账.md`；不要从文件开头读完整内容。
- 不要在实施台账中间查找历史长段落、批次总览或“补充进展”的插入点，也不要用全文 `rg` / `sed` 为追加记录定位中间位置。
- 后续只在文件末尾追加一行极简索引，不再追加长段落；如末尾没有极简索引区，先在文件末尾新建该区。
- 极简索引格式：`- YYYY-MM-DD CST | P域 | 结论不超过 30 字 | 验证: 通过/阻塞简述 | 详: docs/..., dev-plan/...`
- 总台账不要写实现细节、完整自检输出、长路径列表、后端字段长表或 issue 草稿正文；这些内容写到对应业务分册、方案文档和 `dev-plan/*.md`。
- 业务分册也永远只在文件末尾追加；读取分册时优先 `tail -n 120 docs/小程序前端对接-*.md`，不要为补记录去中间找插入点。
- 不要回改业务分册中间的状态表、任务表、历史“补充进展”段落或旧归档维护段；状态变化用末尾新追加记录说明。
- 方案文档和 `dev-plan/*.md` 仍按相关任务正常更新，并承接完整背景、代码细节、自检结果和阻塞项。

## Git / PR 强制约束

- 在本仓库执行 `git commit` 时，提交说明必须使用中文，不要使用英文标题
- 提交说明优先写成简短中文动作，例如：`功能：...`、`修复：...`、`文档：...`
- 除非用户明确指定其他目标分支，创建 PR 时默认目标分支必须是 `dev`
- 如果本轮做了多个独立可验证的小任务，优先拆成多个中文提交，再统一推分支和提 PR

## 确认前允许与禁止

确认前允许：

- 阅读代码、文档、接口说明、现有 skill、规则文件
- 必要的只读排查和低风险复现
- 新建或更新 `docs/*.md`
- 新建或更新 `dev-plan/*.md`

确认前禁止：

- 修改业务代码
- 新增或修改页面、组件、service、utils 业务逻辑
- 修改 `miniprogram/app.json`、`miniprogram/custom-tab-bar/*`、页面 `.json` 的组件注册
- 直接开始联调或“顺手把代码一起改了”

## 开始前必须建立上下文

至少先读这些文件中与当前任务直接相关的部分：

1. `miniprogram/app.json`
2. 目标页面的四件套：`.json`、`.ts`、`.wxml`、`.wxss`
3. 相关复用组件：`miniprogram/components/*`，以及直播域的 `miniprogram/pkg-live/components/*`
4. 对应 service：`miniprogram/services/*.ts`
5. 请求与登录相关：`miniprogram/utils/request.ts`、`auth-store.ts`、`auth-guard.ts`
6. 如果任务涉及 `sdk` / `OpenAPI`，再读 `miniprogram/sdk/README.md`、
   `miniprogram/sdk/mutator.ts`、`miniprogram/sdk/runtime.ts`、目标生成文件、`openapi/*.json`、
   `scripts/gen-sdk.mjs`、`orval.config.cjs`
7. 其他配套 utils：例如 `store-selection.ts`、`money.ts`、`time.ts`、`protocol.ts`
8. 设计 token 和全局样式：`miniprogram/styles/theme.wxss`、`miniprogram/app.wxss`
9. 设计系统与组件审计：`miniprogram/DESIGN_SYSTEM.md`、`miniprogram/COMPONENT_AUDIT.md`
10. 相关业务文档：`docs/小程序前端对接-*.md`
11. 长期进度台账：`docs/小程序前端对接-实施台账.md`
12. 如果任务已存在计划，继续更新 `dev-plan/*.md`

不要凭印象套 Vue Web、uni-app x、React Native 的做法。

## 先判断任务属于哪类

优先把任务归到下列类型之一：

- 新页面
- 页面改版或交互调整
- 新组件 / 组件重构
- service / 接口对接
- 路由 / 分包 / tabBar 调整
- 登录态、守卫、全局工具改造
- sdk / OpenAPI / 契约同步
- bug 修复
- 设计稿驱动的规范补齐
- 已确认结果稿的代码落地

不同类型决定后续要补读哪一个 skill 和哪些仓库文件。

## 方案文档要求

方案文档统一放在 `docs/` 下。

默认命名建议：

- 新需求：`docs/YYYYMMDD-模块名-开发方案.md`
- Bug：`docs/YYYYMMDD-模块名-bug修复方案.md`
- 大型改造：`docs/YYYYMMDD-模块名-重构方案.md`

最少包含：

- 背景与目标
- 当前现状
- 相关代码与事实依据
- 后端接口字段差异 / 缺失记录
- 方案说明
- 涉及页面 / 组件 / service / utils / 路由 / 结果稿
- 风险与影响范围
- 待确认项
- 实施步骤

Bug 方案额外要写：

- 问题现象
- 复现路径
- 根因分析
- 回归点

接口契约补充规则：

- 如果后端提供的字段和前端现状不一致，必须在方案里明确写出差异
- 如果后端缺少前端当前链路所需字段，也必须在方案里明确写出缺口
- 如果后端接口直接报错、字段非法或返回语义不成立，默认记录为后端问题，不要先
  用前端空数据 / 默认值把问题盖住再当成“已对接”
- 如果后端把应有字段回成 `null` / `undefined`，或把图片 / 文件 URL 回成坏链，
  也要按后端契约问题单独记录，不要写成“前端已兼容”
- 这些差异和缺口要写成可追踪条目，而不是只写一句“待后端确认”
- 方案里要同时写清楚：当前前端怎么处理、后续还需要补完什么

## 任务 plan 要求

任务 plan 统一放在 `dev-plan/` 下。

默认命名建议：

- `dev-plan/YYYYMMDD-模块名-plan.md`

plan 至少包含：

- 任务目标
- 对应方案文档路径
- 任务拆分
- 涉及文件
- 每个任务的验证方式
- 风险 / 阻塞项
- 接口字段差异 / 缺失对应的待完成项
- 完成记录

plan 是开发前产物，不是开发后补记。

任务状态补充规则：

- 后端接口字段差异或字段缺失，不能只丢到“阻塞项”里
- 这类问题必须在 plan 里落成具体的“待完成项”或独立子任务，方便后续逐条完结
- 如果接口差异影响某个主任务的闭环，主任务不能标记为 `done` / `已完成`
- 主任务只有在其全部子任务都完成后，才能更新为完成
- 子任务未完成、待后端补字段、待二次联调收口，这些都意味着对应主任务仍然处于未完成状态

## 范围过大时必须拆主任务 + 子任务

出现下面任一情况，就不要只写一条粗放任务，必须拆分：

- 同时涉及页面、组件、service、route、utils 中的三类及以上
- 同时跨两个及以上业务域，例如商城 + 订单、直播 + 支付
- 预计会改动 6 个以上文件
- 需要先对齐接口、再改 UI、再补状态和回流
- 任务内存在需要持续追踪的契约差异、结果稿确认项或组件边界收敛项

拆分规则：

- 先写主任务，描述一个完整可交付目标
- 主任务下面拆 2-6 个子任务，每个子任务只负责一个稳定目标
- 子任务必须能单独验证，不要出现“全部开发完成”这种空泛描述
- UI、数据流、交互、回流、验证可以拆成不同子任务
- 接口字段差异 / 缺失要拆成明确子任务或待完成项，不要只写进 `blocked`
- 主任务状态要由子任务状态汇总得出；只要还有一个子任务未完成，主任务就不能完成

推荐粒度示例：

- 主任务：订单确认页接真接口并补配送方式切换
- 子任务 1：整理确认页现状和接口差异
- 子任务 2：补 `services/order.ts` 试算 / 创建下单字段
- 子任务 3：接地址 / 门店选择回流
- 子任务 4：记录后端缺失字段并整理成待完成项
- 子任务 5：补 loading / empty / error / submit 状态
- 子任务 6：更新台账和回归验证

不推荐：

- “改订单确认页”
- “联调整个商城链路”
- “把所有页面都接成真实接口”

## 新页面 / 新分包页流程

以下流程只在“方案 + plan 已确认”后执行。

1. 先判断页面归属：主包 `pages/*` 还是分包 `pkg-*/*`
2. 在 `miniprogram/app.json` 注册页面或分包路由
3. 补页面四件套：`.json`、`.ts`、`.wxml`、`.wxss`
4. 如果需要自定义导航，页面 `.json` 配 `navigationStyle: "custom"`，并在 `usingComponents` 声明 `t-navbar`
5. 如果只是普通导航栏，不要硬上自定义头部
6. 如果改动底部 Tab，只在用户明确要求时动 `miniprogram/custom-tab-bar/*`
7. 页面数据层要按现有模式接 `mode`、导航高度、登录守卫、空态 / 错误态 / loading 态

注意：

- 本项目 tabBar 目前只有首页、Ai 管家、我的
- 不要把“新页面”误写成“新组件”
- route 改动后要跑 `npm run check`

## 新组件 / 组件重构流程

1. 优先复用 TDesign，再复用现有业务组件，最后才新建页面私有结构
2. 通用业务组件优先放 `miniprogram/components/*`
3. 仅直播域内部复用的组件可放 `miniprogram/pkg-live/components/*`
4. 组件文件保持小程序标准四件套
5. 在引用方 `.json` 里显式补 `usingComponents`
6. 组件交互优先走 `properties` + `triggerEvent`
7. 不要把整页结构塞成一个超大组件

## service / 接口对接流程

1. 接口封装统一写在 `miniprogram/services/*.ts`
2. 页面和组件不要直接写 `wx.request`
3. 统一走 `request<T>(...)`
4. `GET` 查询参数沿用当前仓库模式：手动 `encodeURIComponent(...)` 后拼 URL
5. `POST` / `PUT` 类请求通过 `data`
6. 需要跳过登录态时用 `skipAuth`
7. 需要幂等的动作走 `genKey(...)`
8. 后端字段尽量保持原名，视图层转换放在页面 / 组件附近
9. 如果接口属于长期对接链路，开发后同步更新 `docs/小程序前端对接-实施台账.md`
10. 如果用到 `miniprogram/sdk/**`，优先让 `services/*.ts` 充当业务适配层，
    不要在页面 / 组件里直接散落生成 SDK 调用
11. 接口报错、字段缺失、契约不成立、资源坏链时，不要把错误态降级成空态、
    默认值态或默认图片态；允许做 loading / disabled 收尾，但失败仍要继续暴露

## 登录态 / 守卫 / 全局链路规则

- 需要登录的操作统一走 `requireLogin(...)`
- 不要在每个页面散落手搓登录弹窗逻辑
- 登录态读写统一走 `auth-store.ts`
- 鉴权失败和 401/40100 清态已经在 `request.ts` 里做了，不要重复造一层
- 协议页、手机号绑定、设置页、订单流等已有基础能力，优先复用

## 样式与视觉规则

- 永远优先使用 `miniprogram/styles/theme.wxss` 的 token
- 页面底色默认是 `var(--color-bg-page)`，信息承载默认是白卡
- 主品牌强调色是 `var(--color-brand)`，不要自行发明新的主色体系
- 正文 / 主信息 / 表单 / 操作文案优先用 `--font-body`
- caption / hint / 次级说明用 `--font-small`
- 不要把主阅读信息挂到 `--font-small`
- 新样式先看是否已有业务组件和 token 能承接，再决定是否新增私有 class
- TDesign 优先通过 token 和 `t-class` 扩展，不要先写大段覆盖

## 适老模式规则

- 默认先相信全局 `mode + token` 机制能解决问题
- 页面根节点通常写 `class="xxx {{mode}}"`
- 如果组件仍在页面根节点内，先检查是不是写死字号 / 圆角 / 间距
- 只有弹层、`custom-tab-bar`、隔离组件等无法继承页面变量时，才加组件级 `mode`
- 不要看到适老问题就给所有组件都加 `mode` 或 `elderly` props

## 与设计稿 / 结果稿的边界

- 如果任务从截图开始，不要直接写代码，先转到 `octoups-screenshot-to-spec`
- 如果结果稿已经确认，先按 `octoups-spec-to-code` 做 spec -> code diff，再落代码
- 不要跳过 `octoups-user-spec.lib.pen` 和 `octoups-user-results.pen` 的既有流程

## 开发后必须补的内容

至少完成这些收口：

- 更新对应 `dev-plan/*.md` 的状态和完成记录
- 在对应业务分册末尾追加完成记录；如果是接口对接批次，再在 `docs/小程序前端对接-实施台账.md` 末尾追加一行极简索引
- 如果改了路由，执行 `npm run check`
- 尽量执行 `npx tsc --noEmit`
- 补齐关键页面的 loading / empty / error / success / disabled 状态说明；
  请求失败要落在 `error`，不要伪装成 `empty` / `success`
- 如果有阻塞项，明确写入方案或 plan，不要只留在对话里

## 高频反模式

- 还没读代码，就按别的框架习惯直接开改
- 把 `miniprogram/app.json` 当成 `pages.json`
- 忘记在页面 / 组件 `.json` 里注册 `usingComponents`
- 页面里直接写 `wx.request`
- 手改 `miniprogram/sdk/system-core/*`、`commerce-core/*` 这类可再生文件
- 需求很大，却只写“改这个页面”一条粗任务
- 结果稿还没确认，就先改真实代码
- 明明是 token 没接上，却复制两套适老样式
- 为了“页面先跑起来”，在 page / service / adapter 里到处补 `?? []`、`|| ''`、
  默认图、空对象或吞错 `catch`
- 对接结束后不更新 `dev-plan` 和实施台账

## 需要时再读

- 仓库通用实现规范：`../octoups-miniapp-standards/SKILL.md`
- 截图补规范流程：`../octoups-screenshot-to-spec/SKILL.md`
- 结果稿落代码流程：`../octoups-spec-to-code/SKILL.md`
- SDK / OpenAPI 工作流：`../octoups-miniprogram-sdk/SKILL.md`
- 设计系统：`miniprogram/DESIGN_SYSTEM.md`
- 组件审计：`miniprogram/COMPONENT_AUDIT.md`
- 长期对接台账：`docs/小程序前端对接-实施台账.md`
