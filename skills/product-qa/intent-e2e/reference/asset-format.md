# 资产格式

## e2e.config.yaml

```yaml
casesDir: cases                  # 用例目录（相对 e2e 根）
defaultEnv: uat                  # 未设置 E2E_ENV 时使用的环境
environments:
  uat:
    baseURL: https://uat.example.com
    allowWrite: false            # true 才执行 sideEffect: write 的用例
    aiData: allowed              # forbidden：探针拒绝启动
browser:                         # 可选
  channel: chromium              # chromium | chrome | msedge
mask:                            # 交给智能体与写入失败证据前的脱敏（正则）
  - { pattern: "1[3-9]\\d{9}", replace: "<手机号>" }
fixture:                         # 可选，见 fixture-protocol.md
  command: node e2e/fixture/index.mjs
secondOpinion:                   # 可选，默认关闭
  enabled: true                  # 分诊结论交 TypeSafe Jev 独立复核
noProxy:                         # 可选：这些域名不走本机代理（HTTP_PROXY 会让每个请求慢几秒）
  - .example.com
health:                          # 可选：页面健康检查，每条用例跑完自动执行
  codeField: code                # 响应体业务码字段，非 0 即失败；不配只看 HTTP 5xx
  apiHosts: [api.example.com]    # 只对自家接口查业务码，第三方接口码值约定不同
  errorToastSelector: .el-message--error   # 报错提示，出现过即失败
  badCellText: [undefined, NaN, "[object Object]"]   # 表格里不应出现的文本（默认即此）
```

页面健康检查不需要写进 `assert.yaml`，失败时报告里记为「页面健康检查」。以下不算失败：反例断言里写明预期的 `$.code`（如 40300），以及 intent 里 `constraints.allowApiCodes` 列出的码。关掉：`health.enabled: false`。

`secondOpinion` 开启后，`second-opinion.mjs` 会外发以下字段（全部先按 `mask` 脱敏）：用例目标、失败阶段、失败次数、失败时的网址、报错（去掉调用栈与本机路径，最多 1500 字）、页面结构（最多 3000 字）、最近 8 条接口摘要（每条最多 400 字）。不发截图、登录态、智能体的结论。需本机环境变量 `TYPESAFE_API_KEY`；当前环境 `aiData: forbidden` 时不发。

切换环境：`E2E_ENV=uat npm run e2e:run`。

## intent.yaml

```yaml
id: order-list-filter            # 必填，全项目唯一，英文短横线
target: web                      # web（默认）| miniprogram（暂未支持）
title: 订单列表按状态与单号筛选     # 必填
goal: |                          # 必填：业务目标，写清要操作什么、期望结果是什么
  在订单列表，订单状态选「已完成」，订单号输入「SO202610」后查询，
  列表只展示状态为已完成、且单号包含 SO202610 的订单。
precondition:
  login: { role: ops_admin }     # 登录态角色：Fixture 签发或 .auth/<role>.json
  data:                          # 可选：造数，结果以 data 参数传给 reach 脚本
    seed: completed_orders
    params: { count: 3 }
constraints:
  forbidden: [删除, 导出]         # 探索时不得点击的元素
  sideEffect: none               # none | write
```

## assert.yaml（人写或人确认）

YAML 列表，每条一个断言，`name` 和 `type` 必填。

### type: ui

| check | 必填字段 | 可选字段 | 通过条件 |
|---|---|---|---|
| `url_matches` | `pattern`（正则） | `timeout` | 当前 URL 匹配 |
| `text_visible` | `text` | `region`、`exact`、`timeout` | 区域内出现该文本 |
| `text_absent` | `text` | `region`、`exact`、`timeout` | 区域内不出现该文本 |
| `all_rows_text` | `column`，`equals` 或 `contains` 二选一 | `region`（默认 `{ role: table }`）、`min_rows`（默认 1） | 表格该列每一行都满足，且行数不少于 `min_rows` |
| `row_count` | `equals` / `min` / `max` 至少一个 | `region` | 表格数据行数满足（不含表头行） |

`region` 写法：`{ role: table, name: 订单 }`，取值来自探针 `snap` 的页面结构。

### type: api

断言**流程中页面实际收到的**接口响应，不额外发请求，所以不需要处理登录态。

```yaml
- name: 查询接口按条件返回已完成订单
  type: api
  match: { method: POST, path: /api/order/page }   # path 为包含匹配
  pick: last                                       # last（默认）| first | all
  expect:
    status: 200                                    # HTTP 状态码
    $.code: "200"                                  # 严格相等，类型也要一致
    $.data.records[*].status: { all: COMPLETED }
    $.data.records: { minLength: 1 }
    $.data.total: { type: number }
```

JSON 路径：`$.a.b`、`$.list[0].x`、`$.list[*].x`。

| 匹配写法 | 含义 |
|---|---|
| `值` / `{ equals: 值 }` | 严格相等（`"200"` 与 `200` 不相等） |
| `{ contains: 文本 }` | 字符串包含 |
| `{ matches: 正则 }` | 字符串匹配 |
| `{ oneOf: [a, b] }` | 属于其中之一 |
| `{ type: string }` | 类型为 string / number / boolean / object / array / null |
| `{ exists: true }` | 字段存在（false 为不存在） |
| `{ length: n }` / `{ minLength: n }` | 数组长度 |
| `{ all: 匹配 }` | `[*]` 取到的每个值都满足；空列表**不通过** |
| `{ any: 匹配 }` | 至少一个值满足 |

金额等字段如果约定返回字符串，用 `{ type: string }` 或带引号的值断言，可以同时发现「金额返回成数字」的问题。

## reach.spec.ts（智能体写）

```ts
import { reach } from '../../runtime/index';

reach('order-list-filter', async ({ page, data }) => {
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/order/page')),
    page.goto('/orders'),
  ]);
  await page.getByRole('combobox', { name: '订单状态' }).selectOption({ label: '已完成' });
  // ...
});
```

规则：不得 `expect`；不得直接用 `test`；不得用 CSS / XPath；`reach` 的 id 必须等于 intent 的 id。

## assert.lock

全部 `assert.yaml` 的内容指纹，由人执行 `npm run e2e:approve` 生成。守卫比对它判断断言是否在批准后被改过。随用例一起提交。
