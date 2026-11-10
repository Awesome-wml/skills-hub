---
description: 前后端数据完整性与一致性规范，涵盖计算值校验、表单偏好接口等
alwaysApply: true
---

# 数据完整性与一致性规范

## 1. 前端计算值不可作为最终入库依据

**【强制】** 前端任何通过加减乘除汇总得出的金额、数量、合计等数值，不得被后端直接信任并存入数据库。

- 前端计算结果仅用于 **展示和用户交互提示**
- 前端可以将合计字段随表单一起提交（例如传 `0` 或前端计算的估算值），但 **后端必须根据明细数据重新计算**，以后端结果为准入库
- 若前后端计算结果不一致，后端应返回错误，前端提示用户

## 2. 长表单策略性初始值必须由后端接口统一下发

**【强制】** 在处理长表单（如订单创建、合同签订、报价单等）时，任何具有业务含义的初始化数值（如默认税率、运费模板、价格区间、最小订购量、折扣策略等），**必须由后端提供专用的表单偏好接口统一返回，禁止前端自行硬编码或从多个接口分散拼凑**。

- 禁止在前端初始化代码中写死业务策略类默认值
- 禁止多个组件/页面各自请求同类配置，造成数据来源不一致
- 后端须提供 **表单偏好接口**（建议命名 `GET /xxx/form-preferences` 或 `GET /xxx/init-data`），聚合该表单所需的全部默认值、枚举选项和策略参数后统一返回
- **【强制】后端表单偏好接口还应声明各字段的必填性**，前端根据后端返回的 `required` 信息动态构建校验规则，禁止前端自行硬编码哪些字段必填

### 代码示例（Vue 3 + TypeScript）

```typescript
// ❌ BAD - 后端直接使用前端传来的 totalAmount 入库
// backend: order.totalAmount = dto.totalAmount  ← 直接信任前端值

// ✅ GOOD - 前端传 0 或估算值均可，后端自行重新计算并比对
const form = {
  items: [...],
  totalAmount: 0, // 前端可传，后端不直接使用
}
await submitOrder(form)
// backend: 根据 items 重新计算 totalAmount，与 dto.totalAmount 比对或直接覆盖
```

```typescript
// ❌ BAD - 前端硬编码策略数值，或从多处分散拉取
const form = reactive({
  taxRate: 0.13,
  minOrderQty: 10,
  discountRate: 0.95,
})

// ✅ GOOD - 由后端表单偏好接口统一下发，含必填声明
const form = reactive({ taxRate: null, minOrderQty: null, discountRate: null })
const requiredFields = ref<string[]>([])

onMounted(async () => {
  const prefs = await getFormPreferences({ formType: 'order-create' })
  Object.assign(form, prefs.defaults)
  requiredFields.value = prefs.required // ['contactName', 'deliveryAddress', ...]
})
```
