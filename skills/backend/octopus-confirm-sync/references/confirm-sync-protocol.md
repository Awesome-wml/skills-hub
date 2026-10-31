# Confirm Sync Protocol —— 方式 C 回填格式规约

本文定义"飞书 Base 回填表（方式 C）"的**协议/结构**：每个项目按本协议搭自己的 Base、填自己的 `confirm-base.yaml`。

本 skill 的运行时只信任协议；项目专属的 id（`base_token` / `table_id` / `workflow_id`）一律从项目本地 `docs/superpowers/confirm-base.yaml` 读取。

---

## 项目本地配置文件：`docs/superpowers/confirm-base.yaml`

每个启用方式 C 的项目在仓库根下提供本文件：

```yaml
version: 1
base:
  host: lcnohxg915u5.feishu.cn          # 飞书实例 host（不含 https://）
  base_token: <Base 的 app_token>       # e.g. KTN5bYIK4a3Q73szpDRcv00OnAg
  url: https://.../wiki/<node-token>    # 便于人点进去看的 Base 入口 URL（可选）

tables:
  main:                                 # 主表「确认项」
    table_id: <table_id>                # e.g. tblvMeFrU9giaOdc
    fields:                             # 字段名（用于 lark-cli 读写）
      spec_id: spec_id
      confirm_no: 确认编号
      type: 类型
      question: 问题
      status: 状态
      final_reply: 最终答复摘要
      notify_to: 通知人
      replies_link: 答复历史
  replies:                              # 子表「答复历史」
    table_id: <table_id>                # e.g. tblschvKjnFXnOTE
    fields:
      round: 轮次
      content: 答复内容
      replier: 答复人姓名
      reply_date: 答复日期
      confirm_item_link: 确认项          # link 回主表
      spec_id: spec_id                  # formula 字段，自动从 link 带出
      confirm_no: 确认编号               # formula 字段

workflow:
  id: <workflow_id>                     # e.g. wkfcHJstSS0mPhRE
  purpose: 子表新增 → 主表状态推进 + 通知人 IM

status_values:
  pending: 待回复
  replied: 已回复
```

---

## URL 识别规则

spec §6 中每条 `@确认` 后挂的 `[关联](<url>)` 有三种形态：

1. **方式 C** `https://<host>/base/<base_token>?table=<table_id>&view=...&record=rec...`
2. **方式 C** `https://<host>/wiki/<node_token>?record=rec...`（wiki 挂载形态）
3. **其他** —— 一律跳过

判定为方式 C 的条件：
- URL host 或路径中包含项目 `confirm-base.yaml` 里 `base.base_token`
- 能提取到 `rec...` 形式的 record_id（正则 `rec[A-Za-z0-9]+`）

---

## 主表字段契约

| 字段 | 类型 | 说明 |
|---|---|---|
| `spec_id` | 文本 | spec 文件名（不含日期前缀和 `-design.md` 后缀），例如 `points-pay-channel-and-freeze` |
| `确认编号` | 文本 | `@PM确认 #1` / `@架构确认 #2` 中的完整标签 |
| `类型` | 单选 | `@PM确认` / `@架构确认` |
| `问题` | 多行文本 | 原 spec §6 里的问题全文 |
| `状态` | 单选 | `待回复` / `已回复`（值从 `status_values` 读） |
| `最终答复摘要` | 多行文本 | 作者凝练的一句话结论；**必填**才能闭环 |
| `通知人` | 人员 | workflow 推送 IM 的目标 |
| `答复历史` | link → 子表 | 双向 link；子表 link 回本行触发 workflow |

## 子表字段契约

| 字段 | 类型 | 说明 |
|---|---|---|
| `轮次` | 数字 | 1, 2, 3... 每次追问独立一行 |
| `答复内容` | 多行文本 | 本轮答复正文 |
| `答复人姓名` | 文本 | |
| `答复日期` | 日期 | |
| `确认项` | link → 主表 | **必填**，选回对应的主表行 |
| `spec_id` | formula | 从 `确认项` link 自动带出，无需手填 |
| `确认编号` | formula | 从 `确认项` link 自动带出 |

## Workflow 契约

- **触发**：子表新增一行
- **动作**：
  1. 读子表行的 `spec_id` / `确认编号` / `答复内容` / `轮次`
  2. 通过 link 找到主表行，把「状态」字段置为 `status_values.replied`
  3. 读主表行的「通知人」字段，发送飞书消息：
     ```
     <spec_id> · <确认编号> 第 <N> 轮：<答复内容>
     ```
- **作用**：作者无需 polling，收到 IM 即知有新答复

---

## 闭环判定

一条 `@确认` 视为"闭环"当且仅当：
- 主表对应行的「状态」= `status_values.replied`
- 且主表对应行的「最终答复摘要」非空

任一不满足 → 本次 sync 不推进该条。

---

## 反乒乓机制

- 每轮追问在子表新增独立一行，`轮次` 递增；**不覆盖**历史
- 作者回填 spec §6 时：
  - 最小形态：只写「最终答复摘要」
  - 完整形态：按时间线渲染全部轮次到 spec（`<details>` 折叠 或 嵌套列表）
- 主表 record URL 永远是讨论全历史的入口

---

## 新项目接入步骤

1. 在飞书新建 Base（或复用），按上方「主表 / 子表字段契约」建表
2. 按"Workflow 契约"搭流程（子表变更监听 → 主表状态推进 → 通知人 IM）
3. 把 `base_token` / `table_id` / `workflow_id` / 字段名映射填进 `docs/superpowers/confirm-base.yaml`
4. commit `confirm-base.yaml` 到项目仓库
5. spec 作者正常走"方式 C"流程，skill 自动认配置
