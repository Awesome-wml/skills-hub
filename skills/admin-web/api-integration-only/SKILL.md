---
name: api-integration-only
description: |
  页面接口对接专用约束。用于列表/详情/表单/弹窗/抽屉对接后端 API、SDK、OpenAPI 时，只改请求、响应映射与字段绑定，禁止私自改动页面功能、样式、结构；必须直接消费 src/sdk 生成方法，禁止手写 apiClient/axios/URL 请求；所有字段严格以接口真实返回为准，不做兜底展示、不猜字段；接口缺失字段保持空态，并在交付说明与 docs/dev-plan 计划文档中汇总缺口。与 api-contract-strict 同时生效，字段规则以 api-contract-strict 为准。
---

# API Integration Only

## 适用场景

- 用户说「对接接口」「联调」「切 SDK」「接 API」，且页面 UI 已存在。
- 用户明确要求「只对接接口，不要动页面」。
- 列表 / 详情 / 表单 / 弹窗 / 抽屉已有结构，本轮只替换 mock、本地假数据或旧接口。

## 核心目标

**只对接接口，不改页面。**

本轮允许改动：

- `src/sdk/**` 生成方法的 import 与调用
- 现有 `src/api/*.ts` 适配层内的参数映射（仅做 page ↔ SDK 形状转换，底层 HTTP 仍走 SDK）
- 请求参数、提交 payload 与 SDK 契约对齐
- 响应字段到现有展示位的绑定
- loading / error 等与请求直接相关的最小状态

本轮禁止改动（除非用户明确要求）：

- 页面功能：按钮、操作、权限、路由、交互流程
- 页面样式：布局、间距、颜色、字号、圆角、列宽、占位文案
- 页面结构：DOM 层级、组件拆分、列顺序、区块顺序、新增/删除表单项或表格列
- 为「看起来完整」而补 UI、补 mock、补占位符、补 `-` 展示（除非页面原本就有该占位规则）
- 手写 HTTP 对接：`apiClient`、`axios`、`fetch`、硬编码 URL、`request({ url: ... })`、本地 mock 请求函数顶正式接口

## SDK 对接规则

**必须直接消费 SDK，禁止手写 API。**

1. 页面或适配层只能调用 `src/sdk/**` 下已生成的 SDK 方法，例如：
   - `import { storeList } from '/@/sdk/system-core/store-management'`
2. 禁止为了对接而新增或改写以下写法：
   - `apiClient.get/post/put/delete(...)`
   - `axios(...)`、`fetch(...)`
   - 手写 REST 路径，如 `'/fulfillment-core/...'`、`'/system-core/v1/...'`
   - 自造 `request({ url, method, data })` 封装
   - 继续保留 mock / 假请求函数冒充正式接口
3. 禁止手改 `src/sdk/**`、`openapi/**` 生成物；缺方法时先拉 SDK，不在生成物里补接口。
4. 若页面已有 `src/api/*.ts` 适配层，允许保留或微调该层，但适配层内部必须转调 SDK，不得自己发 HTTP。
5. SDK 方法缺失时的处理顺序：
   - 先执行 `corepack pnpm run gen:sdk:pull` 刷新远端 OpenAPI / SDK
   - 刷新后仍无对应方法：登记为阻塞项，不要手写 API 顶上
   - 在计划文档和交付说明里写清缺失的 SDK 方法名与期望路径

## 字段规则

字段对齐必须同时遵守 [`../api-contract-strict/SKILL.md`](../api-contract-strict/SKILL.md)：

- 后端 / SDK / OpenAPI 返回什么就用什么。
- 后端没返回的字段：`undefined`、空态、不展示或不提交；不要补 `''`、`0`、`[]`、`{}`、假 `Label`、近义字段、code 回退。
- 纯展示字典中文默认只读 `{field}Label`；没返回就先空着。
- 编辑态下拉、单选、远程选择仍绑定原 value/code，不用 `{field}Label` 做 `v-model`。

## 执行流程

### 1. 开工前冻结页面范围

1. 列出本轮涉及的页面、路由、文件。
2. 记录当前已有：表格列、筛选项、表单项、按钮、详情区块。
3. 明确写入计划文档：**本轮仅做接口对接，不调整功能 / 样式 / 结构**。

若已有对应 `docs/dev-plan/*.md`，先更新该文档；没有则新建。命名参考：

- `YYYY-MM-DD-{模块或页面}-接口对接计划.md`

### 2. 对照契约做字段清单

按页面现有展示位逐项核对 SDK / OpenAPI / 后端契约：

| 页面位置 | 页面当前字段名 | SDK/接口字段 | 状态 |
|---|---|---|---|
| 列表-状态列 | `statusLabel` | `statusLabel` | 已对齐 |
| 列表-奖品内容 | `detail.prizeContent` | 未声明 | 缺失，留空 |

状态只允许：`已对齐` / `缺失-留空` / `未对接-保持原状`。

### 3. 实施接口对接

- 先确认目标 SDK 方法与 DTO 已存在；不存在则先 `gen:sdk:pull`，仍缺失则停下，不要手写 API。
- 确认该方法是 PC 端调用的入口：同一业务在 PC 后台、BD App、店长 H5 往往有不同接口，字段相似不代表能混用。
- 页面层优先 import SDK；若项目已有 `src/api/*.ts` 薄适配层，可在适配层内转调 SDK，不在页面里直写 HTTP。
- 只改请求与字段绑定，不借对接之名重构页面。
- 发现页面字段在契约中不存在：保持空态，不要猜别名、不要换近义字段。
- 发现页面筛选项 / 提交字段在契约中不存在：不要假透传；若页面原本就有该控件，保留 UI 但不提交未声明参数，并登记为缺口。
- 若必须改结构才能对接，先停下来说明原因，等用户明确授权后再动结构。

### 4. 汇总缺失字段

对接完成后必须输出缺失字段汇总，并在计划文档中同步。

#### 交付说明模板

```markdown
## 接口对接结果

- 对接范围：[页面/路由]
- 已切换 SDK 方法：[storeList / storeDetail / ...]
- 页面功能 / 样式 / 结构：未改动
- 是否手写 API：否

## 缺失字段汇总

| 页面位置 | 期望字段 | 接口/SDK 状态 | 当前处理 |
|---|---|---|---|
| 列表-状态 | `statusLabel` | SDK 未声明 | 留空 |
| 详情-模板ID | `detail.templateId` | 运行时未返回 | 留空 |

## 后续追踪建议

- [ ] 后端补 `statusLabel`
- [ ] 后端补 `detail.templateId`
```

#### 计划文档必写章节

在 `docs/dev-plan/` 对应计划里至少包含：

```markdown
## 对接范围约束

- 本轮仅对接接口，不调整页面功能、样式、结构。
- 本轮禁止手写 API，统一消费 `src/sdk/**` 生成方法。

## API / SDK 映射

（列出 SDK 方法名、调用端、请求 DTO、响应 VO、payload 映射；不要写裸 URL 作为最终实现）

| SDK 方法 | 调用端 | 请求 DTO | 响应 VO | 备注 |
|---|---|---|---|---|
| storeList | PC | StorePageQuery | StorePageVO | 多端共用时写 `PC + APP` 并说明差异 |

## 缺失字段汇总

| 页面位置 | 期望字段 | 接口/SDK 状态 | 当前处理 |
|---|---|---|---|
| ... | ... | ... | 留空 |

## 风险 / 阻塞

- 以上缺失字段需后端补契约后二次对齐。
```

缺口分两类写清楚：

1. **目标展示缺失**：页面本来要展示，但 SDK / 接口未声明或未返回。
2. **页面历史字段未声明**：页面旧代码用过，但当前契约里没有，本轮不再继续消费。

### 5. 交付前自检

- [ ] 是否只改了接口相关代码，没有顺手改 UI / 样式 / 结构？
- [ ] 是否全部走 `src/sdk/**`，没有新增 `apiClient` / `axios` / 手写 URL？
- [ ] 若 SDK 缺失，是否先 `gen:sdk:pull`，而不是手写 API 顶上？
- [ ] 是否没有任何字段兜底、猜字段、近义替代？
- [ ] 缺失字段是否已在回复里汇总给用户？
- [ ] 缺失字段是否已写入 `docs/dev-plan/` 计划文档？
- [ ] 是否遵守了 `api-contract-strict`？
- [ ] 对接的 SDK 方法是否是 PC 端入口接口（同一业务的 BD App / 店长 H5 接口往往不同），映射表是否标了「调用端」？
- [ ] 状态文案是否读 `{field}Label`，没有为「看起来完整」在前端补 code→中文 map？

## 与其他 skill 的关系

| Skill | 关系 |
|---|---|
| `api-contract-strict` | 字段规则以它为准；本 skill 负责范围冻结与缺口追踪 |
| `schema-crud` / `detail-page` | 页面已存在时优先本 skill；新建页面时才用页面 skill |
| `octopus-admin-frontend-bootstrap` | 开工前先读 AGENTS.md，计划文档先于代码 |
| `ledger-entry` | 实施完成后写 ledger；缺口统计写在 dev-plan |

## 禁止示例

```ts
// 禁止：手写 HTTP
await apiClient.get('/fulfillment-core/exception/negative-inventory/list', { params })
await axios.post('/system-core/v1/store/list', payload)

// 禁止：mock 顶正式接口
async function fetchStoreList(params) {
  return mockStoreList
}

// 禁止：对接时顺手改列顺序、删按钮、改样式 class
// 禁止：猜字段
const prizeContent = row.prizeAmount || row.prizeName
// 禁止：缺失字段用 '-' 或 mock 顶上（页面原本没有该规则时）
const statusText = row.statusLabel || row.status || '-'
// 禁止：静默兜底
const list = res.data?.list || []
```

## 允许示例

```ts
// 页面或 src/api 适配层直接调 SDK
import { exceptionNegativeInventoryList } from '/@/sdk/fulfillment-core/negative-inventory'

const { data } = await exceptionNegativeInventoryList(params)
const list = data?.list
const total = data?.total

// 适配层只做参数映射，底层仍走 SDK
export function getStorePage(params: StorePageParams) {
  return storeList({ query: params })
}

// 契约没有的字段保持 undefined / 空态
const statusText = row.statusLabel
```
