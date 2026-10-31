---
name: no-frontend-data-fallback
description: |
  octopus-admin 前端接口数据对接强制约束。适用于新增或修改前端页面、组件、API/SDK 对接、字段映射、详情回显、表单提交、列表展示、空态处理、联调和 bug 修复。
  前端不要做任何数据兜底，以后端接口返回为主；接口返回是空的，就空着；所有问题，暴露出来。
---

# 前端禁止数据兜底

## 强制原则

前端不要做任何数据兜底，以后端接口返回为主。

接口返回是空的，就空着。

所有问题，暴露出来。

## 什么时候用

以下场景必须使用本 skill：

- 新增或修改 `src/views/**` 页面、`vabAutoComponents/**` 子组件
- 新增或修改 `src/api/**`、`src/sdk/**` 接口对接
- 处理列表、详情、编辑表单、抽屉、弹窗的字段回显
- 修改字段映射、枚举展示、状态文案、图片、地址、联系人、金额、数量、时间等接口数据展示
- 修复接口为空、字段缺失、回显异常、提交异常、联调异常

## 禁止行为

- 禁止为接口缺失字段自行构造默认值、模拟值、演示值或占位业务值。
- 禁止用相近字段拼接、推断、猜测成接口未返回的字段。
- 禁止把接口返回的 `null`、`undefined`、空字符串、空数组替换成看似正常的业务数据。
- 禁止为了让页面“不报错”而吞掉接口契约问题。
- 禁止在提交前补齐后端未返回、用户未填写、契约未声明的业务字段。
- 禁止用前端硬编码兜底后端枚举、状态、必填性、策略值或业务规则。

## 正确做法

- 接口返回什么，前端就展示什么；返回空值时按空态展示。
- 字段缺失或契约不一致时，让页面、日志、类型检查或联调问题暴露出来，并在总结中说明。
- 只允许做展示层格式化，例如时间格式化、金额格式化、空态文本、数组长度判断；不得改变原始业务语义。
- 可使用可选链、空数组保护等技术手段避免运行时崩溃，但不得借此伪造业务数据。
- 提交数据必须来自接口契约、用户输入或明确的后端初始化接口，不得由前端猜测补全。
- 状态 / 枚举的中文文案读后端 `@DictLabel("dict_key")` 自动注入的 `{字段名}Label`（如 `settleStatusLabel`）；下拉选项用 `getDictItemsByKey(DICT_KEY_XXX)`（`/@/api/dictManagement`）。缺 Label 或缺字典就让后端新建字典 + 加注解，不在前端写 map 顶上；只有 `el-tag` 颜色这类纯视觉映射可留前端。新代码也不要往 `getDictItemsByKeyWithFallback` 的本地兜底表里追加 key——那是字典入库前的临时过渡。

## 空态规则

- 普通文本字段为空：展示空态，不补“暂无以外的业务内容”。
- 数组字段为空：展示空列表或标准空状态，不插入示例行。
- 对象字段为空：对应区块保持空态或不展示依赖内容，不创建假对象。
- 枚举值为空或未知：暴露为未知或空态，并记录需要后端确认，不自行映射成默认状态。

## 代码判断

看到以下写法时必须警惕并移除业务兜底：

```typescript
const name = detail.name || '默认名称'
const status = detail.status ?? 1
const list = res.data?.list || mockList
const phone = detail.mobile || detail.phone || '未填写'
const STATUS_TEXT = { PAID: '已支付', REFUNDED: '已退款' } // 前端 code→中文 map：与后端枚举漂移，漏键就裸露英文 code
const statusText = STATUS_TEXT[row.status] || row.status
```

允许的展示层空态示例：

```typescript
const list = Array.isArray(res.data?.list) ? res.data.list : []
const displayName = row.name || '暂无'
const statusText = row?.statusLabel || ''           // 文案来自后端 @DictLabel
const tagType = STATUS_TAG_TYPE[row.status]         // 只有颜色可以留前端小 map
```

`displayName` 只能用于界面展示，不能再提交给后端或作为业务判断依据。
