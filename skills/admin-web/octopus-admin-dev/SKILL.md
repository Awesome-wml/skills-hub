---
name: octopus-admin-dev
description: |
  octopus-admin 项目前端页面、组件、路由、权限与 API 对接规范。适用于本仓库的 Vue 3 + TypeScript 前端开发：
  新增或修改 src/views/**/*.vue 页面、vabAutoComponents/ 子组件、src/api/*.ts 请求模块、src/router/modules/*.ts 路由配置，
  以及根据接口契约完成字段映射、Schema 组件配置、权限控制和联调收口时使用。
  也用于状态文案/字典展示、样式布局挤压、提示文案、可视化改动验收等前端易错点。
  所有需求和 bug 都必须遵循固定流程：先分析涉及代码，再输出方案与任务清单，页面相关改动同步维护 docs/dev-plan/ 计划与实施台账，待用户确认后才执行开发。
metadata:
  last-updated: '2026-10-31'
---

# octopus-admin 前端开发指南

## 什么时候用

以下请求直接使用本 skill：

- “新增 / 修改一个后台页面、列表、详情、弹窗、抽屉”
- “把 mock 页面或半成品页面接成真实接口 / SDK”
- “调整字段、搜索条件、表格列、按钮、权限、路由、菜单入口”
- “修复后台页面 bug、接口字段不一致、回显异常、提交异常”
- “根据接口契约或 OpenAPI 生成结果完成前端对接”
- “这个需求比较大，先拆任务再做”

如果任务落在 `src/views/**`、`vabAutoComponents/**`、`src/api/**`、`src/sdk/**`、`src/router/modules/**`、`docs/dev-plan/**` 或页面联调收口上，就先走本 skill。

## 同时启用

本 skill 负责“任务准入、上下文分析、方案、计划、拆分、确认、收口”，不替代实现型 skill。

- 列表页、编辑弹窗、编辑抽屉、页面内嵌表单：补读 `.agents/skills/schema-crud/SKILL.md`
- 详情页、查看页、详情抽屉 / 弹窗：补读 `.agents/skills/detail-page/SKILL.md`
- 前端页面、组件、API / SDK 对接、字段映射、回显、提交、空态处理：补读 `.cursor/skills/no-frontend-data-fallback/SKILL.md`
- 浏览器实测、改完联调、验证 UI 改动：补读 `webapp-testing`
- Git 分支、提交、PR：补读 `.cursor/skills/git-branch-commit/SKILL.md`
- 规范细节不足时：补读 `.cursor/skills/octopus-admin-dev/references/conventions.md`

## 项目事实

- 技术栈是 Vue 3 + TypeScript + Element Plus + Vab 组件库
- 页面主目录是 `src/views/{module}/{page}/`，页面私有子组件放 `vabAutoComponents/`
- 列表页默认使用 `VabSchemaTable`，编辑默认使用 `VabSchemaFormDialog/Drawer`，详情默认使用 `VabDetailPage`
- 新页面 / 新接口优先使用 `src/sdk/**` 类型化 SDK；老页面维护可保留既有 `src/api/*.ts` 封装
- OpenAPI 生成目录在 `src/sdk/{service}/`，不要手改生成产物；需要更新时执行 `pnpm gen:sdk:pull` 或 `pnpm gen:sdk`
- 路由按模块放在 `src/router/modules/**`，路由 `name` 必须与页面 `defineOptions.name` 一致
- 页面开发计划与实施台账统一沉淀在 `docs/dev-plan/`
- 产品 / UI 规范入口在 `docs/standards/`，工程规则入口在 `.cursor/rules/master-conventions.mdc`
- 全局 token 在 `library/styles/var.scss`，页面样式禁止硬编码色值和 px 数值

## 核心目标

围绕当前仓库的前端代码工作，稳定完成以下任务：

- 开发新页面或扩展已有页面
- 抽取或新增可复用组件
- 新增或修改 `src/api/*.ts` 接口封装
- 注册页面路由、配置路由守卫
- 在拿到接口契约后，把静态页面或半成品页面接成真实链路

**始终基于当前项目事实开发，不照搬无关框架的写法。**

---

## 标准工作流

无论是新需求还是 bug，都必须严格按这个顺序执行：

1. 分析需求 / bug，并阅读涉及的项目代码
2. 判断任务类型，并确认是否已有对应 `docs/dev-plan/` 计划文档
3. 向用户说明方案（涉及文件、核心决策、实施步骤、风险与验证方式）；方案里每个按钮、跳转、弹窗、文案、通知、新列都要标来源（用户原话 / PRD 条款 / 原型）
4. **输出任务清单**（见下方「任务粒度规范」）
5. 页面相关改动先创建或更新 `docs/dev-plan/` 计划与实施台账；大型或接口契约复杂任务可另补 `docs/` 方案文档
6. 等待用户确认或调整方案与任务清单
7. 用户同意后，再进入实际开发；每完成一个任务后更新清单状态
8. 修改后补验证结果、计划状态、实施台账和遗留事项

**强约束**：

- 用户提需求或 bug：先分析代码，再说明方案 + 任务清单，等待确认
- 用户直接要求「改代码」或「修一下」时，如果涉及多个文件或影响面较广，仍须先说明方案再确认
- 单文件、局部的明显修改（如改一个文字、加一个字段）可直接执行
- **spec 先行**：用户正在改 spec / PRD / 计划时，等它落定再编码，不按「旧 spec + 对话口头决策」自行脑补；已有实现与新 spec 有差异，先指出差异再动手
- **不发明界面元素**：自己觉得需要、但用户 / PRD / 原型都没提的按钮、跳转、弹窗、文案、通知、新列，单列为「建议（待产品确认）」，不写进正式改动表、不进代码。为什么：2026-10 曾在方案里自加「关联异常」跳转和「结款凭据」，被追问「这是哪里的设计」
- **可视化改动不自称「已修复」**：样式、布局、交互类改动，编译后 CSS 正确不代表浏览器渲染正确。改完只说「已改，请你验证」，优先起本地 `pnpm dev` 让用户在 localhost 实测，用户确认后才算修好、才在台账里记「已修复」

**确认前允许做的事情**：阅读代码、查文档、分析现状、新建或更新 `docs/dev-plan/*.md` / `docs/*.md` 方案类文档

**确认前禁止做的事情**：修改业务代码、新增页面/组件/接口、修改路由、直接联调或“顺手把代码一起改了”

---

## 先判断任务属于哪类

优先把任务归到下列类型之一，再决定补读哪些文件和 skill：

- 新页面 / 新菜单
- 页面改版或交互调整
- 列表页字段、搜索项、操作列、状态 Tab 调整
- 编辑弹窗 / 抽屉字段、校验、回显、提交调整
- 详情页或详情抽屉调整
- API / SDK / 接口契约对接
- 路由、权限、菜单入口调整
- Store / hooks / utils 改造
- bug 修复
- 样式、文案、设计规范补齐

不同类型决定后续要补读的模板、组件 README、接口契约和计划文档。

---

## 页面开发计划与实施台账

页面相关开发必须同步维护计划文档和实施台账，不能只改代码。

**适用范围**：

- 新增页面
- 修改页面功能
- 接口对接或接口字段调整
- 样式修改
- 页面交互、文案、权限、路由、表格、表单、详情等改动

**执行要求**：

1. 开发前先检查页面是否已有对应 `docs/dev-plan/` 计划文档。
2. 页面没有对应计划文档时，必须先创建对应 `docs/dev-plan/` 计划文档。
3. 页面已有对应计划文档时，必须延续原文档更新，不得另起无关文档。
4. 每次页面改动都要在计划文档中记录目标、范围、方案、影响点和验证方式。
5. 每次实施都要更新实施台账，记录时间、改动内容、涉及文件、接口变化、验证结果和遗留事项。
6. 接口对接、样式修改、页面结构调整、字段映射、权限控制、文案调整都必须在计划文档和台账中留痕。
7. 完成开发前再次确认计划文档和实施台账已更新。

### 计划文档要求

默认命名建议：`docs/dev-plan/YYYY-MM-DD-模块名-页面名-计划.md`。如果已有同页面文档，优先追加，不重复新建。

计划至少包含：

- 任务目标
- 当前现状与事实依据
- 涉及页面 / 组件 / API / SDK / 路由 / 权限
- 实施方案与任务拆分
- 接口字段差异 / 缺失记录
- 每个任务的验证方式
- 风险、阻塞项、待确认项
- 实施台账：时间、改动内容、涉及文件、接口变化、验证结果、遗留事项

Bug 计划额外要写：问题现象、复现路径、根因分析、修复方案、回归点。

大型改造或接口差异较多时，可另建 `docs/YYYY-MM-DD-模块名-开发方案.md`，并在 `docs/dev-plan/*.md` 中关联该方案路径。

---

## 任务粒度规范

方案确认后，必须将工作拆分为可跟踪的任务清单。**任务不能是粗粒度的大块，每个任务必须对应一个可独立验证的最小工作单元。**

### 何时需要拆分主任务 + 子任务

满足以下任一条件时，必须用主任务 + 子任务结构：

- 涉及 **3 个以上文件**的修改
- 需要新增 **路由 + API + 列表页 + 编辑组件** 的完整 CRUD
- 一个步骤包含多个独立可完成的操作
- 任务之间有明确的依赖顺序（如：先建 API 再建页面）

### 任务拆分示例

**❌ 粗粒度（禁止）**：

```
- [ ] 开发承运商管理页面
- [ ] 接入承运商接口
```

**✅ 细粒度（正确）**：

```
## 承运商管理

### 1. API 层
- [ ] 1.1 新增 src/api/carrier.ts，实现 getPage / doAdd / doEdit / doDelete
- [ ] 1.2 验证：接口请求/响应结构与契约一致

### 2. 列表页
- [ ] 2.1 创建 src/views/fulfillment/basic/carrier/index.vue，配置 columns / runRequest
- [ ] 2.2 实现搜索栏字段（承运商编码、名称、启用状态）
- [ ] 2.3 实现操作列（编辑、删除）及删除二次确认

### 3. 编辑弹窗
- [ ] 3.1 创建 vabAutoComponents/CarrierEdit.vue，配置 formFields
- [ ] 3.2 编辑时编码字段 disabledOnEdit，状态字段默认值 1
- [ ] 3.3 保存成功后触发 fetch-data 刷新列表

### 4. 路由
- [ ] 4.1 在 src/router/modules/fulfillment.ts 注册路由，name 与 defineOptions 一致

### 5. 验收
- [ ] 5.1 新增、编辑、删除流程走通
- [ ] 5.2 搜索条件与分页正常
```

### 拆分粒度标准

| 任务类型     | 最小粒度要求                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| API 文件     | 每个接口函数单独列出，注明 URL 和方法                                                                      |
| 列表页       | 拆分为：列配置 / 搜索字段 / 操作列 / 状态 Tab（如有）                                                      |
| 编辑弹窗     | 拆分为：字段配置 / 特殊控件 / 提交回调                                                                     |
| 路由注册     | 单独一个任务，注明 path / name / 所在文件                                                                  |
| 详情页       | 拆分为：主 Section / 各子 Section 独立请求 / 操作按钮                                                      |
| 接口字段差异 | 每处差异单独列一个子任务，挂在受影响的主任务下，加 `⚠️` 前缀；主任务必须等此子任务完成后才能标 `completed` |

### 使用 TodoWrite 工具跟踪

开发过程中用 `TodoWrite` 实时更新任务状态，**同一时刻只有一个任务处于 `in_progress` 状态**，完成后立即标记 `completed`，再开始下一个。

### 范围过大时必须拆主任务 + 子任务

出现下面任一情况，不要只写一条粗放任务：

- 同时涉及页面、组件、API / SDK、路由、权限、样式中的三类及以上
- 同时跨两个及以上业务域，例如履约 + 商城、直播 + 采购
- 预计会改动 6 个以上文件
- 需要先对齐接口，再改 UI，再补状态和回归
- 存在需要持续追踪的接口字段差异、权限 code、设计规范或后端确认项

拆分规则：

- 主任务描述一个完整可交付目标
- 主任务下拆 2-6 个子任务，每个子任务只负责一个稳定目标
- 子任务必须能单独验证，不能写“全部开发完成”这类空泛描述
- 接口字段差异 / 缺失要拆成明确子任务或待完成项，不只写进阻塞项
- 主任务状态由子任务状态汇总；只要还有一个子任务未完成，主任务就不能标记完成

---

## 开发前先建立上下文

开始编码前，先读取与任务直接相关的现有文件。

**优先阅读**：

1. 已有计划：`docs/dev-plan/*.md`
2. 相关页面：`src/views/{module}/{page}/index.vue`、`detail.vue`
3. 相关子组件：`src/views/{module}/{page}/vabAutoComponents/`
4. 相关 API：`src/api/{module}.ts`
5. SDK 生成函数：`src/sdk/{service}/{tag}.ts`（用于确认接口路径、参数名称和返回类型）
6. 路由配置：`src/router/modules/{module}.ts`
7. 接口契约：`接口契约/{module}.md`、`openapi*.json` 或后端文档（如存在）
8. 类型定义：`types/schemaTable.d.ts`、`types/schemaForm.d.ts`
9. 相关组件 README：如 `library/components/VabSchemaTable/README.md`
10. 产品 / UI 规范：`docs/standards/` 中与任务相关的文档

**现状调查以 `origin/dev` 为准**：排查 bug、评审现状时，工作区常签出在落后的功能分支，先确认相关文件与 `origin/dev` 无差异（`git diff origin/dev -- <path>`），有差异以 `git show origin/dev:<path>` 为准，并在计划文档「当前现状与事实依据」里写明基线 commit；派子代理调查时在 prompt 里写明这条基线要求。

先判断任务属于哪一类：

- **列表页**：`VabSchemaTable` + `VabSchemaFormDialog/Drawer`
- **详情页**：`VabDetailPage` + `VabDetailPageHeader` + `VabDetailSection`
- **独立表单页**：`VabSchemaForm` 嵌入自定义容器
- **其他（ECharts / 富文本 / 工作流等）**：参考 `library/template/` 中对应模板

不要凭印象套其他 Vue 管理后台、uni-app、小程序或 React 项目的做法。

---

## 三种页面模式

### 模式 1：列表页 → `VabSchemaTable`

```
src/views/{module}/{page}/
  index.vue                     ← 列表页
  vabAutoComponents/
    {PageName}Edit.vue           ← 编辑弹窗（VabSchemaFormDialog）
    {PageName}DrawerEdit.vue     ← 编辑抽屉（VabSchemaFormDrawer，可选）
src/api/{moduleName}.ts
```

**最小结构**（详细文档见 `.agents/skills/schema-crud/SKILL.md`）：

```vue
<template>
  <div class="xxx-container auto-height-container">
    <vab-schema-table
      ref="tableRef"
      :columns="columns"
      :request="runRequest"
      row-key="id"
      row-selection
      table-class="vab-narrow-table"
      @selection-change="selectRows = $event"
    >
      <template #toolbar-left="{ elSize }">
        <el-button :icon="Plus" :size="elSize" type="primary" @click="handleAdd">新增</el-button>
      </template>
      <template #cell-enabled="{ row, elSize }">
        <!-- 文案读后端 @DictLabel 注入的 enabledLabel；只有颜色可留前端判断 -->
        <el-tag :size="elSize" :type="row.enabled === 1 ? 'success' : 'danger'">
          {{ row.enabledLabel || '' }}
        </el-tag>
      </template>
      <template #actions="{ row, elSize }">
        <el-button :size="elSize" text type="primary" @click="handleEdit(row)">编辑</el-button>
        <el-button :size="elSize" text type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </vab-schema-table>
    <xxx-edit ref="editRef" @fetch-data="tableRef?.fetchData()" />
  </div>
</template>
```

### 模式 2：编辑弹窗/抽屉 → `VabSchemaFormDialog/Drawer`

```vue
<!-- vabAutoComponents/XxxEdit.vue -->
<template>
  <vab-schema-form-dialog
    ref="formDialogRef"
    :add-api="doAdd"
    :edit-api="doEdit"
    :fields="formFields"
    title-prefix="XXX"
    @saved="emit('fetch-data')"
  />
</template>
<script lang="ts" setup>
import type { SchemaFormDialogInstance, SchemaFormField } from '~/types/schemaForm'
import { doAdd, doEdit } from '/@/api/xxx'
defineOptions({ name: 'XxxEdit' })
const emit = defineEmits(['fetch-data'])
const formDialogRef = ref<SchemaFormDialogInstance>()
const formFields: SchemaFormField[] = [
  { field: 'code', label: '编码', required: true, disabledOnEdit: true },
  { field: 'name', label: '名称', required: true },
  {
    field: 'enabled',
    label: '状态',
    control: 'select',
    defaultValue: 1,
    options: [
      { label: '启用', value: 1 },
      { label: '停用', value: 0 },
    ],
  },
  { field: 'remark', label: '备注', control: 'textarea', colSpan: 24 },
]
const showEdit = (row?: any) => formDialogRef.value?.showEdit(row)
defineExpose({ showEdit })
</script>
```

**容器选择**：字段 ≤ 12 且无子表格 → `Dialog`；字段多或含子表格 → `Drawer`

### 模式 3：详情页 → `VabDetailPage`

```
src/views/{module}/{page}/
  detail.vue                    ← 详情页
  vabAutoComponents/
    {PageName}Detail.vue         ← 详情抽屉（VabDetailPageDrawer，内嵌时）
```

```vue
<template>
  <vab-detail-page :request="getXxxDetail" class="no-background-container">
    <template #default="{ detail }">
      <vab-detail-page-header>
        <template #title>{{ detail?.name }}</template>
        <template #extra><el-button>编辑</el-button></template>
      </vab-detail-page-header>
      <vab-detail-section title="基础信息">
        <el-descriptions border :column="3">
          <el-descriptions-item label="编码">{{ detail?.code }}</el-descriptions-item>
        </el-descriptions>
      </vab-detail-section>
      <vab-detail-section title="明细" :request="getLines" :request-params="{ id: detail?.id }">
        <template #default="{ data }">
          <el-table border class="vab-narrow-table" :data="data">...</el-table>
        </template>
      </vab-detail-section>
    </template>
  </vab-detail-page>
</template>
```

详细文档见 `.agents/skills/detail-page/SKILL.md`。

---

## API 规范

### 调用方式规则

**【强制】新开发的页面和接口必须使用 SDK，禁止手写 `request`。**

| 场景             | 要求                                          |
| ---------------- | --------------------------------------------- |
| 新页面 / 新接口  | **必须用 SDK**（`src/sdk`），禁止手写 request |
| 改老页面时顺手换 | 应同步切换为 SDK                              |
| 老页面稳定运行中 | 保留原有写法，不要为了换而换                  |

---

### 方式一：类型化 SDK（新页面强制）

SDK 由 [orval](https://orval.dev/) 根据后端 OpenAPI spec 自动生成，位于 `src/sdk/`，**path / query / body / response 全部有类型推导**。

**目录结构**：

```
src/sdk/
├── mutator.ts              # HTTP adapter（复用 /@/utils/request 拦截器）
├── system-core/            # 按 tag 分文件（menu.ts / user.ts / dict.ts / ...）
│   └── models/             # 每个 DTO 一个文件
├── commerce-core/
├── fulfillment-core/
└── settlement-core/
```

**用法示例**（从具体 service/tag 文件 import 具名函数）：

```typescript
// 从对应 service 的 tag 文件 import 函数
import { menuCreate, menuUpdate, menuTreeList } from '/@/sdk/system-core/menu'
import { wmsRoomCreate, wmsRoomUpdate, wmsRoomDelete, wmsRoomPage } from '/@/sdk/fulfillment-core/room'
import { mallCategoryAll } from '/@/sdk/commerce-core/mall-category'

// GET（params 直接传对象）
const { data: tree } = await menuTreeList()
// tree: MenuTreeNodeDTO[]   — IDE 悬停可见字段类型

// POST with body
const { data: newId } = await menuCreate({ menuName: '新菜单', menuType: 1 })

// id 在 query（后端 update / delete 约定）
await menuUpdate(
  { menuName: '改名' }, // body（第一个参数）
  { id: '123' } // query params（第二个参数）
)

// 纯 query params 的 POST（delete 常见模式）
await wmsRoomDelete({ id: row.id })
```

**函数命名规律**：`{resource}{Action}`，如 `menuCreate`、`wmsRoomUpdate`、`wmsZonePage`。在 IDE 里输入 `wmRoom` 即可联想出所有仓间相关函数。

**更新 SDK**（后端改了 DTO 或新增接口后执行）：

```bash
pnpm gen:sdk:pull   # 从 dev 网关拉最新 spec 并重新生成（日常用）
pnpm gen:sdk        # 离线模式：不拉 spec，只用缓存重新生成
```

**服务 → 目录对照**：

| service          | 目录                        | 路径前缀            |
| ---------------- | --------------------------- | ------------------- |
| system-core      | `src/sdk/system-core/`      | `/system-core`      |
| commerce-core    | `src/sdk/commerce-core/`    | `/commerce-core`    |
| fulfillment-core | `src/sdk/fulfillment-core/` | `/fulfillment-core` |
| settlement-core  | `src/sdk/settlement-core/`  | `/settlement-core`  |

**在 `src/api/*.ts` 中封装 SDK 调用**（推荐，保持页面代码整洁）：

```typescript
// src/api/room.ts
import { wmsRoomCreate, wmsRoomUpdate, wmsRoomDelete, wmsRoomPage } from '/@/sdk/fulfillment-core/room'

export const getPage = (params: any) => wmsRoomPage(params)
export const doAdd = (data: any) => wmsRoomCreate(data)
export const doEdit = (data: any) => wmsRoomUpdate(data, { id: data.id })
export const doDelete = (id: string) => wmsRoomDelete({ id })
```

> **直接在页面 import SDK 函数也完全可以**，封装 `src/api/*.ts` 仅为保持页面代码整洁，不是强制要求。

---

### 方式二：手写 request（仅限老页面维护）

> ⚠️ **新页面禁止使用此方式**，仅允许在维护已有老页面时保留或小范围修改。

```typescript
// src/api/xxx.ts（老页面兼容，禁止新页面使用）
import request from '/@/utils/request'
import { apiModuleMap } from '/@/config/net.config'

export const getPage = (params: any) => request({ url: '/v1/xxx/page', method: 'get', params, module: apiModuleMap.fulfillmentCore })
export const doAdd = (data: any) => request({ url: '/v1/xxx/add', method: 'post', data, module: apiModuleMap.fulfillmentCore })
export const doEdit = (data: any) => request({ url: '/v1/xxx/edit', method: 'post', data, module: apiModuleMap.fulfillmentCore })
export const doDelete = (id: string) => request({ url: `/v1/xxx/${id}`, method: 'delete', module: apiModuleMap.fulfillmentCore })
export const getDetail = (params: any) => request({ url: `/v1/xxx/${params.id}`, method: 'get', module: apiModuleMap.fulfillmentCore })
```

**apiModuleMap 对照**：

| key               | 模块前缀            |
| ----------------- | ------------------- |
| `systemCore`      | `/system-core`      |
| `fulfillmentCore` | `/fulfillment-core` |
| `commerceCore`    | `/commerce-core/v1` |
| `contentCenter`   | `/content-center`   |
| `settlementCore`  | `/settlement-core`  |

**禁止**：硬编码模块前缀字符串、直接用 `axios`、自己实现幂等键（用 `genIdempotencyKey()` from `/@/utils`）

---

## Git / PR 约束

- 在本仓库执行 `git commit` 时，提交说明必须使用中文
- 除非用户明确指定其他目标分支，创建 PR 时默认目标分支为 `dev`
- 如果本轮做了多个独立可验证的小任务，优先拆成多个中文提交
- 不要主动提交或推送，除非用户明确要求

---

## 路由规范

```typescript
// src/router/modules/xxx.ts
import Layout from '/@vab/layouts/index.vue'

export const xxxRoutes = [
  {
    path: '/xxx',
    name: 'Xxx',
    component: Layout,
    meta: { title: '模块名', icon: 'Box' },
    children: [
      {
        path: 'list', // kebab-case，不带前导 /
        name: 'XxxList', // PascalCase，与 defineOptions.name 一致
        component: () => import('/@/views/xxx/list/index.vue'),
        meta: { title: '页面标题', icon: 'House' },
      },
    ],
  },
]
```

**然后在 `src/router/modules/index.ts` 中引入并合并路由数组。**

Meta 字段：`hidden: true`（隐藏菜单）、`noKeepAlive: true`（不缓存）、`guard: ['Admin']`（角色限制）

---

## 组件规范

```typescript
<script lang="ts" setup>
// 1. 外部导入（Element Plus 图标、类型、API）
import { Plus } from '@element-plus/icons-vue'
import { getPage } from '/@/api/xxx'
import type { SchemaTableColumn } from '~/types/schemaTable'

// 2. 组件名（必须）
defineOptions({ name: 'XxxManagement' })  // 与路由 name 一致

// 3. Props / Emits
// 4. ref / reactive / computed
// 5. 生命周期
// 6. 方法函数
// 7. defineExpose
</script>
<style lang="scss" scoped>
.xxx-container { }
</style>
```

**子组件**放入 `vabAutoComponents/` 目录，自动注册无需 import。

---

## 常用约定速查

### 自动导入（无需手动 import）

`ref` `reactive` `computed` `watch` `onMounted` `nextTick` 等 Vue API、`useRouter` `useRoute`、所有 VueUse 函数、Element Plus 组件、`$baseMessage` `$baseConfirm` `$baseAlert` `$baseNotify` `$baseLoading`

### 反馈操作

```typescript
$baseMessage('删除成功', 'success', 'hey')                          // 消息提示
$baseConfirm('确定删除吗？', null, async () => { ... })             // 删除确认
$baseNotify('操作已完成', '提示', 'success')                        // 通知
```

### 权限控制（v-permissions）

```vue
<el-button v-permissions="{ permission: ['product:create'] }" type="primary">新增</el-button>
<el-button v-permissions="{ permission: ['product:delete'] }" text type="danger">删除</el-button>
<!-- 角色控制 -->
<el-button v-permissions="['Admin']">管理员操作</el-button>
```

**禁止** `v-if="userStore.role === 'Admin'"` 或手动判断权限。

### 字典枚举与状态文案

**状态码 → 中文一律走后端字典，禁止在 `.vue` 里写 code→中文 map。** 为什么：前端 map 会和后端枚举漂移，后端新增一个状态、前端漏一个键，页面就裸露英文 code。

- **展示文案**：后端 DTO 字段加 `@DictLabel("dict_key")`，响应里会自动注入 `{字段名}Label`（如 `settleStatus` → `settleStatusLabel`）。前端直接读 `row?.settleStatusLabel || ''`，兜底只能是空 / `—`，不能是本地 map 或原 code。
- **下拉选项**：用字典接口拉选项（绑定 code）；已加载选项后需要按 code 回显 label 时用 `resolveDictLabel`。

```typescript
import { getDictItemsByKey } from '/@/api/dictManagement'
import { DICT_KEY_XXX } from '/@/constants/dictKeys' // key 常量统一放这里

const statusOptions = ref<any[]>([])
const { data } = await getDictItemsByKey(DICT_KEY_XXX) // data: { code, label }[]
statusOptions.value = data

// 已加载选项后按 code 取 label 的页面内小工具（项目里各页面自带，没有全局导出）
// 找不到时返回空，不回退 code（与 api-contract-strict 一致）
const resolveDictLabel = (options: any[], code?: string | null) =>
  options.find((i) => i.code === code)?.label ?? ''
```

- **颜色可以留前端**：`el-tag` 的 `type`（success / warning / danger）这类纯视觉映射允许用前端小 map，文案仍取 `xxxLabel`。
- **没有字典就让后端建**：缺 `xxxLabel` 或缺字典时，记为 `⚠️ 【待后端】新建字典 + DTO 加 @DictLabel` 子任务，不要在前端先写一份 map 顶上。
- 表单里的启用/停用这类固定二值选项可直接写 `options`；列表/详情的展示文案仍读 `Label`。

### 间距与颜色

- 所有 `margin` / `padding` / `gap` 必须用 CSS token：`var(--spacing-1)` 至 `var(--spacing-6)`（4px ~ 24px）
- 颜色用 EP 变量：`var(--el-text-color-primary)`、`var(--el-fill-color-blank)`、`var(--el-color-primary)` 等
- **禁止**硬编码色值（`#333`）或 px 数值

### flex 布局挤压（易错）

flex 子项被挤没、宽度被挤到 0 时，**先怀疑比例 flex-grow**（如 `flex: 1.4` 对 `flex: 1`）——比例分配在内容宽度变化时不可靠：

- 内容有上限的元素（下拉、标签、按钮组）给**固定宽度**：`flex: 0 0 280px`（宽度值按设计取 token 或组件既有尺寸）
- 弹性空间只留给**唯一**需要伸缩的输入元素：`flex: 1` + `min-width` 兜底
- 不要在比例数字上反复调参；只加 `min-width: 0` 往往不够

为什么：2026-10 触发条件编辑抽屉里子项被挤没，第一次只加了 `min-width: 0` 就说修好了，用户实测并没好；改成「固定宽度 + 唯一弹性项」才解决。改完按「可视化改动不自称已修复」让用户实测确认。

### 组件尺寸

- `VabSchemaTable` slot 内用暴露的 `elSize`，**禁止** `size="small"`
- 其他场景：`getDensityEpSize(settingsStore.theme?.layoutDensity)`

### 字段命名

所有字段名统一 **camelCase**：`parentId` 不写 `parent_id`

---

## 遇到接口契约时

收到接口文档后，先做对齐，再改代码。

**对齐步骤**：

1. 对照现有 `src/api/{module}.ts`，整理：动作 / 接口路径 / 请求方法 / 参数 / 响应字段 / 是否已封装 / 是否有差异
2. 先改 `api/*.ts`，再改页面
3. 页面字段尽量与后端契约字段一致，不要自造别名
   - 确认接口的**调用端**：同一业务在 PC 后台、BD App、店长 H5 往往是不同入口接口，本项目只能对接 PC 端接口；计划文档的接口表加「调用端」列，多端共用写 `PC + APP` 并说明差异
   - 需要后端改契约时只提**向后兼容**的诉求：现有接口不换不删，只追加可选字段 / 枚举值；已有状态值保留；新分类先对齐现有枚举
4. 如果发现字段差异或缺失，**必须记录为任务清单中的待完成子任务**（见下方规则），不可私造字段兜底，不可跳过

**特殊链路**：

- 幂等键：`idempotencyKey: genIdempotencyKey()`（from `/@/utils`）
- 枚举值：从 `getDictItemsByKey(DICT_KEY_XXX)` 拉取；展示文案读后端 `@DictLabel` 注入的 `{field}Label`（见「字典枚举与状态文案」）

---

## 接口字段差异 / 缺失的处理规则

**【强制】** 在分析方案阶段，发现后端接口字段与前端需要的字段有差异或缺失时：

1. **在方案说明中明确列出差异**，格式为：
   - 字段名、差异类型（缺失 / 命名不一致 / 类型不符）、影响的功能点
2. **同步在任务清单中新增一个待完成子任务**，挂在受影响的主任务下，例如：
   ```
   ### 2. 列表页
   - [ ] 2.1 创建 index.vue，配置 columns / runRequest
   - [ ] 2.2 实现搜索栏字段
   - [ ] ⚠️ 2.3 【待后端】响应缺少 `supplierName` 字段，需后端在列表接口补充，完成后绑定列渲染
   ```
3. **主任务的完成状态以所有子任务全部完成为准**，含「待后端」子任务在内；只要有未完成子任务，主任务不得标记为 `completed`
4. **开发时跳过依赖缺失字段的部分**，保留占位注释（`// TODO: 等待后端补充 supplierName`），不私造假数据、不硬编码
5. 后端补充后，找到对应待完成子任务，完成开发，更新任务状态

**差异子任务命名规范**：

| 情形           | 子任务前缀        | 说明                             |
| -------------- | ----------------- | -------------------------------- |
| 需后端补充字段 | `⚠️ 【待后端】`   | 等后端 DTO 增加字段              |
| 需后端确认命名 | `⚠️ 【待确认】`   | 字段存在但命名与文档不符，需确认 |
| 需前端适配转换 | `⚠️ 【前端适配】` | 字段名/类型需要前端做 map 转换   |

**禁止**：将字段差异归入「阻塞」而不建任务、私造不存在的字段、使用硬编码默认值掩盖缺口

---

## 错误暴露原则（禁止前端吞掉问题）

**【强制】前端不得以任何方式掩盖、消化或静默处理问题，所有异常必须真实暴露出来。**

### 禁止行为

| 禁止写法                                                                       | 原因                                   |
| ------------------------------------------------------------------------------ | -------------------------------------- |
| `catch` 块内只写 `console.log` 或留空                                          | 错误被静默吞掉，用户和开发者都无感知   |
| 接口返回异常字段时前端自行填默认值兜底                                         | 掩盖了后端数据问题，排查时看不到根因   |
| 用 `??`、`\|\|` 把 `null/undefined` 替换为业务含义的假值（如 `0`、`''`、`[]`） | 让错误数据悄无声息地流入渲染层         |
| `try/catch` 捕获后不向用户提示、不向上抛出                                     | 操作实际失败但页面无任何反馈           |
| 字段缺失时前端自行计算或推断填充                                               | 参见「数据完整性」规范，计算值不可信任 |

### 正确做法

```typescript
// ❌ BAD —— 吞掉错误
try {
  await doSubmit(form)
} catch (e) {
  console.log(e)
}

// ✅ GOOD —— 暴露错误，给用户明确反馈
try {
  await doSubmit(form)
  $baseMessage('提交成功', 'success', 'hey')
} catch (e) {
  // 框架级拦截器已处理通用报错时可省略 catch；
  // 若需要局部处理，必须同时向用户展示提示并保留原始错误信息
  $baseMessage('暂时无法提交，请检查后重试', 'error', 'hey')
  throw e // 继续向上抛出，不截断错误链路
}

// ❌ BAD —— 用假值兜底
const name = detail?.name ?? '未知' // '未知' 具有业务含义，掩盖了数据缺失

// ✅ GOOD —— 直接渲染空值，让缺失可见
const name = detail?.name ?? '' // 显示为空，问题立即可见
```

### 特别说明

- **框架级拦截器**（`/@/utils/request.ts` 内的响应拦截）已统一处理接口报错弹窗，业务代码中不需要为每个请求重复 catch；但**不得**在业务层再次 catch 后不做任何处理（等同于覆盖了拦截器的提示）。
- **字段缺失**时：渲染层留空（`—` 或空字符串），绝不填入具有业务语义的占位值；同时按「接口字段差异 / 缺失的处理规则」记录为待完成子任务。
- **SDK 调用**同样适用：SDK 函数抛出异常时，不得在调用处静默 catch，必须让错误冒泡至用户可感知的层级。
- **业务提示要讲清因果与处理**：自写的页面提示、异常说明、通知文案不能只写「打款失败」或透传后端技术原文，要讲清：什么问题（带对象/金额）、具体原因（业务语言）、影响、系统已做了什么、该谁处理、怎么处理（入口+步骤）、处理后怎样。文案里引用的入口、按钮、时效要在 `src/router/**` 和页面代码里查到，查不到标【待确认】。格式见 `references/conventions.md`「九、文案规范速查」。

---

## 开发后必须补的内容

至少完成这些收口：

- 更新对应 `docs/dev-plan/*.md` 的任务状态、实施台账、验证结果和遗留事项
- 如果新增或调整接口字段，记录接口变化与字段差异处理结果
- 如果改了路由、权限、菜单入口，补充对应验证记录
- 运行与改动范围匹配的检查；无法运行时说明原因
- 补齐关键页面的 loading / empty / error / success / disabled 状态说明；请求失败要落在 error，不伪装成 empty / success
- 样式 / 布局 / 交互改动：说明「已改，请验证」并给出本地 `pnpm dev` 下的访问路径，用户实测确认前台账里不写「已修复」
- 如果有阻塞项，明确写入计划或方案文档，不只留在对话里

---

## 交付前检查清单

- [ ] 路由已在 `src/router/modules/{module}.ts` 注册，`name` 与 `defineOptions.name` 一致
- [ ] 列表页根 div 有 `auto-height-container` class
- [ ] 详情页根 div 有 `no-background-container` class
- [ ] 编辑子组件放入 `vabAutoComponents/`，无需手动 import
- [ ] `defineOptions({ name: '...' })` 已声明
- [ ] **新页面接口强制使用 SDK**（从 `/@/sdk/{service}/{tag}` import 具名函数），禁止手写 request
- [ ] 老页面维护时若使用 request，确保 `apiModuleMap.xxx` 正确，未硬编码模块前缀字符串
- [ ] 没有手写 `el-table` / `el-table-column` / `el-form-item`（用 Schema 组件）
- [ ] 删除/停用等危险操作有 `$baseConfirm` 确认
- [ ] 操作后调 `tableRef.value?.fetchData()`（保持分页）或 `reload()`（重置分页）
- [ ] 权限控制使用 `v-permissions` 指令
- [ ] 样式使用 `var(--spacing-*)` 和 EP 变量，无硬编码色值和 px
- [ ] 没有在 `.vue` 里新增状态 code→中文 map；展示读 `{field}Label`，下拉走 `getDictItemsByKey`
- [ ] 新增的按钮 / 跳转 / 弹窗 / 文案 / 通知 / 列都能指到来源，无来源的已单列「建议（待产品确认）」
- [ ] 页面提示、错误提示讲清问题、原因、影响、谁处理、怎么处理，没有透传技术原文
- [ ] 可视化改动已请用户在 localhost 实测，未自称「已修复」
- [ ] 页面对应 `docs/dev-plan/` 计划文档和实施台账已同步更新

---

## 遇到阻塞时

**字段差异/缺失不属于阻塞**，按「接口字段差异 / 缺失的处理规则」记录为待完成子任务后，继续开发其余部分。

真正需要停下来确认的阻塞场景（这类问题无法通过记录任务绕过）：

- **整条接口路径不存在**：文档或生成类型里完全找不到该接口，无法封装 API
- **核心提交流程缺少必要接口**：例如表单保存依赖的 POST 接口尚未提供，整个功能流程无法闭环
- **接口行为与文档描述严重矛盾**：无法判断以哪个为准，继续开发会导致逻辑错误
- **权限 code 未定义**：`v-permissions` 所需的 permission code 未在后端或权限文档中声明

遇到真正的阻塞时，输出：**现状描述 / 缺口原因 / 建议的前端处理方式 / 需要后端或产品确认的最小信息**，等待反馈后再继续。

---

## 扩展场景参考

Schema 体系无法覆盖时，查阅 `library/template/` 中的手写模板：

| 场景           | 参考模板                                         |
| -------------- | ------------------------------------------------ |
| ECharts 图表   | `library/template/other/echarts/index.vue`       |
| 富文本编辑器   | `library/template/vab/editor/wangEditor.vue`     |
| 大数据虚拟表格 | `library/template/vab/table/bigDataTable.vue`    |
| 行内编辑表格   | `library/template/vab/table/inlineEditTable.vue` |
| 上传组件       | `library/template/vab/upload/index.vue`          |
| 甘特图         | `library/template/other/gantt/index.vue`         |
| 工作流         | `library/template/other/workflow/index.vue`      |

## 更多详细规范

- Schema CRUD 完整文档：`.agents/skills/schema-crud/SKILL.md`
- 详情页完整文档：`.agents/skills/detail-page/SKILL.md`
- 工程总规范：`.cursor/rules/master-conventions.mdc`
- 产品/UI 规范：`docs/standards/`
- 类型化 SDK 完整说明：`src/sdk/README.md`
- 详细速查参考：`.cursor/skills/octopus-admin-dev/references/conventions.md`
