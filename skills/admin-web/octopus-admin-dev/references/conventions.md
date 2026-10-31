# octopus-admin 详细规范参考

> 本文档是 `SKILL.md` 的补充参考，在需要更多细节时阅读。

---

## 一、路径别名

| 别名 | 指向 |
|-----|------|
| `/@/` | `src/` |
| `~/` | 项目根目录 |
| `/@vab/` | `library/`（Vab 组件库） |

**禁止**相对路径跨层级引用（如 `../../utils/request`）。

---

## 二、API 完整规范

### 请求函数命名

| 操作 | 函数名 | 方法 |
|-----|-------|------|
| 列表/分页 | `getPage` / `getList` | GET |
| 详情 | `getDetail` | GET |
| 新增 | `doAdd` | POST |
| 编辑 | `doEdit` | POST |
| 删除 | `doDelete` | POST / DELETE |
| 批量删除 | `batchDelete` | POST |

### edit 接口中 id 的传递方式

当接口要求 id 在 query、其余字段在 body 时：

```typescript
export function doEdit(data: any) {
  return request({
    url: '/v1/xxx/update',
    method: 'post',
    params: { id: data.id },   // id → query string
    data,                        // 其余字段 → body
    module: apiModuleMap.fulfillmentCore,
  })
}
```

### 幂等键

```typescript
import { genIdempotencyKey } from '/@/utils'
const data = { idempotencyKey: genIdempotencyKey(), ...formData }
```

**禁止** `uuid`、`crypto.randomUUID()`、内联时间戳拼接。

---

## 三、VabSchemaTable 核心 Props 速查

| Prop | 默认值 | 说明 |
|-----|--------|------|
| `columns` | 必填 | 列定义 |
| `request` | — | `(params) => Promise<{list,total}>` |
| `row-key` | `'id'` | 行唯一 key |
| `row-selection` | `false` | 开启多选 |
| `table-class` | `'vab-narrow-table'` | 表格样式（WMS 类页面默认启用） |
| `default-page-size` | `10` | 初始每页条数 |
| `action-column-width` | `160` | 操作列宽 |
| `immediate` | `true` | 挂载后立即请求 |
| `v-model:status` | — | Tab 状态值 |
| `status-options` | — | Tab 选项 |

### 实例方法

| 方法 | 说明 |
|-----|------|
| `reload()` | 重置分页并重新加载 |
| `fetchData()` | 保持当前分页重新加载 |
| `queryData()` | 触发搜索（重置到第一页） |
| `resetSearch()` | 清空搜索条件 |

---

## 四、SchemaFormField 控件完整列表

| `control` | 渲染 | 必配属性 |
|----------|------|---------|
| `'input'`（默认） | `el-input` | — |
| `'textarea'` | `el-input` textarea | `rows` |
| `'inputnumber'` | `el-input-number` | `min` / `max` / `precision` |
| `'select'` | `el-select` | `options: [{label,value}]` |
| `'remote-select'` | 远程搜索下拉 | `remoteConfig` |
| `'radio'` | `el-radio-group` | `options` |
| `'checkbox'` | `el-checkbox-group` | `options`，默认值 `[]` |
| `'switch'` | `el-switch` | `activeValue` / `inactiveValue` |
| `'date'` | `el-date-picker` date | — |
| `'datetime'` | `el-date-picker` datetime | — |
| `'daterange'` | `el-date-picker` daterange | `rangeParamKeys` |
| `'datetimerange'` | `el-date-picker` datetimerange | — |
| `'divider'` | `el-divider`（分组标题） | `colSpan: 24` |
| `'slot'` | 自定义插槽 | `#form-{field}` slot |

### 字段通用属性

| 属性 | 说明 |
|-----|------|
| `field` | 字段名（camelCase） |
| `label` | 标签文字 |
| `required` | 必填，自动生成校验规则 |
| `rules` | 自定义校验规则 |
| `colSpan` | 列宽（1-24，默认 `defaultColSpan=8`） |
| `disabledOnEdit` | 编辑时禁用（编码类字段） |
| `disabled` | 始终禁用 |
| `defaultValue` | 新增时默认值 |
| `hidden` | `(form, isEdit) => boolean` 动态隐藏 |

### remote-select 配置

```typescript
remoteConfig: {
  fetchFn: getWarehousePage,                    // API 函数
  searchField: 'warehouseName',                 // 搜索关键字参数名
  extraParams: { enabled: 1 },                  // 固定过滤参数
  labelRender: (item) => `${item.warehouseCode}-${item.warehouseName}`,
  valueField: 'id',                             // 取值字段，默认 'id'
  buildSelectedItem: (form) =>                  // 编辑回显（关键！）
    form.warehouseId
      ? { id: form.warehouseId, warehouseCode: form.warehouseCode, warehouseName: form.warehouseName }
      : null,
}
```

### 字段级联（dependency）

```typescript
// 上游改变时清空下游
{ field: 'warehouseId', dependency: { clearFields: ['roomId', 'zoneId'] }, remoteConfig: ... }

// 选中时回填关联字段
{
  field: 'roomId',
  dependency: {
    clearFields: ['zoneId'],
    onChange: (value, form, optionList = []) => {
      const room = optionList.find((r) => r.id === value)
      if (room) form.warehouseId = room.warehouseId
    },
  },
  remoteConfig: { ... },
}
```

**禁止**用 `watch` 手动清空下游字段，必须用 `dependency.clearFields` 声明式配置。

---

## 五、Pinia Store 规范（Options 风格）

```typescript
// src/store/modules/xxx.ts — 必须 Options 风格，禁止 Setup 风格
import { getXxxList } from '/@/api/xxx'

export const useXxxStore = defineStore('xxx', {
  state: (): { list: any[]; loading: boolean } => ({
    list: [],
    loading: false,
  }),
  getters: {
    getList: (state) => state.list,
  },
  actions: {
    async fetchList() {
      this.loading = true
      try {
        const { data } = await getXxxList()
        this.list = data
      } finally {
        this.loading = false
      }
    },
    setList(list: any[]) { this.list = list },
    resetAll() { this.list = []; this.loading = false },
  },
})
```

---

## 六、路由守卫

```typescript
// src/router/modules/xxx.ts
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import Layout from '/@vab/layouts/index.vue'

const xxxGuard = async (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // 守卫逻辑，完成后调 next()
  next()
}

export const xxxRoutes = [{
  path: '/xxx',
  component: Layout,
  meta: { title: '模块名' },
  beforeEnter: [xxxGuard],
  children: [...],
}]
```

---

## 七、权限控制完整用法

```vue
<!-- 按 permission code（业务页面首选）-->
<el-button v-permissions="{ permission: ['product:create'] }">新增</el-button>
<el-button v-permissions="{ permission: ['product:update'] }">编辑</el-button>

<!-- 按角色 -->
<el-button v-permissions="['Admin']">管理员操作</el-button>

<!-- 取反 -->
<el-button v-permissions="{ role: ['Admin'], mode: 'except' }">非管理员</el-button>

<!-- 必须同时满足多个 -->
<el-button v-permissions="{ permission: ['p:update', 'p:audit'], mode: 'allOf' }">...</el-button>
```

permission code 格式：`{模块}:{操作}`，如 `product:create`、`menu:delete`。

---

## 八、样式规范

### 间距 Token

| Token | 值 | 用途 |
|------|----|------|
| `--spacing-1` | 4px | 图标内间距 |
| `--spacing-2` | 8px | 图标文字间距 |
| `--spacing-3` | 12px | Section header 下边距 |
| `--spacing-4` | 16px | 卡片内边距 |
| `--spacing-5` | 20px | 表单 gutter、页面内边距 |
| `--spacing-6` | 24px | 大区块间距 |

### Element Plus 设计变量

```scss
/* ✅ 正确 */
.card {
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  color: var(--el-text-color-primary);
  padding: var(--spacing-4);
}
/* ❌ 禁止 */
.card { background: #fff; border: 1px solid #dcdfe6; color: #303133; }
```

---

## 九、文案规范速查

| 场景 | 推荐 | 避免 |
|-----|------|------|
| 空状态 | 暂无数据 / 暂无记录 | 没有数据 / 未发现 |
| 新建操作 | 新增 | 添加 / 新建 |
| 确认按钮 | 确定 | 确认（单独按钮时） |
| 带动作确认 | 确认删除 | — |
| 校验提示 | 请输入… / 请选择… | 不能为空 / 不能不填 |
| 保存失败 | 暂时无法保存，请稍后重试 | 保存失败 |
| 登录动作 | 登录 | 登陆 |

### 业务提示 / 异常说明 / 通知文案

页面上解释「出了什么问题」的文案（异常提示条、状态说明、通知），按下面顺序写，缺哪项就标【待确认】：

1. **什么问题**：带具体对象 / 金额（如「XX 门店 10 月结款 1,200.00 元未打款」）
2. **具体原因**：业务语言，禁止透传接口 `msg` 原文、错误码、异常栈
3. **影响**：不处理会怎样
4. **系统已做了什么**：已自动重试 / 已暂停 / 已转人工
5. **该谁处理**：角色
6. **怎么处理**：入口 + 步骤（入口路径、按钮名要在 `src/router/**` 与页面代码里核实）
7. **处理后怎样**：结果与时效

为什么：只写「打款失败」的提示让用户无从处理，最后都变成找研发排查。

---

## 十、数据完整性约定

- **前端计算值不入库**：合计/金额等前端汇总结果后端须重新计算
- **表单初始值由后端下发**：税率/折扣等策略值必须由 `GET /xxx/form-preferences` 返回，禁止硬编码
- **后端表单偏好接口须声明字段 `required`**，前端动态构建校验规则
