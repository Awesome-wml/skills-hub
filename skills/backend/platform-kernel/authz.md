# Authorization (kernel-authz-starter)

authz-starter 提供声明式接口鉴权：现行 `@RequiresCapability`（能力 + 动态配置），旧 `@RequiresPermission`（Casbin）仅兼容存量。数据范围过滤见 [data-scope.md](data-scope.md)。

---

## @RequiresCapability 用法（现行，唯一推荐）

> **核实基线**：octopus-cloud origin/dev 上 Controller 鉴权几乎全部是 `@RequiresCapability`（无参写法占绝大多数，`Capability.Codes.XXX` 写法为存量/少数）；`@RequiresPermission` 只剩个别存量类，kernel 已标 `@Deprecated`（2026-04-18）。新代码禁止再写 `@RequiresPermission(domain/object/action)`——它把权限耦合到前端按钮 identity，曾导致按钮数爆炸和 Feign 跨服务 403。

```java
import com.lengfeng.platform.kernel.authz.RequiresCapability;

// ① 推荐：无参。加了 = 需要鉴权；需要哪个权限由配置决定（原子 → 接口映射），改归属不改代码
@RequiresCapability
public R<Void> changeStatus(...) { }

// ② 存量：能力码写死在注解里（配置对它不生效）
@RequiresCapability(Capability.Codes.COMMERCE_AFTERSALE_MANAGE)
@RequiresCapability({Capability.Codes.SETTLEMENT_DATA_READONLY, Capability.Codes.SETTLEMENT_DATA_PAY}) // 默认 ANY
@RequiresCapability(value = {...}, match = MatchMode.ALL)

// ③ 资金/权限变更等敏感操作：额外校验 Token 仍存活（防被踢出用户的 in-flight 请求）
@RequiresCapability(securityLevel = SecurityLevel.HIGH)
```

- 能力枚举在业务侧 `common/.../authz/Capability.java`（`Capability.Codes` 常量，命名 `{service}.{subdomain}.{action-class}`），由 `CapabilityProvider` SPI 注入白名单；新增能力要过架构评审，有全局红线（`CapabilityRedlineValidator`），能合并进既有能力的不新增。
- **不要往注解里填原子权限 code 追求"更细粒度"**——归属属于配置，不属于注解。
- 无参注解走 `DynamicPermissionResolver`（octopus-cloud 的实现是 `RedisApiPermissionResolver`，按接口标识读 system-core 发布的「原子 → 接口」配置快照）。**fail-closed**：没有实现、没配置、解析为空 → 一律 403；超管在切面里直接放行，所以超管自测发现不了漏配，必须用非超管测试账号验。页面→接口→原子的配置方法见 `/authz-map`。
- **没有注解 = 公开接口**（登录前、webhook 签名、C 端行级所有权）。公开要登记豁免清单，别靠"忘了加"。
- 白名单校验发生在**运行期**：写错的 code 要等第一个请求打上来才 403，启动期不报。
- 方法级注解覆盖类级；同一处新旧注解并存时 `@RequiresCapability` 优先，旧注解只在没挂新注解时生效。

### 相关注解的边界（易混）

| 注解 | 作用 | 不做什么 |
|---|---|---|
| `@RequiresCapability` | 后台/员工接口鉴权（能力 / 动态配置） | — |
| `@Audited` | 审计留痕 | **不鉴权**：只挂 `@Audited` 的接口对所有登录用户开放 |
| `@ConsumerApi`（commerce-core 组合注解） | C 端：要求已登录 + 校验 device=consumer（防 staff token 误访问）+ 可选审计 | **不做 RBAC**：C 端权限 = 登录态 + 行级所有权，service 层强制 `WHERE user_id = 当前登录用户`；审计默认关，资金/权益/认证/不可逆操作必须显式 `audit = true` |

---

## 旧 @RequiresPermission（已废弃，仅供读存量代码）

三级校验：Session `object:action` 字符串 → Casbin `allowWithRoles` → Casbin `allow`。迁移写法：

```java
// 旧（禁止新增）
@RequiresPermission(domain = "commerce-core", object = "order", action = {"list"})
// 新
@RequiresCapability   // 或存量写法 @RequiresCapability(Capability.Codes.XXX)
```

下面的 Casbin 模型 / 策略配置只对旧注解生效，新接口**不需要**再去 `lf.authz.casbin.policies` 里加策略。

---

## Casbin 模型

```
m = g(r.sub, p.sub) && (p.dom == "*" || r.dom == p.dom)
    && keyMatch2(r.obj, p.obj) && regexMatch(r.act, p.act)
```

支持：角色继承 `g`、域通配符 `*`、动作正则 `read|update`。

---

## 策略配置

### 静态 YAML

```yaml
lf:
  authz:
    enabled: true
    casbin:
      policies:
        - "p, admin, system-core, order, create"
        - "p, operator, system-core, order, read"
        - "g, root, admin"
```

### 动态 PolicyLoader（生产）

```java
@Component
public class DbPolicyLoader implements PolicyLoader {
    @Override public List<String> loadPolicies() {
        return List.of("p, warehouse_mgr, fulfillment-core, inventory, update");
    }
}
```

### 热重载

```java
((CasbinAuthzService) authzService).reload(newPolicyLines);
```

---

## SecurityLevel.HIGH

敏感操作：权限通过后额外调用 `StpUtil.checkLogin()` 验证 Token 存活。
防止被 kickout 的用户在 in-flight 请求中执行资金/权限变更。

---

## DataScopeEnum

| 枚举值 | SQL 条件 |
|--------|----------|
| ALL | 不注入 |
| SELF_ONLY | `created_by = '{userId}'` |
| ORG_ONLY | `org_id = {primaryOrgId}` |
| ORG_AND_CHILDREN | `org_id IN (descendantIds)` |
| CUSTOM | `org_id IN (customDeptIds)` |

多角色合并取最宽松。

---

## 注意事项

- `AuthzAspect` 为 `@Order(100)`，先于审计切面执行：权限拒绝时业务方法和审计都不会触发（被拒请求无审计记录）
- CasbinAuthzService 用 ReadWriteLock：并发读安全，reload 写锁独占
- ForbiddenException → GlobalExceptionHandler → R.fail(40300)
- 能力 / 原子 / 菜单按钮的关系：`sys_permission_atom.code` 与 `sys_menu.identity`（type=BUTTON）**没有存储关联**，只靠同码约定、运行时按字符串相等拼接；这是已定方案，**不要提议建关联表**
