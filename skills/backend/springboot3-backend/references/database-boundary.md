# 数据库边界基线（5 库方案）

## 1. 当前目标

1. 从第一天按分库设计，避免后期大迁移。
2. 先控制复杂度：5 个业务库，不做过度拆分。
3. 严格禁止跨库 join。

## 2. 推荐分库

| 库 | 职责 | 唯一真相 |
|---|---|---|
| `oms_db` | 订单主单、订单明细、订单状态流转、售后主流程 | 订单 |
| `product_db` | SPU/SKU/分类/价格/媒体/供应商-商品关系/店铺-商品上架 | 商品主数据 |
| `fulfillment_db` | 库存/出入库/分拣/波次/配送任务/运单轨迹 | 履约 |
| `bms_db` | 账单/清分/应收应付/对账/结算单 | 财务 |
| `sys_db` | 用户/组织/角色/权限/字典/租户/合作协议/支付进件 | 平台治理 |

### oms_db

- 订单主单、订单明细、订单状态流转、售后主流程。
- 保留 `t_product` / `t_sku` 作为轻量读缓存（由 product_db 事件投影写入）。
- 保留 `t_partner_pricing_config` 作为合作方定价配置投影（由 sys_db 合作协议事件投影写入，只读）。

### product_db

- 商品主数据：SPU、SKU、分类、属性、媒体、组合商品。
- 价格体系：渠道价格（C 端）、内部价格簿（B 端/定价引擎）。
- 供应商-商品关系（供应商身份由 `sys_db.t_cooperation_agreement` 管理）。
- `t_supplier_agreement` **deprecated**：新供应商走 `sys_db.t_cooperation_agreement(SUPPLY)`。

### fulfillment_db

- 库存、出入库、分拣、波次、配送任务、运单轨迹。
- 保留 `t_partner_delivery_config` 作为合作方配送配置投影（只读）。

### bms_db

- 账单、清分、应收应付、对账、结算单。
- 保留 `t_partner_settlement_config` 作为合作方结算配置投影（只读）。

### sys_db

- 用户、组织、角色、权限、字典、租户、挂靠关系。
- `cooperation_agreement` + `agreement_term` — 合作总协议/条款，唯一真相。
- `payment_merchant` — 支付渠道商户进件记录。
- `payment_onboarding_attempt` — 进件申请历史（按 `request_no` 唯一回调）。
- `org_store` — 门店主数据；`org_warehouse` — 仓库主数据。

## 3. 数据所有权规则

1. **一个业务事实只在一个库中有"唯一真相"**。
2. 其他库只存引用字段（如 `orderId`、`tenantId`），不复制主表结构。
3. **禁止跨库外键**。
4. 投影表（`t_partner_*_config`、`t_product`/`t_sku` 读缓存）只读，不可直接修改。

## 4. 禁止事项（【强制】）

1. **禁止跨库 join**（包括联邦查询替代跨域模型）。
2. **禁止跨服务直接修改他库数据**。
3. **禁止在 BFF 中写业务库**。
4. **禁止直接修改投影表**，投影由事件驱动写入。

## 5. 跨域一致性

- 写链路：**本地事务 + Outbox**。
- 事件总线：**Kafka**。
- 下游消费更新本域数据，失败走重试/补偿。

### 典型链路

```
OMS 创建订单 → Outbox 发 OrderCreated
  └─ Fulfillment 消费 → 预占库存
  └─ BMS 消费 → 生成应收待结算记录

Product 变更 SPU/SKU/价格 → Outbox 发 ProductChanged / SkuPriceChanged
  └─ OMS 消费 → 更新 t_product / t_sku 读缓存

System 合作协议激活/变更 → Outbox 发 CooperationAgreementActivated
  └─ Fulfillment 消费 → 写入 t_partner_delivery_config
  └─ BMS 消费 → 写入 t_partner_settlement_config
  └─ OMS 消费 → 写入 t_partner_pricing_config
```

## 6. 跨域查询方案

1. **简单场景**：BFF 聚合调用（读多个服务 API）。
2. **复杂列表**：读模型库（投影表），由事件异步构建。
3. **前端展示文案**：接口返回 `code + label`，字典统一由 `sys_db` 治理。

## 7. 建表归属速查

| 表 | 归属库 | 说明 |
|---|---|---|
| `order_header` / `order_line` / `order_status_log` | `oms_db` | 订单真相 |
| `after_sale` | `oms_db` | 售后真相 |
| `t_product` / `t_sku`（oms侧） | `oms_db` | 商品读缓存（只读投影） |
| `t_partner_pricing_config` | `oms_db` | 定价配置投影（只读） |
| `t_product` / `t_sku`（product侧） | `product_db` | 商品真相 |
| `t_channel_price` / `t_price_book` | `product_db` | 价格体系真相 |
| `t_supplier_product` / `t_store_product` | `product_db` | 关系真相 |
| `inventory_balance` / `outbound_task` | `fulfillment_db` | 库存/履约真相 |
| `t_partner_delivery_config` | `fulfillment_db` | 配送配置投影（只读） |
| `bill` / `settlement_record` | `bms_db` | 财务真相 |
| `t_partner_settlement_config` | `bms_db` | 结算配置投影（只读） |
| `cooperation_agreement` / `agreement_term` | `sys_db` | 合作协议真相 |
| `payment_merchant` / `payment_onboarding_attempt` | `sys_db` | 支付进件真相 |
| `org_store` / `org_warehouse` | `sys_db` | 主数据真相 |

## 8. PR 评审清单（必查）

- [ ] 是否出现跨库 SQL 或跨域 join？
- [ ] 是否通过 Outbox 发布跨域事件？
- [ ] 是否将他域真相复制为可变字段？
- [ ] 是否有稳定幂等键和事件去重策略？
- [ ] 新表是否归属到正确的库？
- [ ] 投影表是否只读，未被直接写入？
