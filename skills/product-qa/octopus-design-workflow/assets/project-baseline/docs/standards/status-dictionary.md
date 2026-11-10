# 全局状态字典

> 颜色与色值映射统一见 [design-tokens.md](./design-tokens.md)，本文件只声明"状态名 → Element Plus type"。
> 工程实现建议：落成 `src/constants/status.ts` TS 常量 + 映射函数，禁止在组件内硬编码状态-颜色映射。
> 业务术语（WMS / 订单等）完整解释见 [copywriting-normalization.mdc](../../cursor-rules/copywriting-normalization.md) 行业与项目术语表。

## 使用规则

1. 同一状态名称在**全系统语义必须一致**。
2. 同类状态使用**同一颜色体系**（即同一 `type`）。
3. Tag（展示当前状态） 和 按钮（操作入口）**语义不同**，详见 [table.md §8](./table.md) 和 [buttons-status-feedback.md](./buttons-status-feedback.md)。
4. 枚举选项必须从 `getDictItemsByKey(DICT_KEY_XXX)` 拉取，禁止硬编码——详见 [master-conventions.mdc 三、Vue 组件规范](../../cursor-rules/master-conventions.md)。

## 一、通用状态

### 1.1 单据状态

| 状态名称 | el-tag type | 说明 |
|---|---|---|
| 草稿 | `info` | 初始状态 |
| 待提交 | `info` | 已保存未提交 |
| 待审核 / 审批中 | `warning` | 流程进行中 |
| 已通过 / 已完成 | `success` | 流程完成 |
| 已驳回 | `danger` | 流程失败 |
| 已作废 | `info` | 人工终止 |

### 1.2 启用状态

| 状态名称 | el-tag type | 说明 |
|---|---|---|
| 启用 | `success` | 正常可用 |
| 停用 | `info` | 当前不可用（**不用 `danger`**，停用是中性的非激活状态） |

### 1.3 支付状态

| 状态名称 | el-tag type |
|---|---|
| 未支付 | `info` |
| 部分支付 | `warning` |
| 已支付 | `success` |
| 退款中 | `warning` |
| 已退款 | `info` |

### 1.4 发货状态

| 状态名称 | el-tag type |
|---|---|
| 未发货 | `info` |
| 部分发货 | `warning` |
| 已发货 | `success` |

## 二、订单状态

订单相关状态解释详见 [copywriting-normalization.mdc §订单状态术语](../../cursor-rules/copywriting-normalization.md)。

| 状态名称 | el-tag type |
|---|---|
| 待付款 | `warning` |
| 待发货 | `warning` |
| 待提货 | `warning` |
| 已完成 | `success` |
| 退款中 | `warning` |
| 已退款 | `info` |
| 退款关闭 | `info` |
| 已取消 | `info` |

## 三、商品状态（参考）

| 状态名称 | el-tag type | 说明 |
|---|---|---|
| 销售中（SELLING） | `success` | 正常在售 |
| 待上架（PENDING_SALE） | `warning` | 已创建未上架 |
| 已停售（STOPPED） | `info` | 主动停售（不用 `danger`） |
| 审核中（AUDITING） | `warning` | — |
| 已驳回（REJECTED） | `danger` | 审核未通过 |

## 四、任务 / 作业状态

| 状态名称 | el-tag type |
|---|---|
| 待处理 / 待执行 | `info` |
| 进行中 | `warning` |
| 已完成 | `success` |
| 已取消 | `info` |
| 异常 | `danger` |

## 五、色彩语义总则

| 语义 | el-tag type |
|---|---|
| 默认 / 草稿 / 停用 / 已结束 | `info` |
| 进行中 / 待处理 / 审批中 | `warning` |
| 成功 / 完成 / 启用 / 已通过 | `success` |
| 失败 / 驳回 / 异常 / 已冻结 | `danger` |

> 新增状态时先对齐此四类语义，再决定 type。**不要**为业务状态发明第五种 type，也不要在文档里写具体色值。
