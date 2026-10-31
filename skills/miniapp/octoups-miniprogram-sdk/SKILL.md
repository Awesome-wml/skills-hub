---
name: octoups-miniprogram-sdk
description: >-
  Use when the task touches the generated C-end API SDK in
  `miniprogram/sdk/**`, OpenAPI cache files in `openapi/**`,
  `scripts/gen-sdk.mjs`, `orval.config.cjs`, or typed API integration
  decisions for the octoups-user WeChat miniprogram. Covers consuming generated
  clients safely, deciding whether to update `miniprogram/services/*.ts` vs SDK
  runtime or generator code, regenerating contracts, and handling DTO / type
  mismatches such as Long id precision issues.
---

# octoups-user：SDK / OpenAPI 工作流

## 什么时候用

以下请求直接使用本 skill：

- “看一下 `miniprogram/sdk` 该怎么接”
- “把这个 service 改成走类型化 SDK”
- “跑一下 `gen:sdk` / `gen:sdk:pull`”
- “OpenAPI 变了，重新生成一下 SDK”
- “orval 产物不对 / operationId 不对 / DTO 类型不对”
- “为什么 `Long id` 变成了 `number`”
- “修 `mutator.ts` / `gen-sdk.mjs` / `orval.config.cjs`”

## 同时启用

- 如果任务还会落到页面、组件、`services/*.ts`、docs / plan，同步加载
  `../octoups-miniprogram-dev/SKILL.md`
- 如果任务还会改 UI、适老化、TDesign、弹层或页面结构，同步加载
  `../octoups-miniapp-standards/SKILL.md`
- 如果任务在讨论 `catch`、错误提示、默认值兜底、资源失败回退，同时补读
  `../octoups-miniapp-standards/references/error-exposure.md`

## 开始前先判断是哪一类

优先先把任务归到下面 3 类之一：

- 消费型接入：业务代码要安全地用上生成 SDK
- 生成器 / runtime 改造：要改 `mutator.ts`、`gen-sdk.mjs`、`orval.config.cjs`
- 契约刷新 / 排障：要拉新 spec、重生成、定位 DTO / operationId / path 问题

任务类型不同，决定你是该改业务适配层，还是该改生成链路。

## 开始前必须建立上下文

至少先读这些文件里与当前任务直接相关的部分：

1. `miniprogram/sdk/README.md`
2. `miniprogram/sdk/mutator.ts`
3. `miniprogram/sdk/runtime.ts`
4. 目标生成文件，例如 `miniprogram/sdk/system-core/*.ts` 或
   `miniprogram/sdk/commerce-core/*.ts`
5. 目标模型文件，例如 `miniprogram/sdk/*/models/*.ts`
6. `scripts/gen-sdk.mjs`
7. `orval.config.cjs`
8. 如果要接业务链路，再读对应的 `miniprogram/services/*.ts`
9. 如果要判断请求层边界，再读 `miniprogram/utils/request.ts` 和
   `miniprogram/config/env.ts`

如果 `README` 和真实代码冲突，以运行时代码和生成脚本为准，不要盲信旧文档。

## 当前仓库的关键事实

- `miniprogram/sdk/system-core/*`、`miniprogram/sdk/commerce-core/*` 是 orval
  生成产物，默认不要手改
- `scripts/gen-sdk.mjs` 在重生成前会清空已有 service 目录，只保留手写的
  `miniprogram/sdk/mutator.ts`
- 生成链路只保留 `/c/*` 接口，只处理 `system-core` 和 `commerce-core`
  这两份 spec
- 当前仓库的业务主链路仍是 `miniprogram/services/*.ts` +
  `miniprogram/utils/request.ts`
- `request.ts` 会解包 `R<T>.data`，按 `system / commerce / marketing / bff`
  解析 baseURL，走统一的登录态清理逻辑，并默认把后端错误继续向上抛出
- `sdk/mutator.ts` 返回的是整包 `R<T>`，通过 `sdk/runtime.ts` 统一做 host
  推断、token 注入、登录态清理和错误透传；默认不在 runtime 层统一 Toast 或
  吞掉后端错误
- 如果要真正推广 SDK runtime，必须先确认 path 前缀到 host 的推断逻辑、
  显式 `baseURL` 传递方式，以及它与现有 service 边界是否对齐，而不是直接大面积
  替换现有 service

## 强约束

- 不要把页面 / 组件直接改成到处 import 生成 SDK，优先保留
  `page -> service -> request/sdk` 的边界
- 如果当前页面已经依赖 `services/*.ts`，优先让 service 作为业务适配层去包
  SDK，而不是直接暴露生成函数给视图层
- 不要在 `mutator.ts`、`runtime.ts`、`services/*.ts` 里把后端错误改写成
  “请求失败”“请稍后再试”这类统一文案，也不要 Toast 后吞错或兜底返回空数据；
  默认让后端问题直接暴露出来
- 如果 `catch` 只是为了关 loading、恢复按钮、回滚乐观更新，做完这些收尾后继续
  `throw` / `reject`，不要 `console.log` 一下就返回 `undefined` / `null` / `[]`
- 后端契约字段如果应为正常值却返回 `null` / `undefined`，不要在 service 或
  页面里用 `?? ''`、`|| []`、`|| {}`、默认 `0` / `false` / 占位 URL 去补齐
- 请求失败后，不要把页面直接切成默认空态或默认成功态；空态只对应“成功但为空”，
  失败仍应走 error 分支
- 后端返回的图片 URL 如果加载失败，也不要在 service、adapter、页面事件里自动
  改成默认头像、默认封面、默认商品图；这同样属于后端问题暴露范围
- 不要把 DTO / path / operationId 问题修在生成文件里；优先改
  OpenAPI、生成脚本、orval 配置或 `mutator.ts`
- `Long id` 如果被生成为 `number`，不要用 `as string` 强压过去；优先记录后端
  需要补 `@JsonFormat(shape = STRING)`
- 如果任务同时涉及 docs / plan，对应差异和阻塞项也要记进
  `docs/*.md`、`dev-plan/*.md`，不要只留在对话里

## 典型执行流程

### 1. 消费型接入

1. 先找当前页面对应的 `services/*.ts`
2. 再找 SDK 里是否已有对应 endpoint
3. 明确要不要保持现有 service API 不变
4. 如果接 SDK，优先在 service 内做 envelope 解包、字段映射和最小业务适配；
   后端错误默认继续透传，不要在这里收敛成默认值或统一提示文案；字段 `null` /
   `undefined`、坏图片 URL 也不要顺手兼容掉
   如果只需要做 UI 收尾，收尾后继续抛错，不要把 rejected promise 转回成功值
5. 页面和组件继续消费业务语义，不直接吃原始 `R<T>`

### 2. 契约刷新 / 重生成

1. 只想用本地缓存重生成时，跑 `npm run gen:sdk`
2. 需要从 dev 网关拉最新 spec 时，才跑 `npm run gen:sdk:pull`
3. 重生成后重点看 `openapi/**`、`miniprogram/sdk/**` 的 diff
4. 如果 diff 看起来像“手改内容丢了”，先确认那些改动是不是本来就不该落在
   生成目录里

### 3. 生成器 / runtime 改造

1. 优先改 `scripts/gen-sdk.mjs`、`orval.config.cjs`、`miniprogram/sdk/mutator.ts`
2. 改完后再重生成验证，不要只改脚本不跑产物
3. 如果问题来自 `/c/*` 过滤、operationId 改名、schema 裁剪，优先在
   `gen-sdk.mjs` 里收口
4. 如果问题来自返回值、鉴权 header、baseURL、登录态副作用或错误透传边界，
   优先在 `mutator.ts` / `runtime.ts` 里收口，不要新增统一 Toast 或吞错逻辑

## 高频判断题

- 页面只是要接真接口：优先改 `services/*.ts`，不要先改生成文件
- SDK 类型和业务展示字段不一致：优先在 service 或页面附近做视图转换
- endpoint 在后端有、SDK 里没有：先查是不是不在 `/c/*`，或不在当前拉取的
  service 列表里
- 生成函数签名奇怪：先看 `openapi/*.json` 和 `rewriteOperationIds(...)`
- 想统一走 SDK runtime：先确认 path 前缀到 host 的推断、token 存储和
  `request.ts` 的登录态行为是否已经对齐
- 后端接口一报错页面就想兜底继续跑：默认不要前端圆场，先把问题暴露出来并在
  方案 / plan / 台账里明确记录为后端问题
- 后端把必填字段回成 `null` / `undefined` 或把图片地址回成坏链：默认也不要做
  前端兼容，直接按后端契约问题记录和暴露

## 需要时再读

- 详细边界和检查清单：`references/runtime-and-boundaries.md`
- 错误暴露原则：`../octoups-miniapp-standards/references/error-exposure.md`
- 开发总控 workflow：`../octoups-miniprogram-dev/SKILL.md`
- 仓库通用实现规范：`../octoups-miniapp-standards/SKILL.md`
