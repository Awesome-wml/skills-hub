# Table 列表页 UI 规范

> 适用范围：所有使用 VabSchemaTable 的新范式页面。旧范式（goods/\*、system/\*、setting/\*）迁移时同样遵照执行。

---

## 一、状态标签（el-tag）

### 1.1 三层分级

所有 tag 按语义分为三层，**颜色只属于第一层**。

| 层级 | 名称 | 使用场景 | 写法 |
|---|---|---|---|
| L1 | 状态徽标 | 需要用户感知的核心业务状态：销售中、已停用、待审核、已通过、已拒绝、冻结 | `<el-tag type="xxx">` |
| L2 | 描述标签 | 描述性分类信息：销售渠道、商品类目、商品类型（实物/虚拟） | `<el-tag plain>` 或纯文字 |
| L3 | 辅助角标 | 极低优先级的内联辅助信息：版本号、数量徽章 | 纯文字，不用 tag |

**原则：同一行最多出现 1 个 L1 彩色 tag。** 多个描述性信息（L2）可并排，但优先考虑改为纯文字。

### 1.2 颜色语义映射

| 业务含义 | type | 颜色 | 示例 |
|---|---|---|---|
| 正常 / 销售中 / 已通过 / 启用 | `success` | 绿 | SELLING、APPROVED、启用 |
| 待处理 / 待审核 / 进行中 | `warning` | 橙 | PENDING、RECEIVING |
| 停用 / 禁用 / 关闭 / 已取消 | `info` | 灰 | STOPPED、CANCELED、禁用 |
| 异常 / 已拒绝 / 已冻结 | `danger` | 红 | REJECTED、冻结 |

> **停用/禁用用 `info`（灰）而非 `danger`（红）**：停用是中性的非激活状态，不是危险操作，红色会造成误读。

### 1.3 统一写法

```vue
<!-- 正确 ✓ -->
<el-tag :size="elSize" :type="statusType(row.status)">
  {{ statusLabel(row.status) }}
</el-tag>

<!-- 错误 ✗ —— 不写 effect="dark"，不写 effect="light"，不硬编码 size -->
<el-tag effect="dark" size="small" type="success">销售中</el-tag>
```

- `effect` 不写（默认 light，全站统一）
- `size` 统一绑定 `:size="elSize"`，跟随 VabSchemaTable 的尺寸
- 状态映射抽成独立函数（`statusType` / `statusLabel`），不在模板里写三元表达式

### 1.4 多值渠道/类目标签

销售渠道、商品类目等多值字段，改为纯文字或 L2 plain tag，不用彩色：

```vue
<!-- 渠道标签 —— 使用 plain，不传 type -->
<el-tag
  v-for="ch in parseSaleChannels(row.saleChannels)"
  :key="ch"
  :size="elSize"
  plain
>
  {{ channelLabel(ch) }}
</el-tag>

<!-- 更简洁的方案：直接纯文字，用 / 分隔 -->
<span>{{ parseSaleChannels(row.saleChannels).map(channelLabel).join(' / ') }}</span>
```

---

## 二、操作列（#actions）

### 2.1 三层操作分流

参考 Shopify Polaris 和 Ant Design Pro 的分层模型，操作按用户意图分为三个通道：

| 通道 | 操作类型 | 实现方式 |
|---|---|---|
| **整行点击** | 查看详情（浏览跳转） | `row-clickable` + router.push，不占操作列 |
| **操作列直出** | 高频编辑操作（编辑、核心状态切换） | `#actions` 插槽，最多 2 个 |
| **更多下拉** | 低频/危险操作（删除、审核、导出） | `el-dropdown` 折叠 |

### 2.2 操作列按钮数量规则

```
当操作总数 ≤ 2 个：全部直出，不需要"更多"
当操作总数 ≥ 3 个：前 1~2 个直出 + 其余进"更多"下拉
删除：永远进"更多"下拉，不直出
```

### 2.3 标准模板

**简单页面（编辑 + 删除）：**

```vue
<template #actions="{ row }">
  <div class="table-action-btns">
    <el-button :size="elSize" text type="primary" @click="handleEdit(row)">
      编辑
    </el-button>
    <el-button :size="elSize" text type="danger" @click="handleDelete(row)">
      删除
    </el-button>
  </div>
</template>
```

**带状态切换页面（编辑 + 启用/停用 + 更多）：**

```vue
<template #actions="{ row }">
  <div class="table-action-btns">
    <el-button :size="elSize" text type="primary" @click="handleEdit(row)">
      编辑
    </el-button>
    <el-button
      :size="elSize"
      text
      :type="row.status === 'enabled' ? 'warning' : 'primary'"
      @click="handleToggleStatus(row)"
    >
      {{ row.status === 'enabled' ? '停用' : '启用' }}
    </el-button>
    <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, row)">
      <el-button :size="elSize" text type="info">更多</el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="delete">
            <span class="text-danger">删除</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>
```

**带审核流程页面（编辑 + 更多）：**

```vue
<template #actions="{ row }">
  <div class="table-action-btns">
    <el-button :size="elSize" text type="primary" @click="handleEdit(row)">
      编辑
    </el-button>
    <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, row)">
      <el-button :size="elSize" text type="info">更多</el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-if="row.auditStatus === 'PENDING'" command="audit">
            审核
          </el-dropdown-item>
          <el-dropdown-item command="delete">
            <span class="text-danger">删除</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>
```

### 2.4 启用/停用的统一写法

**不要**用两个按钮 + disabled 互斥，**要**用一个按钮动态切换 label：

```vue
<!-- 错误 ✗ -->
<el-button :disabled="row.status !== 'enabled'" text type="danger" @click="handleDisable(row)">禁用</el-button>
<el-button :disabled="row.status !== 'disabled'" text type="primary" @click="handleEnable(row)">开启</el-button>

<!-- 正确 ✓ -->
<el-button
  text
  :type="row.status === 'enabled' ? 'warning' : 'primary'"
  @click="handleToggleStatus(row)"
>
  {{ row.status === 'enabled' ? '停用' : '启用' }}
</el-button>
```

### 2.5 disabled vs v-if 使用规则

| 情况 | 做法 |
|---|---|
| 启用 ↔ 停用（互斥状态切换） | 一个按钮，动态换 label 和 handler |
| 业务约束暂时不可操作（有关联数据不能删） | `:disabled="true"` + el-tooltip 解释原因 |
| 当前状态下该操作不存在（只有待审核才有"审核"） | `v-if` 隐藏 |
| 权限不足，该角色永远无权访问 | `v-permissions` 指令 |

### 2.6 操作列宽度规则

不再使用固定宽度，改为按钮数量决定：

| 直出按钮数 | action-column-width |
|---|---|
| 1 个 | `100` |
| 2 个 | `160` |
| 2 个 + "更多" | `200` |

**不允许**随意填写其他值（70、130、180、220、260 等历史值全部废除）。

### 2.7 按钮颜色语义

| 操作类型 | type | 示例 |
|---|---|---|
| 查看 / 编辑 / 启用 / 跳转 | `primary` | 编辑、查看详情、启用、收货记录 |
| 停用 / 冻结 / 关闭 | `warning` | 停用、冻结、关闭单据 |
| 删除 / 禁用 | `danger` | 删除（仅在更多下拉中使用） |
| 更多入口 | `info` | 更多 ▾ |

所有操作按钮统一使用 `text` 属性（`el-button text`），不使用 `link`。

### 2.8 包裹容器

所有 `#actions` 插槽内容统一用 `.table-action-btns` 包裹：

```vue
<template #actions="{ row }">
  <div class="table-action-btns">
    <!-- 按钮 -->
  </div>
</template>
```

CSS（在全局样式或 VabSchemaTable 内定义）：

```css
.table-action-btns {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  flex-wrap: nowrap;
}
```

---

## 三、删除操作的二次确认

所有删除操作必须有二次确认，统一使用 `ElMessageBox.confirm`：

```ts
async function handleDelete(row: Row) {
  await ElMessageBox.confirm(`确认删除「${row.name}」？此操作不可撤销。`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger',
  })
  // 执行删除
}
```

停用、拒绝等不可逆操作同理，需二次确认。

---

## 四、Toolbar 按钮规范

### 4.1 三层区域和插槽分工

VabSchemaTable 有三个严格分离的视觉层：

```
┌──────────────────────────────────────────────────────────────┐
│ 搜索表单（el-form 内部）                   [查询] [重置]      │  ← 搜索区（#search-actions-left 不用于功能按钮）
├──────────────────────────────────────────────────────────────┤
│ [新增] [批量导入] [批量停用] [批量删除]    [列设置] [导出...]  │  ← Toolbar Bar
│ ◄────────── #toolbar-left ────────────►  ◄── #toolbar-right ►│
├──────────────────────────────────────────────────────────────┤
│ 表格主体                                                      │
└──────────────────────────────────────────────────────────────┘
```

| 插槽 | 职责 | 典型内容 |
|---|---|---|
| `#search-actions-left` | **不放功能按钮**，仅用于搜索相关辅助操作（保存筛选、搜索模板等） | 一般留空 |
| `#toolbar-left` | **主功能区**：创建类 + 批量操作，按钮之间用 `el-divider` 竖线分组 | 新增、批量导入 \| 批量停用、批量删除 |
| `#toolbar-right` | **次级工具**：列设置、导出、刷新等与数据无关的视图工具 | 列设置、导出 Excel |

### 4.2 `#toolbar-left` 的按钮分组规则

`#toolbar-left` 承载所有主功能按钮，内部按职责分为两组，用 `el-divider` 竖线隔开：

```
[新增(primary)] [批量导入]  |  [批量停用] [批量删除(danger)]
◄── 创建类（始终可点）────►    ◄── 批量操作（依赖选中行）──────►
```

**创建类按钮规则：**
- 主操作（新增）：`type="primary"`，带 Plus 图标，放最左
- 辅助创建（批量导入）：不写 type（默认边框）
- 同组最多 2 个；超过 2 个时辅助操作折叠进下拉

**批量操作按钮规则：**
- 无选中行时全部 `disabled`，始终显示不隐藏——保留可发现性，符合国内用户习惯
- 有选中行时激活，按钮内显示选中数量角标
- 危险批量操作（批量删除）用 `type="danger"`，其余不写 type

**标准写法：**

```vue
<template #toolbar-left="{ elSize }">
  <!-- 创建类 -->
  <el-button v-permissions="..." :icon="Plus" :size="elSize" type="primary" @click="handleAdd">
    新增商品
  </el-button>
  <el-button v-permissions="..." :icon="Upload" :size="elSize" @click="handleImport">
    批量导入
  </el-button>

  <!-- 分隔线（仅有批量操作时才加） -->
  <el-divider direction="vertical" />

  <!-- 批量操作 -->
  <el-button v-permissions="..." :disabled="!selectRows.length" :icon="Bottom" :size="elSize" @click="handleBatchOffSale">
    批量停用
    <span v-if="selectRows.length" class="batch-count">{{ selectRows.length }}</span>
  </el-button>
  <el-button v-permissions="..." :disabled="!selectRows.length" :icon="Delete" :size="elSize" type="danger" @click="handleBatchDelete">
    批量删除
    <span v-if="selectRows.length" class="batch-count">{{ selectRows.length }}</span>
  </el-button>
</template>
```

只有创建类、没有批量操作的页面，不加分隔线：

```vue
<template #toolbar-left="{ elSize }">
  <el-button v-permissions="..." :icon="Plus" :size="elSize" type="primary" @click="handleAdd">
    新增仓库
  </el-button>
</template>
```

### 4.3 `#toolbar-right` 的用途

放与数据无关的视图辅助工具，不放业务操作：

- 列设置（显示/隐藏列）
- 导出 Excel
- 刷新
- 密度切换

### 4.4 不允许的写法

```vue
<!-- 错误 ✗ —— 功能按钮放在 #search-actions-left（搜索区）-->
<template #search-actions-left="{ elSize }">
  <el-button type="primary">新增</el-button>
  <el-button>批量导入</el-button>
</template>

<!-- 错误 ✗ —— 同组内两个 primary 按钮 -->
<template #toolbar-left="{ elSize }">
  <el-button type="primary">新增</el-button>
  <el-button type="primary">批量导入</el-button>
</template>
```

### 4.5 辅助管理入口（非创建类，如打开子面板）

放在创建类按钮右侧，默认边框 + Setting 图标，不用 primary：

```vue
<el-button v-permissions="..." :icon="Setting" :size="elSize" @click="openModelManage">
  容器型号
</el-button>
```

---

## 六、需要整改的文件清单

### 4.1 Tag 整改（effect 统一）

| 文件 | 问题 | 整改内容 |
|---|---|---|
| `fulfillment/basic/area/index.vue` 及同目录其他 9 个文件 | `effect="dark"` | 删除 effect 属性 |
| `fulfillment/basic/lpn/index.vue` | lpnStatus 用 `effect="light"`，enabled 用 `effect="dark"` | 统一删除 effect |
| `user/warehouse/list/index.vue` | `effect="light"` | 删除 effect 属性 |
| `user/bd/list/index.vue` | `effect="light"` | 删除 effect 属性 |

### 4.2 Tag 语义整改

| 文件 | 问题 | 整改内容 |
|---|---|---|
| `product/list/index.vue` | `STOPPED` 映射为 `info`，`PENDING_SALE` 也是 `info`，无法区分 | `STOPPED → info`，`PENDING_SALE → warning` |
| `product/list/index.vue` | 销售渠道用彩色 tag v-for | 改为 `plain` tag 或纯文字 |
| `product/list/index.vue` | `productType` 用彩色 tag | 改为纯文字（实物/虚拟） |
| `fulfillment/basic/` 各文件 | `enabled` 判断方式不一（=== 1 / 布尔 / === true） | 统一为 `row.enabled === 1`（或按接口约定统一） |

### 4.3 操作列整改

| 文件 | 问题 | 整改内容 |
|---|---|---|
| `product/list/index.vue` | 最多 6 个按钮平铺，宽度 260，会换行 | 编辑直出，审核/停用/启用/删除进"更多" |
| `user/bd/list/index.vue` | 禁用+开启两个互斥 disabled 按钮，flex-wrap | 合并为一个动态 label 按钮，宽度改为 160 |
| `fulfillment/permission/` 3 个文件 | 无 action-column-width，无包裹 div | 补上宽度 160，包裹 `.table-action-btns` |
| `fulfillment/basic/` 各文件 | 宽度统一 160 但部分有 3 个按钮（room：200） | room 改为 200，其余维持 160 |
| `inventory/stock/index.vue` | 冻结/解冻用两个互斥 disabled 按钮 | 合并为一个动态 label 按钮 |

### 4.4 按钮类型整改

| 文件 | 问题 | 整改内容 |
|---|---|---|
| `product/list/index.vue` | "查看原因"用 `el-button link`，其余用 `el-button text` | 统一改为 `el-button text` |
| `order/inbound/index.vue` | 单号用 `el-button link` | 单号是单元格内链接，保留 link（此为合理用法） |
| `product/list/index.vue` | 启用按钮用 `type="success"`，其他页用 `type="primary"` | 统一启用 → `primary` |

### 4.5 权限指令补全

| 文件 | 问题 |
|---|---|
| `fulfillment/basic/` 下所有编辑/删除按钮 | 缺少 `v-permissions` 指令，需补全 |
| `fulfillment/permission/` 3 个文件 | 缺少 `v-permissions` 指令，需补全 |

---

## 五、不在本次范围内

以下为旧范式页面，待后续迁移至 VabSchemaTable 时再统一整改：

- `src/views/goods/*`（GoodsManagement、GoodsSku、GoodsStock、GoodsBrand、GoodsCoupon、GoodsDiscount、GoodsComment、WorkOrder、Trade）
- `src/views/system/*`（user、role、org、dict）
- `src/views/setting/*`（roleManagement、userManagement、menuManagement、dictionaryManagement、departmentManagement）
