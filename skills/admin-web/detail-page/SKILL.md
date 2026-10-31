---
name: detail-page
description: |
  详情页组件开发指南。使用 VabDetailPage + VabDetailPageHeader + VabDetailSection 组件，
  快速构建 B 端详情页面，支持主请求 + 分区独立请求、骨架屏加载、错误重试、可折叠分区。
  适用于所有详情页、查看页场景，可用于独立路由页或嵌入抽屉/弹窗中。
metadata:
  last-updated: '2026-10-31'
---

# 详情页组件开发指南

> **核心思路**：用 `VabDetailPage` 管理主请求 + 加载/错误状态，`VabDetailPageHeader` 统一顶栏，`VabDetailSection` 分区展示。
> 一个典型详情页只需 **请求函数 + 描述布局 + 分区插槽**，不写任何手动 loading/error 管理。
> **接口对接强约束**：详情页字段展示必须直接对齐 SDK / OpenAPI / 后端接口；没有的字段保持空态或不展示，禁止前端自造字段、拼语义字段、补 `[]` / `{}` / `0` / `''` 或补猜测值。
> **详情纯展示强约束**：详情页里凡是字典、枚举、状态、业务类型等中文纯文本展示，优先读取对应 `{field}Label` 字段；如果预期的 `Label` 没返回，默认保持空态，不回退 code 值或本地中文映射。
> **`Label` 的来源与缺失处理**：后端 DTO 字段加 `@DictLabel("dict_key")` 自动注入 `{字段名}Label`（如 `settleStatus` → `settleStatusLabel`），模板写 `detail?.settleStatusLabel || ''`。缺 Label 就让后端新建字典 + 加注解，**不要在 `.vue` 里写 code→中文 map 或三元中文**（会和后端枚举漂移，漏键就裸露英文 code）；只有 `el-tag` 的颜色 `type` 可以留前端小 map。
> **`Label` 不用于编辑回显**：如果详情页支持编辑，编辑态下拉、单选、远程选择回显仍绑定原字段 value/code，不把 `{field}Label` 当成表单值。
> 涉及字段映射、返回值归一化、临时兼容判断时，同时遵守 [`../api-contract-strict/SKILL.md`](../api-contract-strict/SKILL.md)。
> **菜单强约束**：侧栏菜单以后端返回为准。新增详情页不要再声明一条可见静态菜单。无独立入口的详情路由必须 `meta.hidden: true`，并用 `activeMenu` 指向后端菜单。

---

## 一、文件结构约定

```
src/views/{module}/{page}/
  detail.vue                             ← 详情页（VabDetailPage）
  index.vue                              ← 列表页（VabSchemaTable）
  vabAutoComponents/
    {PageName}Edit.vue                   ← 编辑弹窗
src/api/{moduleName}.ts                  ← API 函数
```

- 详情页根 div **必须**加 `no-background-container`（去除默认背景和内边距）
- `defineOptions({ name: 'ComponentName' })` **必须**声明
- 详情页通常从列表页跳转进入，也可嵌入抽屉（`:show-back="false"`）

---

## 二、三种数据加载模式

### 模式 1：主请求一次拿全

最常用。一个接口返回所有数据，Section 直接消费主数据。

```vue
<vab-detail-page :request="getFullDetail" class="no-background-container">
  <template #default="{ detail }">
    <vab-detail-section title="基础信息">
      <el-descriptions border :column="3">
        <el-descriptions-item label="名称">{{ detail?.name }}</el-descriptions-item>
      </el-descriptions>
    </vab-detail-section>
    <vab-detail-section title="明细">
      <el-table :data="detail?.lines" border>...</el-table>
    </vab-detail-section>
  </template>
</vab-detail-page>
```

### 模式 2：主请求 + Section 独立请求

主数据加载完后，子 Section 根据主数据中的 id 自动发起独立请求。

```vue
<vab-detail-page :request="getDetail" class="no-background-container">
  <template #default="{ detail }">
    <vab-detail-section title="基础信息">
      <!-- 直接使用主数据 -->
    </vab-detail-section>
    <vab-detail-section title="明细" :request="getLines" :request-params="{ orderId: detail?.id }">
      <template #default="{ data }">
        <el-table :data="data" border>...</el-table>
      </template>
    </vab-detail-section>
  </template>
</vab-detail-page>
```

### 模式 3：纯壳 + 全部独立请求

VabDetailPage 不传 request，仅作为容器。各 Section 各自请求。

```vue
<vab-detail-page class="no-background-container">
  <template #default>
    <vab-detail-section title="基础信息" :request="getBasic" :request-params="{ id: route.query.id }">
      <template #default="{ data }">...</template>
    </vab-detail-section>
  </template>
</vab-detail-page>
```

---

## 三、VabDetailPage — 详情页容器

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `request` | `(params) => Promise<any>` | — | 主数据请求函数 |
| `paramKeys` | `string[]` | `['id']` | 从 route.params/query 中提取的参数名 |
| `immediate` | `boolean` | `true` | 是否立即请求 |
| `errorRetryText` | `string` | `'重新加载'` | 错误重试按钮文案 |

### Slot

| Slot | 作用域 | 说明 |
|------|--------|------|
| `#default` | `{ detail, loading, error, reload }` | 主内容区 |

- `detail`：主数据（ref）
- `loading`：主请求 loading 状态
- `error`：主请求错误
- `reload()`：重新请求

### Expose

| 方法/属性 | 说明 |
|-----------|------|
| `detail` | 主数据 ref |
| `loading` | loading ref |
| `error` | error ref |
| `reload()` | 重新请求 |

### Provide/Inject

VabDetailPage 通过 `provide` 注入 `DetailPageContext`（`DETAIL_PAGE_CONTEXT_KEY`），子组件可通过 `inject` 获取。
同时也通过 slot props 暴露，两种方式选更方便的。

### 加载行为

- 有 `request` + `loading` 时：渲染 `el-skeleton`（骨架屏）
- 有 `request` + `error` 时：渲染 `el-result` + 重试按钮
- 其他：渲染 `#default` 插槽内容

---

## 四、VabDetailPageHeader — 顶栏

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `backText` | `string` | `'返回'` | 返回按钮文案 |
| `onBack` | `() => void` | — | 自定义返回处理（抽屉场景传 close 函数） |
| `showBack` | `boolean` | `true` | 是否显示返回按钮。**抽屉/弹窗内设为 false** |

### Slots

| Slot | 说明 |
|------|------|
| `#title` | 主标题区（标题文字 + 标签等） |
| `#sub` | 副标题行 |
| `#extra` | 右侧操作按钮区 |

### 两种渲染模式

- `showBack=true`（默认）：渲染 `el-page-header`，返回按钮执行 `delVisitedRoute` + `history.back()`
- `showBack=false`：渲染纯 flex 布局（标题 + extra），不依赖路由，适合抽屉/弹窗内使用

### 示例

```vue
<vab-detail-page-header>
  <template #title>
    <span class="text-lg font-semibold">{{ detail?.orderNo }}</span>
    <el-tag type="success">已完成</el-tag>
  </template>
  <template #sub>创建时间：<vab-date-time :value="detail?.createdAt" /></template>
  <template #extra>
    <el-button type="primary">审核</el-button>
  </template>
</vab-detail-page-header>
```

> **时间字段必须用 `<vab-date-time>`，不要裸渲染**。详情页/卡片/`el-descriptions-item`/`el-table-column` 里显示后端时间(createdAt/updatedAt/xxxAt/xxxTime/有效期等),一律：
> ```vue
> <vab-date-time :value="detail?.createdAt" />          <!-- 2026-06-05 16:56 -->
> <vab-date-time :value="x" mode="date" />              <!-- 纯日期 2026-06-05 -->
> <vab-date-time :value="x" :seconds="true" />          <!-- 带秒 -->
> ```
> 禁止 `{{ detail?.createdAt }}`(后端是带 T 的东八区墙上时间,裸渲染会显示 `2026-06-05T16:56:48`)。时区/格式/空值已由组件统一处理(`/@/utils/dateFormat`),**不要自己 `new Date` 或转时区**。

---

## 五、VabDetailSection — 分区卡片

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | `''` | 分区标题 |
| `request` | `(params?) => Promise<any>` | — | 独立请求函数 |
| `requestParams` | `Record<string, any>` | — | 请求参数（响应式，变化时自动重新请求） |
| `immediate` | `boolean` | `true` | 是否立即请求 |
| `collapsible` | `boolean` | `false` | 是否可折叠 |
| `collapsed` | `boolean` | `false` | 默认折叠状态 |
| `shadow` | `'always' \| 'never' \| 'hover'` | `'never'` | el-card shadow |

### Slots

| Slot | 作用域 | 说明 |
|------|--------|------|
| `#default` | `{ data, loading, error, reload }` | 内容区 |
| `#extra` | — | 卡片 header 右侧操作区（如「新增」按钮） |
| `#title` | — | 覆盖整个标题行 |

### Expose

| 方法/属性 | 说明 |
|-----------|------|
| `data` | Section 数据 ref |
| `loading` | loading ref |
| `error` | error ref |
| `reload()` | 重新请求 |

### requestParams 智能等待

- 当 `requestParams` 中有 `undefined` 或 `null` 值时，**不会发起请求**
- 当父组件主数据加载完成，params 中的值从 `undefined` 变为实际值时，**自动触发请求**
- 示例：`:request-params="{ orderId: detail?.id }"` — detail 未加载时 orderId 为 undefined，加载完后自动请求

---

## 六、完整实战示例

### 路由页面（承运商详情）

```vue
<template>
  <vab-detail-page :request="getCarrierDetail" class="no-background-container">
    <template #default="{ detail }">
      <vab-detail-page-header>
        <template #title>
          <span class="text-lg font-semibold">{{ detail?.carrierName }}</span>
          <!-- 颜色可前端判断；文案读后端 @DictLabel 注入的 enabledLabel，不写三元中文 -->
          <el-tag :type="detail?.enabled ? 'success' : 'danger'">
            {{ detail?.enabledLabel || '' }}
          </el-tag>
        </template>
        <template #sub>承运商编码：{{ detail?.carrierCode }}</template>
        <template #extra>
          <el-button :icon="Edit">编辑</el-button>
        </template>
      </vab-detail-page-header>

      <vab-detail-section title="基础信息">
        <el-descriptions border :column="3">
          <el-descriptions-item label="承运商名称">{{ detail?.carrierName }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ detail?.contactName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detail?.contactPhone }}</el-descriptions-item>
        </el-descriptions>
      </vab-detail-section>

      <vab-detail-section title="服务区域" :request="getServiceAreas" :request-params="{ carrierId: detail?.id }">
        <template #extra>
          <el-button size="small" type="primary">新增区域</el-button>
        </template>
        <template #default="{ data }">
          <el-table border class="vab-narrow-table" :data="data">
            <el-table-column label="区域名称" prop="areaName" />
            <el-table-column label="覆盖城市" prop="cities" />
          </el-table>
        </template>
      </vab-detail-section>

      <vab-detail-section collapsible :request="getOpLogs" :request-params="{ carrierId: detail?.id }" title="操作日志">
        <template #default="{ data }">
          <el-table border class="vab-narrow-table" :data="data">
            <el-table-column label="时间" prop="operatedAt" width="170" />
            <el-table-column label="操作人" prop="operatorName" width="120" />
            <el-table-column label="动作" prop="action" />
          </el-table>
        </template>
      </vab-detail-section>
    </template>
  </vab-detail-page>
</template>

<script lang="ts" setup>
import { Edit } from '@element-plus/icons-vue'
import { getDetail as getCarrierDetail } from '/@/api/carrier'
import { getServiceAreas, getOpLogs } from '/@/api/carrier'

defineOptions({ name: 'CarrierDetail' })
</script>
```

### 抽屉中使用（无返回按钮）

```vue
<el-drawer v-model="visible" size="80%" title="订单详情">
  <vab-detail-page :request="getOrderDetail" :param-keys="[]">
    <template #default="{ detail }">
      <vab-detail-page-header :show-back="false">
        <template #title>
          <span class="text-lg font-semibold">{{ detail?.orderNo }}</span>
        </template>
      </vab-detail-page-header>

      <vab-detail-section title="基础信息">
        <el-descriptions border :column="2">
          <el-descriptions-item label="订单号">{{ detail?.orderNo }}</el-descriptions-item>
        </el-descriptions>
      </vab-detail-section>
    </template>
  </vab-detail-page>
</el-drawer>
```

**注意**：抽屉场景下 `:param-keys="[]"` 避免从 route 取参数，改为在 request 函数中直接传入 id。

---

## 七、API 函数约定

详情页 API 函数遵循项目现有规范：

```typescript
// src/api/carrier.ts
import request from '/@/utils/request'

// 获取详情（主请求）
export const getDetail = (params: any) => request({
  url: `/fulfillment-core/wms/carrier/${params.id}`,
  method: 'get',
})

// 获取服务区域（Section 独立请求）
export const getServiceAreas = (params: any) => request({
  url: '/fulfillment-core/wms/carrier/service-areas',
  method: 'get',
  params,
})
```

---

## 八、金额列格式化

详情页中展示金额同样使用全局约定：

```typescript
const formatMoney = (val: number | null | undefined) => {
  if (val == null || Number.isNaN(Number(val))) return '—'
  return `¥${Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
```

表格中使用 `class-name="is-money"` 自动右对齐 + 等宽数字。

---

## 九、决策速查

| 场景 | 用什么 |
|------|--------|
| 标准详情页（从列表跳转） | `VabDetailPage` + `VabDetailPageHeader(showBack=true)` + `VabDetailSection` |
| 抽屉/弹窗内详情 | `VabDetailPage` + `VabDetailPageHeader(:show-back="false")` + `VabDetailSection` |
| 一个接口返回全部数据 | `VabDetailPage(:request)` + Section 直接用主数据 |
| 多个接口分区加载 | Section 各自 `:request` + `:request-params` |
| 基础信息展示 | Section 内 `el-descriptions` |
| 表格数据展示 | Section 内 `el-table` + `vab-narrow-table` class |
| 操作日志（可折叠） | Section `collapsible` |
| Section 右侧按钮 | Section `#extra` slot |
| 自定义标题行 | Section `#title` slot |
| 纯展示（无请求） | VabDetailPage 不传 request，Section 不传 request |
| 状态 / 枚举文案 | 读 `{field}Label`（后端 `@DictLabel` 注入）；`el-tag` 颜色可用前端小 map |

---

## 十、参考示例页

- **承运商详情示例**：`src/views/fulfillment/basic/carrier/vabAutoComponents/CarrierSchemaDetail.vue`，从承运商 Schema 列表页「查看」按钮以 Drawer 打开
- **承运商 Schema 列表**：`src/views/fulfillment/basic/carrier/CarrierSchemaTable.vue`，路由 `/fulfillment/basic/carrier-schema-table`
- **结算详情样板**（手写版）：已删除，承运商详情示例已替代
