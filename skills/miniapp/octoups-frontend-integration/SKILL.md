---
name: octoups-frontend-integration
description: >-
  Use when the task is front-end API integration, joint debugging, backend
  issue triage, or writing backend issues for the `octoups-user` WeChat
  miniprogram and related `octopus-cloud` services. Covers deciding whether a
  problem is front-end, backend, contract, or environment; collecting evidence
  from pages, services, SDK, and docs; and drafting or creating backend issues
  without masking server problems with front-end fallbacks.
---

# octoups-user: 前端联调 / 后端问题 workflow

## 什么时候用

以下请求直接使用本 skill：

- “开始联调”
- “这个接口报错了，看看是前端还是后端”
- “后端字段不对 / 少字段 / 500 了”
- “帮我写一个后端 issue”
- “把 mock 页面接成真接口并标清阻塞”
- “梳理当前前端还能继续做什么，哪些得提后端”

如果任务核心是“前端接后端、判断责任边界、沉淀 issue、继续推进可做部分”，就先走本 skill。

## 同时启用

- 如果要改页面、组件、service、docs、plan，先加载 `../octoups-miniprogram-dev/SKILL.md`
- 如果涉及 `miniprogram/sdk/**`、`openapi/**`、生成 SDK 或 DTO 判断，再加载
  `../octoups-miniprogram-sdk/SKILL.md`
- 如果还会动 UI、状态、错误态或适老模式，再加载 `../octoups-miniapp-standards/SKILL.md`
- 写 issue 时，再读 `references/backend-issue-template.md`

## 目标

- 帮前端把联调工作持续往前推，而不是在“像后端问题”和“像前端问题”之间空转
- 后端问题要被清楚暴露、记录、提单，而不是被前端默认值、空态或假成功盖住
- 每个阻塞项至少要形成下面产物中的一个：
  - 方案 / 排查文档
  - task plan / 待完成项
  - 实施台账记录
  - 后端 issue 草稿或正式 issue

## 开始前必须建立上下文

至少先读与当前链路直接相关的内容，不要跳读：

1. 目标页面四件套：`.json`、`.ts`、`.wxml`、`.wxss`
2. 对应 `miniprogram/services/*.ts`
3. `miniprogram/utils/request.ts`、`miniprogram/utils/auth-store.ts`
4. `miniprogram/config/env.ts`
5. 如果走 SDK，再读：
   - `miniprogram/sdk/README.md`
   - `miniprogram/sdk/mutator.ts`
   - `miniprogram/sdk/runtime.ts`
   - 目标生成文件
   - `openapi/*.json`
6. 相关文档：
   - `docs/小程序前端对接-实施台账.md`
   - `docs/20260425-前端接口待办清单.md`
   - `docs/小程序联调与接口总册.md`
   - `docs/20260423-本地联调-host覆盖说明.md`
   - 当前任务对应的最新方案 / plan
7. 如需确认后端模块归属，再看 `../octopus-cloud/README.md` 与相关模块 `README.md`

## 先判断问题属于哪类

优先归类为以下 5 类之一：

1. 前端实现问题
2. 后端运行时问题
3. 契约 / OpenAPI / SDK 漂移问题
4. 环境 / host / 鉴权 / 网关问题
5. 混合问题

判断规则：

- 页面逻辑、字段映射、状态分支写错，属于前端实现问题
- 接口 4xx/5xx、成功语义错误、字段缺失、字段类型非法、图片链接坏链，默认先按后端问题记录
- OpenAPI 写了但现网不通，或现网有字段但 SDK / DTO 没声明，属于契约漂移
- 本地 host、token、灰度环境、网关转发不同步，属于环境问题
- 如果前端能先做一部分收口，但剩余闭环仍依赖后端，就按混合问题处理，既推进前端，也提后端 issue

## 联调证据清单

每次排查至少要收集这些信息：

1. 页面入口和操作路径
2. 请求方法、路径、base、query、body
3. 所在环境和 host 来源
4. 是否依赖登录态 / 当前 token 状态
5. 实际返回、报错文案或缺失字段
6. 预期行为或预期字段语义
7. 预期依据来自哪里：
   - 设计稿
   - 冻结表
   - OpenAPI
   - 已工作的相邻页面
   - 产品口径
8. 当前前端是否已有临时占位 / stub / fallback

没有证据时，不要轻易说“就是后端问题”或“就是前端问题”。

## 硬约束

- 不要为了“先跑起来”把后端错误吞成空数组、空对象、默认 0、默认 false、占位图或假成功
- 后端字段缺失、字段为 `null` / `undefined`、返回 500、资源 URL 坏链，都要明确记录为后端问题
- 不要手改生成 SDK 产物来伪造“契约已经稳定”
- 后端阻塞项不能只停留在聊天里，至少要落到文档、plan、台账或 issue
- 只要主链路仍待后端补齐，对应主任务就不能标记为完成

## 输出要求

### 如果是前端问题

- 修前端
- 同步更新方案 / plan / 台账
- 说明为什么不是后端问题

### 如果是后端问题

- 写清楚问题现象、复现步骤、真实请求口径、受影响页面
- 默认产出 issue 草稿
- 如果用户明确要提单，就先查重，再创建正式 issue

### 如果是混合问题

- 先把前端可独立完成的部分继续推进
- 不能圆掉后端缺口
- 把剩余阻塞拆成可追踪的后端 issue 或待完成项

## 后端 issue workflow

1. 先在后端仓库查重，避免重复提单
2. 用 `references/backend-issue-template.md` 起草
3. 标明：
   - 哪个服务 / 模块
   - 哪个接口 / 字段
   - 复现步骤
   - 实际结果
   - 预期结果
   - 对前端的具体阻塞
4. 如果用户要求正式提单，再创建 issue
5. 把 issue 号或草稿路径回写到当前文档 / plan / 台账

## Git / PR 约定

- `git commit` 的提交信息默认使用中文
- PR 标题、PR 描述默认使用中文
- 提交信息尽量短，说明这次修了什么，例如：
  - `修复：优惠券结算可用券对接`
  - `收口：积分摘要字段口径`
- PR 默认合到 `dev`
- 如果用户没有特别说明，不要改成其他 base 分支
- PR 描述里要写清：
  - 做了什么
  - 验证了什么
  - 还剩哪些待办

## 常见判断题

- 页面能展示，但靠 stub / 本地伪数据跑通：不算联调完成
- 页面请求成功，但字段缺失导致只能拼占位文案：属于后端契约问题
- SDK 里没有接口，但页面能用手写 request 打通：仍需记录契约漂移
- OpenAPI 有接口，但后端 dev 环境没挂路由：按后端 / 环境问题记录，别只怪前端 SDK
- 用户说“先让我继续做前端”，可以先做前端可独立部分，但不能把未解阻塞说成 done
