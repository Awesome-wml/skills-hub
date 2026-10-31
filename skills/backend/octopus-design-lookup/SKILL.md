---
name: octopus-design-lookup
description: Octopus 项目飞书设计文档智能查阅。当用户/任务涉及组织/合作/门店/商品/价格/订单/履约/仓储/库存/支付/分账/营销/分销/通知/权限/数据库边界/领域事件等领域，需要确认设计意图、模型契约、状态机、跨域事件流时使用。按主题映射到对应飞书 wiki 节点，用 lark-cli 拉取正文。Triggers on "看一下飞书"、"查设计文档"、"飞书 wiki"、"权威设计是"、"PRD 怎么定义"、"主线一/二/三/四的设计"，或起 spec/解 bug 时需要回溯 architecture intent 的场景。
metadata:
  base-url: "https://lcnohxg915u5.feishu.cn/wiki/"
  fetch-tool: "lark-cli"
  doc-count: 46
  last-updated: "2026-05-30"
---

# Octopus 飞书设计文档智能查阅

> **定位**：Octopus 后端权威设计沉淀在飞书 wiki，本 skill 是"主题 → 飞书 URL → 正文"的智能索引层。**不要把所有 46 篇文档全拉下来**——按任务主题挑 1–3 篇即可。

## 何时必须使用本 skill

| 触发场景 | 典型动作 |
|---------|---------|
| 起草 / 修订 spec 涉及组织、合作、商品、订单、履约、支付、营销、分销等核心域 | 先按主题查飞书，确认领域契约 |
| 解 bug 时怀疑"这个字段/状态/事件原本约定是什么" | 拉对应主线的"模型说明"或"设计" |
| 实现新接口或新事件前，需要对齐跨域事实流（Outbox、投影） | 拉 `订单链路追踪基线` / `领域事件设计` |
| 用户明确说"看一下飞书"、"查 PRD / 设计"、"权威定义在哪" | 直接按用户提到的关键词查 |
| 接到 `@架构确认` 但本地 `docs/knowledge/` 未命中 | 飞书是上游真相，落盘前先查 |

## 何时**不**应使用

- 纯字面修改（错别字、日志、注释、依赖升级）
- 已有 `docs/knowledge/conventions|decisions|bug-patterns` 覆盖的问题（先扫本地索引）
- 用户只问"代码哪里"——直接 grep 即可
- 同一会话内已拉过该文档（一次会话内不重复抓）

## lark-cli 标准抓取流程（两步法）

飞书 wiki URL 形如 `https://lcnohxg915u5.feishu.cn/wiki/<node_token>`，正文需先解析再抓：

```bash
# Step 1：node_token → obj_token + obj_type
lark-cli api GET /open-apis/wiki/v2/spaces/get_node \
  --params '{"token":"<node_token>"}'
# 返回 data.node.obj_token (docx_id) 与 data.node.obj_type (一般为 "docx")

# Step 2a：obj_type=docx → 拉纯文本正文
lark-cli api GET /open-apis/docx/v1/documents/<obj_token>/raw_content

# Step 2b：obj_type=sheet（电子表格）→ 走 sheets API
lark-cli api GET /open-apis/sheets/v3/spreadsheets/<obj_token>/sheets/query
```

**约定**：
- 用 `--jq '.data.content'` 直接取正文，避免冗余字段污染上下文
- 一篇文档单次抓取一般不超过几十 KB；如返回过大，先用 `--jq` 截取所需章节
- 抓到的正文**只读**——不要写回飞书；本地沉淀走 `docs/knowledge/`

## 主题 → 飞书 wiki 索引

所有 URL 共享前缀 `https://lcnohxg915u5.feishu.cn/wiki/`，下表只列 `node_token`。

### 0. 项目全景（任何主线之前先读这一篇建立全局观）

| 节点 | node_token | 何时读 |
|------|-----------|--------|
| 0-系统全景.arch | `WOW1wNGhfiMYWfk8Mg5cR3utnpR` | 新人 onboarding；不知道某概念归属于哪条主线时 |

### 1. 主线一：身份与治理（system-core / sys_db）

| 节点 | node_token | 关键词 |
|------|-----------|--------|
| 主线一总览：身份与治理基线 | `CK3VwkrEVi8LmxkVbE4cCtUwnUh` | identity、membership、affiliation、RBAC/ABAC |
| 组织模型说明 | `Stt0w0b1zirl8jkEOQVcqoKPn1b` | org_type、Capability、组织树、子公司/部门/小组 |
| 组织合作关系一致性检查 | `MsbhwAK49i0hVXkbZV9cvD0Intb` | 组织-合作一致性、收敛清单 |
| 合作关系架构设计 | `SGlCwCxN3iAwbFk4sCYchGxonTg` | 合作协议、模板+条款、运行时继承、审核+进件 |
| 合作协议模型说明 | `RjHnwgkDRiBsSgks4dJcCPTjnrd` | CooperationAgreement、SUPPLY/DISTRIBUTION/LOGISTICS、协议状态 |
| 门店模型说明 | `RVZPwo99ii6h6Fk3t6Yc0QAjnLg` | 门店类型、门店业态、画像、能力驱动 |
| 门店分类与地盘保护 | `Insgwt4HKiRavKk5QG2cKtRlnLc` | 地盘、商圈、保护规则 |
| 结算策略设计 | `WtgxwjX9LiWCvCkxq9ic9Zz6nEP` | 结算策略、费率、结算周期（主线四的输入端） |

### 2. 主线二：商品与价格（commerce-core / product_db）

| 节点 | node_token | 关键词 |
|------|-----------|--------|
| 商品模型说明 | `Bds2w9eTbipUaJkXMT9cJA41nff` | SPU、SKU、分类、规格、属性、媒体 |
| 跨域商品属性传递设计 | `BSxdw7uOrix9FckQQbVc9dI3nlf` | 商品快照、属性同步、跨库引用 |
| 渠道商品与经营实例设计 | `MfKZwQq0niBoNakMOtucC1KFn3f` | ChannelProduct、上架、经营实例、渠道差异 |

### 3. 主线三：交易与履约（commerce-core 交易子域 + fulfillment-core）

| 节点 | node_token | 关键词 |
|------|-----------|--------|
| 订单链路追踪基线 | `DUGHwSAgvi2Fg6kpLL9cumVUn7b` | 订单全链路、状态机、Outbox 事件、tracing |
| 销售订单模型说明 | `H28cw5BxNiK4YhkQti4ckF2pnj6` | 订单聚合、明细、支付、状态 |
| 订单契约实施计划 | `LHJ0w0tXbiCC69kT98qchoEZnEg` | 订单接口契约、字段约定、对外发布 |
| 消费者行为子域设计 | `HQZ7wVkaXiVWRqkDHEhch153nUh` | 购物车、收藏、足迹、加购 |
| 履约模型指南 | `Uxtsw8CWJis7kJkfFtgcDOfgnpc` | 履约总览、出入库分流、策略驱动 |
| 履约模型说明 | `QXNpwSH1bijortkWLzjcxbMbnGh` | 出库单/入库单聚合、状态机 |
| 仓库模型说明 | `DJyWwHcMwiu52sk9ApucHtYUnfL` | 仓库类型、库区、库位、合流位 |
| 库存模型说明 | `IeaBwF8VEiQ2fzk31ricmm5Pnio` | 库存余额、流水、来源类型、变更触发 |
| 电商WMS编号体系设计 | `DRoVwZZ3WiCAFFkP434cK8OHnng` | OBD/IBD/CT 编号规则、包裹号 |
| 发货批次与采购单自动化 | `KLyvwsEHIi9tZikpaHycmEa4nlg` | 发货批次、PO 自动化、采购联动 |
| 提货通知与核销 | `LUVnwaTo9iBku3k1Pu7cb11JnQH` | 自提、核销、提货通知 |
| 售后模型说明 | `Dd55w3M2Bi0r64kfTQpcN1jMnyc` | 售后聚合、退款/退货、状态 |
| 售后与退款设计 | `Z1mGwiEMfidrHckZMyvctoLrnPS` | 仅退款、退货退款、资金回流 |

### 4. 主线四：结算与资金（settlement-core / bms_db）

| 节点 | node_token | 关键词 |
|------|-----------|--------|
| 支付模型说明 | `TXRgwTnkqiqtKNk1BCKcBxvznzc` | 支付单、支付流水、状态 |
| 支付通道设计 | `OAJYwm2uriNyf8k80xYcJV8mnDc` | 渠道接入、通道路由、回调 |
| 分账模型说明 | `Kh1TwQpJ2iRpyIkaKjqcLWTtnlf` | 清分、分账、对账、结算 |

### 5. 技术基线（跨主线通用能力）

| 节点 | node_token | 关键词 |
|------|-----------|--------|
| 数据库边界基线 | `FT0rwh2wsi4ODOkX2PAcMO5Gn2f` | 5 库分布、跨库一致性、建表示例 |
| 权限运行时治理 | `Pd9TwLBCTiflTnklU3LcIDZLnOc` | 数据范围、资源可见性、运行时治理 |
| ResourceGrant 数据权限实施方案 | `ZRmVwXYqlixUZDkgrjvcOyGhnOx` | ResourceGrant、数据授权落地 |
| 资源实例级权限治理 | `OVBpwDDYYieeVGkcBdocwITLn4i` | 实例级 ACL、`@DataScope` 落点 |
| 能力授权基线 | `Rfjxw4dcMi961ukcQVDc0WOxnWg` | Capability、@RequiresCapability、能力枚举 |
| 前端权限集成指南 | `LjjmwUtjmi3kcKkFTHQcQtDznmg` | 菜单/按钮/数据权限的前端对接 |
| 测试架构 | `DUWowVO0EiCBc0kWLdHcHy0wnfg` | 测试分层、策略、kernel-test-* |
| 通知系统设计 | `TMzWwlwyiiohMRkgZlKc5yF3nYb` | 通知全链路、模板、渠道 |
| 通知模型说明 | `HC9NwLNS0i7MBvknpNYcqgAQnQh` | NotificationEvent、订阅、读写库 |
| kernel-notify-starter 设计 | `UGnuwxB9Qiqi55kwdQhcxzeGnOc` | starter 内部实现、扩展点 |
| 多业务流程架构基线 | `PalUw5tAkiWf8nkDmjlc3yzpnxf` | LiteFlow 编排、chain 命名 |
| 领域事件设计 | `B7GpwBnd8iNYPNk3OFuc47Gxn6E` | 事件命名、payload、Outbox、版本 |
| JSON 列约定 | `G9BzwwlKziAoOxkdS9mcqsHrnSb` | JSON 字段使用边界、序列化、查询 |
| kernel-file 文件引用选型 | `OhqZwKsQAiWHaTkapRrcy1jCnRg` | 文件引用、对象存储、临时链接 |

### 6. 辅助线（叠加在主线之上）

| 节点 | node_token | 关键词 |
|------|-----------|--------|
| 订单与商品元数据引擎 | `LZkrwEkJDikVUrkdc2BcEicbn3c` | 元数据、字段定义、规则配置 |
| 营销模型说明 | `Ya3qwkGXBiiwtNklFekcIIe9nJc` | 优惠券、活动、积分、模型 |
| 营销服务设计 | `WUq0wl579ihldjk5nNQcL8p0npU` | marketing-core 整体设计、编排 |
| 营销服务增量-统一活动与会员等级 | `LTLOwgcLTinZCgkuOujcFmvRnoY` | 活动统一、会员等级 |
| 分销模型说明 | `OT8AwDlHeiuOVsk2zP6cGAKvnDh` | 分销关系链、归因 |
| 分销体系设计 | `AJ5bwCgtji1L3wkuHnvcu9NTnCb` | 分销整体方案、佣金计算 |

## 智能选择策略（如何挑文档）

按"主题词命中表" + "主线归属"两步定位：

1. **抽取任务中的领域名词** —— 例如"门店合作类型"、"出库单状态"、"分账金额"、"通知模板"
2. **匹配关键词列** —— 命中即候选；命中 ≥2 文档时按下表优先级裁剪
3. **优先级**（同一主题多文档时）：
   - 当前主线的"X 模型说明" > "X 设计 / 实施" > "全景图" > "辅助线"
   - 已知某 BP/CONV 已沉淀本地，**不必再拉飞书**
4. **最多并行抓 3 篇**；如确实需要更多，先抓 1 篇全景再迭代

### 常见任务 → 推荐文档

| 任务 | 推荐文档（按读取顺序） |
|------|----------------------|
| 起 spec：新增门店类型/能力 | `组织模型说明` → `门店模型说明` → `合作关系架构设计` |
| 起 spec：新增订单状态/事件 | `销售订单模型说明` → `订单链路追踪基线` → `领域事件设计` |
| 起 spec：履约 / 出入库流程改造 | `履约模型说明` → `履约模型指南` → `电商WMS编号体系设计` |
| 起 spec：库存变更 / 来源类型 | `库存模型说明` → `领域事件设计` |
| 起 spec：支付通道 / 分账 | `支付模型说明` → `支付通道设计` → `分账模型说明` |
| 起 spec：营销活动 / 优惠券 | `营销模型说明` → `营销服务设计` |
| 起 spec：跨库读写 / 新表归属 | `数据库边界基线` |
| 起 spec：新增权限 / Capability | `能力授权基线` → `权限运行时治理` → `ResourceGrant 数据权限实施方案` |
| 起 spec：通知 / 站内信 / 推送 | `通知系统设计` → `通知模型说明` → `kernel-notify-starter 设计` |
| 解 bug：跨域事件丢失 / 投影错乱 | `领域事件设计` → 涉及主线的"模型说明" |
| 解 bug：状态机字符串绕过 enum | 涉及主线的"模型说明" |

## 使用约束

- **不并发拉 >3 篇**，超出先收敛主题
- **同一会话不重复拉同一篇**——已读过的内容直接引用
- **正文进上下文前先 jq 截取**——只留与当前任务相关的章节
- **飞书是上游真相，但 `docs/knowledge/` 是日常工作流的必查清单**——本地未命中再去飞书；从飞书学到的新约定 / 新坑要沉淀回本地（`BP-xxx` / `CONV-xxx` 草稿）
- **node_token 失效 / 接口报错**时先用 `lark-cli api GET /open-apis/wiki/v2/spaces/get_node --params '{"token":"<token>"}'` 探测节点是否还在，若 404 提示用户飞书侧文档可能已迁移

## 抓取脚本（可选辅助）

复用频繁时可以在 `scripts/fetch.sh` 包一层（按需创建）：

```bash
#!/usr/bin/env bash
# Usage: fetch.sh <node_token>
set -euo pipefail
node_token="$1"
meta=$(lark-cli api GET /open-apis/wiki/v2/spaces/get_node --params "{\"token\":\"${node_token}\"}")
obj_token=$(echo "$meta" | jq -r '.data.node.obj_token')
obj_type=$(echo "$meta" | jq -r '.data.node.obj_type')
case "$obj_type" in
  docx)
    lark-cli api GET "/open-apis/docx/v1/documents/${obj_token}/raw_content" --jq '.data.content'
    ;;
  sheet)
    lark-cli api GET "/open-apis/sheets/v3/spreadsheets/${obj_token}/sheets/query" --jq '.data'
    ;;
  *)
    echo "unsupported obj_type: ${obj_type}" >&2; exit 1
    ;;
esac
```
