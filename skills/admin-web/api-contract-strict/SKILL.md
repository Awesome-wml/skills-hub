---
name: api-contract-strict
description: |
  前端接口契约严格对齐规则。用于对接后端 API / SDK / OpenAPI、编写列表/详情/表单的数据映射、处理接口返回值、拼装请求参数或提交 payload 时，强制以后端真实契约和实际返回为唯一来源。禁止未经用户明确授权自行做字段兜底、默认值补齐、近义字段映射、本地假数据、Label/code 自动回退；分页列表和详情页里凡是纯展示字典中文的场景，默认只展示对应 `{field}Label` 字段，没有就先空着。仅当用户明确要求临时兼容写法，或明确说明该过渡口径已与后端约定好时，才可按指定方式实现。
---

# API Contract Strict

## 核心规则

- 把后端契约和真实返回当作唯一真相源。
- 后端返回什么就消费什么；后端没返回的字段保持 `undefined`、空态、不展示或不提交，不要自行补 `''`、`0`、`[]`、`{}`、`false`、假 `Label`、假 `Name`、mock 文案。
- 不要把近义字段当替身，例如 `statusName` 顶 `statusLabel`、`receiverName` 顶 `contactName`、`route.query.xxx` 顶 `form.xxx`。
- 不要用静默回退掩盖契约缺口，例如 `fooLabel || foo`、`res.data?.list || []`、`payload.bizType ?? defaultBizType`。
- 分页列表和详情页里，如果只是展示字典/枚举/状态对应的中文纯文本，默认只读对应 `{field}Label` 字段；没返回就先空着。
- `Label` 展示规则只用于纯展示文本，不用于可编辑控件回显；`el-select`、`radio-group`、远程下拉等编辑态组件仍绑定原字段 value/code，不要把 `{field}Label` 当成 `v-model` 值。
- `{field}Label` 由后端在 DTO 字段上加 `@DictLabel("dict_key")` 自动注入（如 `settleStatus` → `settleStatusLabel`）。缺 Label 的补法是后端新建字典 + 加注解，不是前端写 code→中文 map；只有 `el-tag` 颜色这类纯视觉映射可以留前端。
- 遇到契约缺口时，优先保留空态或直接暴露缺口，再在交付说明里指出需要后端补字段或需要用户确认。
- 向后端提契约诉求时只提**向后兼容**的改法：现有接口不换不删，只追加可选字段 / 枚举值；已有状态值保留；新分类先对齐现有枚举。为什么：同一接口往往还有 App、H5 或其他调用方在用，换接口、删字段会把它们一起打断。
- 对接前确认接口的**调用端**：同一业务在 PC 后台、BD App、店长 H5 往往是不同入口接口，后台页面只对接 PC 端接口，不要因为字段看着像就接了 App / H5 的接口。

## 唯一例外

只有以下两种情况允许写临时兼容：

1. 用户明确要求先按某种方式实现。
2. 用户明确说明某些字段暂未返回，但已与后端约定好临时口径，并要求先这样写。

- 这两种情况都要把临时规则写清楚：兼容哪些字段、回退到哪里、后续何时移除。
- 如果没有拿到上述明确授权，就默认“不兜底、不猜测、不补位”。
- 如果新功能里的分页列表或详情纯展示场景缺少预期的 `{field}Label`，先保持空态，再询问用户是否要先按 `{field}Label` 命名把展示链路接到页面里；未经明确授权不要自己先补。

## 常见禁写模式

```ts
const list = res.data?.list || []
const total = res.data?.total || 0
const statusText = row.statusLabel || row.status
const contactName = detail.contactName || detail.receiverName
payload.orgId = form.orgId ?? currentOrgId.value
form.status = detail.statusLabel
```

## 推荐写法

```ts
const { list, total } = res.data

const statusText = row.statusLabel ?? ''

const payload = {
  orgId: form.orgId,
  bizType: form.bizType,
}

form.status = detail.status
```

- 如果组件层确实要求固定结构，且后端契约尚未稳定，先停下来说明原因；只有拿到用户明确授权后，才补临时适配层。
- 这个 skill 可以与 `schema-crud`、`detail-page` 同时使用；当它们的示例与本规则冲突时，以本 skill 为准。

## 交付前自检

- 有没有新增任何接口未声明的字段？
- 有没有把缺失字段静默变成 `''`、`0`、`[]`、`{}` 或别的业务值？
- 有没有把 `code`、`name`、`label`、`id` 之间做未授权的替换或回退？
- 有没有把本该只用于纯展示文本的 `{field}Label` 误用到编辑态下拉、单选或远程选择回显上？
- 有没有把真实契约缺口隐藏掉，而不是明确说明出来？
- 有没有在 `.vue` 里新增状态 code→中文 map，而不是读后端 `{field}Label`？
- 对接的接口是不是 PC 端调用的那一个？
