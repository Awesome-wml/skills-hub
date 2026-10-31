# DataScope 数据权限 + ResourceGrant

@DataScope 注解 + DataScopeInnerInterceptor：行级数据隔离，覆盖组织树过滤和资源授权。

---

## 数据可见性公式

```
用户可见的资源记录 =
    自有资源（owner_org_id IN scopeDescendantOrgIds）        -- 组织树过滤
  UNION
    被授权资源（{resourceField} IN grantedResources[{resourceType}]）  -- 资源授权
```

dataScope=ALL 跳过一切注入。

---

## @DataScope 注解属性

| 属性 | 默认值 | 说明 |
|------|--------|------|
| `direction` | BOTTOM_UP | BOTTOM_UP=用 descendantOrgIds；TOP_DOWN=用 ancestorOrgIds |
| `orgField` | "org_id" | 表中 org ID 列名 |
| `creatorField` | "created_by" | SELF_ONLY 用 |
| `tableAlias` | "" | 连表查询时主表别名 |
| `resourceField` | "" | 资源 ID 列名（如 warehouse_id）。为空=不启用资源过滤 |
| `resourceType` | "" | 资源类型（如 WAREHOUSE）。必须与 resourceField 配对 |

---

## 用法示例

### 纯组织树过滤

```java
@DataScope(direction = DataScopeDirection.BOTTOM_UP, orgField = "org_id")
public interface OrderMapper extends BaseMapper<OrderPO> { }
// → AND org_id IN (101, 102, 103)

@DataScope(direction = DataScopeDirection.TOP_DOWN, orgField = "owner_org_id")
public interface ProductCatalogMapper extends BaseMapper<ProductCatalogPO> { }
// → AND owner_org_id IN (1, 10, 100, 101, 102)
```

### 组织树 + 资源授权 OR

```java
@DataScope(orgField = "org_id", resourceField = "warehouse_id", resourceType = "WAREHOUSE")
public interface OutboundOrderMapper extends BaseMapper<OutboundOrderPO> { }
// → AND (org_id IN (101, 102) OR warehouse_id IN (201, 203))

@DataScope(orgField = "org_id", resourceField = "store_id", resourceType = "STORE")
public interface OrderMapper extends BaseMapper<OrderPO> { }

@DataScope(orgField = "org_id", resourceField = "vehicle_id", resourceType = "VEHICLE")
public interface DeliveryOrderMapper extends BaseMapper<DeliveryOrderPO> { }
```

### 连表查询

```java
@DataScope(tableAlias = "o", orgField = "org_id", resourceField = "warehouse_id", resourceType = "WAREHOUSE")
// → AND (o.org_id IN (...) OR o.warehouse_id IN (...))
```

### SELF_ONLY + 资源

```java
// → AND (created_by = '10001' OR warehouse_id IN (201, 203))
```

---

## 拦截器逻辑

```
beforeQuery()
  ├── 无注解 → 跳过
  ├── dataScope == ALL → 跳过一切
  ├── buildOrgCondition() → org 条件
  ├── buildResourceCondition() → 资源 IN 条件；某维度可访问资源为 0 → 拼恒假 1 != 1（fail-closed）
  └── 合并：(orgCond OR resourceCond) / 单侧 / 都空则跳过
```

IN 子句上限 MAX_IN_CLAUSE_SIZE = 500，超出抛异常。

---

## Session 中的 grantedResources

```json
{
  "grantedResources": {
    "WAREHOUSE": [201, 203],
    "VEHICLE": [301, 302]
  }
}
```

登录时查询 `t_org_resource_grant WHERE grantee_org_id IN (scopeAncestorOrgIds) AND status='ACTIVE'`。
Grant 沿组织树向下继承。

---

## 扩展新资源类型

1. `t_org_resource_grant.resource_type` 新增值（无需改表结构）
2. Mapper 加 `resourceField + resourceType`
3. Session 自动包含（按 resource_type 分组）
4. **无需改 kernel 代码**

---

## 注意事项

- `resourceField` + `resourceType` 必须同时非空才生效
- ALL 全豁免（org 轴 + 资源轴都不注入）：kernel ≥ 0.4.9 实现与本文档一致；旧版本代码曾对 ALL 用户单独注入资源轴条件（语义反转为收权），已修正
- 资源轴 fail-closed（kernel ≥ 0.4.9）：配置了 `resourceType` 但用户可访问资源为 0 → 注入 `1 != 1`，该维度可见 0 行；与 org 条件 OR 合并时不影响 org 轴。旧版本为空时条件静默消失（纯资源轴 mapper 即全量放行），已修正
- 自有资源不进 grantedResources（走 org 树过滤）
- Grant 变更后需踢出 granteeOrgId **及其下级子树**所有用户 Token
- 调试：开启 `DataScopeInnerInterceptor` DEBUG 日志

---

## 异步线程中的 @DataScope（重要）

条件来源链：`@DataScope` → `SaTokenUserRoleProvider` → `AuthContext.getLoginUser()` →
优先读 `LoginUserContextHolder`（ThreadLocal），回退 `StpUtil`（仅 HTTP 线程可用）。
两条路都断时降级为**未登录默认值（`ALL`/空列表）→ 不注入任何条件、全量放行**。

- **`@Async` 默认线程池**：kernel-web-starter 自动注册 `LoginUserContextTaskDecorator`
  （Boot 自动装配到 `applicationTaskExecutor`），提交时快照登录态、执行时绑定、finally 清理，
  业务代码无感。提交线程无登录态（cron/Outbox 等系统任务）时不绑定，保持系统任务查全量语义。
- **自定义线程池**：Boot 不会自动挂装饰器，必须手动 `executor.setTaskDecorator(new LoginUserContextTaskDecorator())`。
- **`parallelStream()` / 未指定 executor 的 `CompletableFuture`**：走 commonPool，不经过装饰器，
  **禁止在需要数据范围过滤的路径上使用**。
- **MQ 消费**：消息头带 loginId，消费端 `AuthContext.getLoginUserById(loginId)` 反查后
  手动 `LoginUserContextHolder.set(...)`，finally 里 `clear()`。
- **系统任务查全量**：不要依赖隐式降级，任务专用查询应使用不带 `@DataScope` 的 mapper 方法显式声明。
- **跨服务 gRPC 调用**：客户端拦截器透传 token——HTTP 线程取自 `StpUtil`，gRPC 服务线程/
  `@Async` 线程兜底读 `LoginUserContextHolder` 的 token 槽位（服务端拦截器/TaskDecorator 存入），
  A→B→C 链式调用与异步发 gRPC 均不断链（kernel ≥ 0.4.9）。系统线程无 token，下游按无登录处理。
- `GrpcLoginUserContext` 已废弃，泛化为 `LoginUserContextHolder`（gRPC/异步/MQ 通用）。
