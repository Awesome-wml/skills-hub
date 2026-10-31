---
name: enable-list-time-sorting
description: 为 octopus-admin 新建或修改分页列表页时，确保所有展示型时间列支持与后端契约一致的服务端排序。适用于 VabSchemaTable 列配置、创建时间/更新时间/审核时间/支付时间等业务时间列、sorter 配置、默认排序、排序请求参数和 SDK/OpenAPI 契约核对；禁止只显示排序箭头、前端本地排序、猜测排序字段或向不支持排序的接口静默追加参数。
---

# 列表时间列排序

将“新列表页的所有时间列可排序”作为交付条件，并以 `/fulfillment/permission/profile` 的时间列表头为交互参考。只实现服务端排序，不对当前页数据做本地排序。

## 必读

1. 阅读仓库根目录 `AGENTS.md`。
2. 阅读 `.agents/skills/schema-crud/SKILL.md` 与 `.agents/skills/api-contract-strict/SKILL.md`。
3. 阅读 `.cursor/rules/page-list.mdc`。
4. 核对 `library/components/VabSchemaTable/README.md` 的服务端排序协议。

## 工作流

### 1. 识别全部时间列

- 枚举列表实际展示的所有日期/时间字段，不只检查 `createdAt`、`updatedAt`。
- 同时覆盖审核时间、支付时间、完成时间、失效时间、业务发生时间等语义为日期或时间的列。
- 日期区间查询条件不是表格展示列，不因本规则自动增加排序。

### 2. 核对服务端契约

- 在 SDK、OpenAPI 和后端真实查询契约中确认排序传输协议、允许排序的字段名和方向值。
- 默认单字段协议为顶层查询参数 `sortField` 与 `sortOrder`，方向值为 `asc` / `desc`。
- 接口字段与页面 `dataIndex` 不同，只能在契约明确时配置 `sorter: { sortField: '真实接口字段' }`。
- 接口采用组合排序时，确认其接收 `sorts: Array<{ field, direction }>` 后才传 `defaultSorts`；即使 `defaultSorts` 是空数组，也会切换到组合排序协议。
- 不得因为参考页能排序，就推定另一个接口支持相同字段或参数。

### 3. 配置 VabSchemaTable

接口排序字段与展示字段一致时：

```ts
{ dataIndex: 'createdAt', title: '创建时间', sorter: true }
{ dataIndex: 'updatedAt', title: '更新时间', sorter: true }
```

接口排序字段与展示字段不一致且契约已明确时：

```ts
{ dataIndex: 'businessTime', title: '业务时间', sorter: { sortField: 'occurredAt' } }
```

- `sorter` 必须配置在每一个可排序时间列上；不要手写表头箭头或自行监听 Element Plus 排序事件。
- 默认使用 `VabSchemaTable` 的单字段协议，不要为了出现箭头而添加 `:default-sorts="[]"`。
- 只有业务明确要求默认排序且接口支持组合排序时，才传 `defaultSorts`；数组顺序即服务端排序优先级。
- `runRequest(params)` 必须把组件生成的分页、筛选和排序参数原样交给对应 SDK 方法，不得丢弃、包进未经契约声明的 DTO 或改名。
- 排序变化由公共组件自动回到第一页并重新请求，不要再写重复逻辑。

### 4. 处理契约缺口

- 后端未声明或未实现该时间字段排序时，不得增加无效箭头，也不得对当前页 `list` 调用 `sort()` 冒充全量排序。
- 在计划文档和对应 `docs/ledger/*.md` 记录缺失的排序字段/协议，并明确页面尚未满足“所有时间列可排序”的交付条件。
- 需要后端配合时，按项目约定创建中性问题单；契约补齐后再启用该列 `sorter`。

## 验证

- 为页面增加定向测试，枚举所有展示型时间列并断言每列存在正确的 `sorter` 配置。
- 对字段映射或自定义参数名增加请求参数测试，确认升序、降序和清除排序的传参符合契约。
- 页面验收时逐列点击：升序、降序、取消排序；确认请求重新发起、页码回到第一页、参数字段正确、跨页结果顺序正确。
- 执行目标文件 ESLint、相关 Vitest 和 `git diff --check`。

## 完成标准

- 新列表页每个展示型时间列均具备真实可用的服务端排序，或已明确记录后端阻塞，不能把无效排序 UI 视为完成。
- 未引入前端本地排序、字段猜测、静默兜底或与契约不一致的参数包装。
