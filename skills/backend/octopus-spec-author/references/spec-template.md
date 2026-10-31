---
date: YYYY-MM-DD
owner: <作者花名>
status: draft            # draft | reviewing | approved
anchors:                 # 至少一个；类全限定名 / HTTP 路径 / 页面按钮路径
  - <e.g. cn.org.lengfenghl.laowang.commerce.core.v1.payment.application.PaymentAppService#createOrder>
  - <e.g. POST /agreement/submit>
  - <e.g. 门店管理 → 门店详情 → 绑定 BD 按钮>
domains_touched: []      # 见 domain-index.yaml domains.* 列表
new_invariant: false     # 本 spec 是否引入新的领域不变量
new_extension_point: false # 本 spec 是否新增扩展点 / starter
cross_domain_combo_seen_before: true  # 本次跨域组合在 specs/ 历史中是否出现过
spec_color: green        # 自动派生：任一红线触发 = red；全绿 = green。开发可主动从 green 改 red，禁止反向
related_specs:           # 引用过的历史 spec 路径
  - docs/superpowers/specs/<...>.md
---

# <Topic>

> 一句话目标（≤ 30 字，写完整 spec 后回填）

---

## 上层 · 领域契约

### 1. 业务背景
- 产品诉求原文 / 原型链接：
- 触发场景：
- 不做什么（非目标）：

### 2. 涉及域与不变量

**涉及域**（来自 frontmatter `domains_touched`）：

**必须遵守的不变量**（自动从 domain-index `common_invariants` 注入；开发不得删除，不适用须显式标注理由）：

- [ ] <invariant 1 from domain-index>
- [ ] <invariant 2 from domain-index>
- [ ] <invariant 3 from domain-index>

**本 spec 新引入的不变量**（如有，frontmatter `new_invariant` 必须为 true）：
- _（无 / 列出）_

### 3. 状态机变更
- 涉及聚合根 / 状态字段：
- 状态流转图（变更前 → 变更后）：

```
( 变更前 )
state A → state B

( 变更后 )
state A → state B → state C
```

- 状态守护规则（哪些状态禁止转入 / 转出）：

### 4. 事件契约
- 复用的现有 domain event：
- 新增的 domain event（含 schema、发布时机、订阅方影响）：
- 是否需要补偿 / 重放策略：

### 5. 数据边界
- 涉及表（含 schema 前缀，如 `oms_xxx` / `wms_xxx`）：
- 新增字段 / 索引 / DDL：
- 是否跨 schema 写：
- 数据迁移 / 回填：

### 6. 风险与确认项

> **@PM确认 行文要求**：一律中文 + 业务视角；**不得**出现类名、方法名、字段名、表名、接口名、enum、注解等代码符号；英文仅保留产品侧通用缩写（SKU / VIP / APP 等）。若问题离开代码语境就说不清楚 → 本质是架构问题，改标 `@架构确认`。
>
> **条数建议**：`@PM确认` + `@架构确认` 合计 ≤ 10 条。超过时按 guide「步骤 5.5 确认项收敛」整篇重读知识库并合并/消化，不要用 grep 凑答案。

- @PM确认 #1：<业务视角的中文问题>
- @PM确认 #2：<业务视角的中文问题>
- @架构确认 #1：<架构/技术问题>
- @架构确认 #2：<架构/技术问题>

> 所有 `@确认` 标签必须在文末「@确认清单」处再次出现并勾选状态。

---

## 下层 · 施工清单

### 7. 影响模块
- [ ] commerce-core
- [ ] payment-sdk
- [ ] settlement-core
- [ ] fulfillment-core
- [ ] system-core
- [ ] gateway-bff
- [ ] open-api
- [ ] common
- [ ] _其他：_

### 8. 改动文件清单
| 路径 | 类型 | 说明 |
|---|---|---|
| `<path>` | new / modify / delete | <一句话说明> |

### 9. 挂载扩展点
（**只能从 domain-index 对应域的 `extension_points` 白名单中选**；选不到 = `@架构确认 #N`）

| 扩展点 | 实现类 | 说明 |
|---|---|---|
| `<e.g. PaymentChannel>` | `<新增类全限定名>` | <说明> |

### 10. 新增 / 修改 AppService
| AppService 方法 | 输入 | 输出 | 调用方 |
|---|---|---|---|
| `<class>#<method>` | `<DTO>` | `<DTO>` | <谁调它> |

### 10.1 接口契约
| 调用端 | 方法 | 路径 | 新增 / 追加字段 | 说明（多端差异） |
|---|---|---|---|---|
| PC / APP / H5 / PC + APP | GET / POST | `<path>` | new / append | <各端差异；多端共用时写清> |

> **调用端必填**：同一业务在 PC 后台、BD App、店长 H5 入口不同，不标调用端排查会走错链路；新路径建议体现端（`/v1/app/...`、`/v1/pc/...`、`/h5/...`）。
>
> **向后兼容**：存量接口只追加可选字段 / 枚举值，不换、不删、不"规划删除"；已有状态值（如 `BLOCKED`）保留。新行为装在现有接口背后，现网没有的动作才新增接口并挂在现有 Controller 前缀下；新分类 / 模型先对齐现有枚举。
>
> **界面元素要有来源**：spec 中出现的按钮、跳转、文案、通知，逐条注明来源（用户原话 / PRD / 原型）；没有来源的单列到「建议（待产品确认）」，不要混进正式契约。

> **HTTP 约定提醒**：仅 GET / POST，URL 走 `/create /update /delete /list /detail` 动词约定，禁 `@PathVariable`（详见 memory `feedback_http_method_convention.md`）。

### 11. 数据库变更
- DDL：
- 索引：
- 数据迁移脚本路径：

> **表名前缀提醒**：oms_ / wms_ / bms_ / sys_ 域前缀，禁 t_。

### 12. 测试要点
- 单测覆盖（必填）：
  - <测试类 + 关键 case>
- 集成测试（涉及跨域时必填）：
- 关键边界用例（必填，至少 3 条）：
  - 边界 1：
  - 边界 2：
  - 边界 3：

---

## @确认清单（自动汇总）

> spec 进入 `approved` 前所有标签必须勾选；勾选意味着已收到对应角色的回复。
>
> **回填方式两种**（团队负责人指定默认走哪种；作者也可按 spec 重要性自行选择）：
>
> **方式 A · 直接回填**（轻量，适合绿色 spec）：
> 答复者口头/飞书答复 → 作者直接编辑本 spec → 勾 `[x]` + 在 "— <回复或决策>" 处写明答复 + 答复人 + 日期。
>
> **方式 B · 关联 issue/PR 评论**（可溯源，适合红色 spec）：
> 作者在 §6 风险与确认项处给每条 `@确认` 加 `[关联](<issue/PR url>)` 链接 → 答复者在 issue/PR 评论里回复 → 作者收到通知后开回填 PR：勾 `[x]` + 摘录答复 + 链接保留。

**示例（方式 A）**：
- [x] @PM确认 #1：积分换算率是否配置化？— 王某 2026-04-19 答复：V1 硬编码 1元=100，V2 配置化

**示例（方式 B）**：
- [x] @架构确认 #1：内部同步通道识别策略？— diwu 2026-04-19 答复：用 payType 硬判，[关联 PR #115 评论](https://gitee.com/lengfeng_2/octopus-cloud/pulls/115#note_xxx)

---

- [ ] @PM确认 #1：<问题摘要> — <回复或决策>
- [ ] @PM确认 #2：<问题摘要> — <回复或决策>
- [ ] @架构确认 #1：<问题摘要> — <回复或决策>
- [ ] @架构确认 #2：<问题摘要> — <回复或决策>

---

## 自评说明

> 在 frontmatter `spec_color` 派生为 red 的情况下，请在此说明为什么是红色（哪条红线触发），以便架构师 review 时聚焦：

- 触发红线：`new_invariant` / `new_extension_point` / `cross_domain_combo_seen_before=false`
- 红线说明：
