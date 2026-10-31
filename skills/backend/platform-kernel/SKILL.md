---
name: platform-kernel
description: "Platform kernel starters reference: routing, dict, authz, data-scope, outbox, action, audit, file, money, notification, web. Use when working with ANY kernel component — annotations (@RequiresCapability, @DataScope, @DictLabel, @Audited; legacy @RequiresPermission), 403 / 接口鉴权 / 能力 Capability / 动态权限 / 字典 label / 审计, services (ActionExecutor, OutboxPublisher, DictTranslator, FileStorageService, Money, NotificationPublisher), configuration (lf.authz/dict/outbox/file/notification/web), or debugging kernel behavior."
---

# Platform Kernel 组件速查

本 Skill 覆盖 platform-kernel 全部 11 个 Starter 的 API、配置、用法。
按下方大纲定位到具体模块，然后读取对应的 reference 文件获取完整细节。

> **使用方式**：先看大纲判断涉及哪个模块，再用 `Read ${CLAUDE_SKILL_DIR}/<module>.md` 读取详细文档。

---

## 大纲目录

### 1. [routing](routing.md) — 渠道路由

| 关键词 | 组件 |
|--------|------|
| 多渠道适配、销售渠道、平台编码 | `ChannelAdapter<RQ,CTX>`, `FlowBindingService` |
| 业务上下文、LiteFlow chainId 解析 | `BizContext`, `SalesChannel`, `PlatformCode` |
| MDC traceId/spanId 常量 | `TraceConstants` |

**何时查阅**：新增渠道/平台集成、实现 ChannelAdapter、解析 LiteFlow chain。

---

### 2. [dict](dict.md) — 字典翻译

| 关键词 | 组件 |
|--------|------|
| code→label 自动序列化 | `@DictLabel` (Jackson 注解) |
| 编程式翻译 | `DictTranslator.label(dictKey, code)` |
| 两级缓存 (Caffeine+Redis) | `TwoLevelDictTranslator`, `CaffeineDictCache`, `DictRedisRepository` |
| 定时刷新 | `DictDataSource` (SPI), `DictRefreshScheduler` |
| 跨服务 RPC 翻译 | `TransDataProvider<T>` (SPI), `TransRpcClient` |
| 配置前缀 | `lf.dict.*` |

**何时查阅**：DTO 加 @DictLabel、实现 DictDataSource、配置字典缓存、跨服务翻译。

---

### 3. [authz](authz.md) — 接口鉴权（能力 Capability；Casbin 仅兼容旧注解）

| 关键词 | 组件 |
|--------|------|
| 声明式鉴权（现行） | `@RequiresCapability`（无参=动态配置，推荐）/ `@RequiresCapability(Capability.Codes.X)`（存量） |
| 动态权限解析（fail-closed） | `DynamicPermissionResolver` (SPI) |
| 能力白名单 / 规模红线 | `CapabilityProvider` (SPI), `CapabilityRedlineValidator` |
| 旧注解（@Deprecated） | `@RequiresPermission(domain, object, action)` → Casbin `CasbinAuthzService` / `PolicyLoader`，仅存量 |
| 高安全级别操作 | `SecurityLevel.HIGH`（额外 Token 存活校验） |
| 权限拒绝异常 | `ForbiddenException` → 40300 |
| 配置前缀 | `lf.authz.*` |

**何时查阅**：Controller 加鉴权注解、区分 `@RequiresCapability` / `@Audited` / `@ConsumerApi`、调试 403。

---

### 4. [data-scope](data-scope.md) — 数据范围过滤 + ResourceGrant

| 关键词 | 组件 |
|--------|------|
| 行级数据隔离注解 | `@DataScope(orgField, resourceField, resourceType)` |
| 拦截器 SQL WHERE 注入 | `DataScopeInnerInterceptor` |
| 数据范围枚举 | `DataScopeEnum`: ALL / SELF_ONLY / ORG_ONLY / ORG_AND_CHILDREN / CUSTOM |
| 过滤方向 | `DataScopeDirection`: BOTTOM_UP (业务数据) / TOP_DOWN (MDM) |
| 合作方资源可见性 | `grantedResources` (LoginUserInfo), ResourceGrant OR 条件 |
| 用户身份 SPI | `UserRoleProvider.getGrantedResourceIds(resourceType)` |

**何时查阅**：Mapper 加 @DataScope、配置资源级过滤、调试 SQL 注入条件、理解 org 树可见性。

---

### 5. [outbox](outbox.md) — Outbox 模式 + 幂等

| 关键词 | 组件 |
|--------|------|
| 可靠事件发布 | `OutboxPublisher.publish(aggregateType, aggregateId, eventType, payload)` |
| 异步 Relay 投递 | `DefaultOutboxRelay`, `ScheduledOutboxRelay` |
| 事件状态 | `OutboxStatus`: PENDING → SENT → DEAD |
| 幂等校验 | `IdempotencyGuard.firstSeen(key)` |
| 业务层 SPI | `OutboxRepository`, `OutboxEventSender` |
| 配置前缀 | `lf.outbox.relay.*` |

**何时查阅**：发布领域事件、实现 Kafka sender、配置重试策略、排查 DEAD 事件。

---

### 6. [action](action.md) — 统一动作执行

| 关键词 | 组件 |
|--------|------|
| 业务动作接口 | `TradeAction { code(), execute(ctx) }` |
| 执行器（幂等+审计+OTel） | `ActionExecutor.execute(code, context)` |
| 执行上下文 | `ActionContext` (Builder: bizContext, idempotencyKey, operator, params) |
| 执行结果 | `ActionResult { ok(), fail(code, msg) }` |
| 动作注册表 | `ActionRegistry` (自动扫描所有 TradeAction bean) |
| 审计日志 | `ActionAuditLogger` / `Slf4jActionAuditLogger` |

**何时查阅**：创建新 TradeAction、调用 ActionExecutor、理解幂等+审计包装。

---

### 7. [audit](audit.md) — 操作审计

| 关键词 | 组件 |
|--------|------|
| 审计注解 | `@Audited(action, resource, logParams, logResponse, maskFields)` |
| AOP 拦截 | `AuditAspect` (自动采集 HTTP/用户/业务上下文) |
| 审计事件模型 | `AuditEvent` (Builder, 含 traceId/elapsedMs) |
| 持久化接口 | `AuditLogger { log(event) }` |
| 内置脱敏 | password, token, secret, idcard, bankcard 等 |
| 双写实现 | `MongoAuditLogger` (MongoDB + SLF4J), `Slf4jAuditLogger` |
| 配置 | `lf.audit.enabled=true` |

**何时查阅**：方法加 @Audited、自定义 AuditLogger、配置脱敏字段、排查审计日志。

---

### 8. [file](file.md) — 文件存储 (OSS)

| 关键词 | 组件 |
|--------|------|
| 上传/删除/获取 URL | `FileStorageService { upload, delete, getUrl, getPresignedUrl, getPublicUrl }` |
| 上传结果 | `UploadResult(objectKey, url, originalFilename, size, contentType)` |
| 公开 vs 私有 bucket | `private-read=true` → 预签名 URL |
| 分发 bucket (CDN) | `distribution.enabled=true` (OSS 复制规则同步) |
| 配置前缀 | `lf.file.*` |

**何时查阅**：实现文件上传下载、配置 OSS bucket、区分公开/私有文件、替换存储后端。

---

### 9. [money](money.md) — 金额值对象

| 关键词 | 组件 |
|--------|------|
| 不可变金额 (scale=2, HALF_UP) | `Money { of(), add, subtract, multiply, rate, toCents }` |
| 批量计算 | `MoneyCalculator { sum, lineTotal, applyRate, net, max, min }` |
| 分摊（保证 sum==total） | `MoneyAllocator { allocate(权重), allocateEvenly(均分), verifySum }` |
| 尾差异常 | `MoneyMismatchException(expected, actual)` |
| JSON 序列化 | `MoneyJacksonModule` → `"99.90"` 字符串格式 |

**何时查阅**：金额计算、优惠分摊、清分/结算、确保无精度丢失。

---

### 10. [notification](notification.md) — 实时通知推送

| 关键词 | 组件 |
|--------|------|
| 发布通知/事件/计数 | `NotificationPublisher { publishNotification, publishBizEvent, publishCounters }` |
| 消息模型 | `WsMessage`, `InboxNotification`, `BizEvent`, `Counters` |
| WebSocket 网关 | `NotificationWebSocketHandler`, `WebSocketSessionManager` |
| Ticket 认证 | `NotificationWsTicketService` (Sa-Token TempToken, 一次性) |
| 心跳检测 | `ConnectionHealthChecker` (默认 90s 超时) |
| Redis 订阅分发 | `RedisNotificationSubscriber` (PSUBSCRIBE notify:user:*) |
| 配置前缀 | `lf.notification.*` |

**何时查阅**：推送实时通知、配置 WebSocket 网关、排查连接问题、理解消息协议。

---

### 11. [web](web.md) — Web 基础设施

| 关键词 | 组件 |
|--------|------|
| 统一响应 | `R<T> { ok(data), fail(code, msg), page(list, total, ...) }` |
| 分页 | `PageData<T> { list, total, pageNum, pageSize, pages, hasMore }` |
| 错误码 (6位) | `ErrorCode`: 0/400xx/401xx/403xx/404xx/409xx/422xx/500xx |
| 业务异常 | `BizException { of(msg), notFound, invalidStatus, idempotencyConflict }` |
| 全局异常处理 | `GlobalExceptionHandler` → 所有异常 → R 响应 (HTTP 200) |
| 当前用户上下文 | `AuthContext { getLoginId, getLoginUser, setLoginUser, isLogin }` |
| 登录拦截 | `SaTokenInterceptorConfig`, `lf.web.auth.exclude-paths` |
| 配置前缀 | `lf.web.*` |

**何时查阅**：返回 API 响应、抛业务异常、获取当前用户、配置排除路径、理解错误码。

---

## 快速定位指南

| 我要做什么 | 查哪个模块 |
|-----------|-----------|
| Controller 加权限控制 | [authz](authz.md) |
| Mapper 加数据范围过滤 | [data-scope](data-scope.md) |
| DTO 字段 code→label 翻译 | [dict](dict.md) |
| 方法加审计日志 | [audit](audit.md) |
| 创建业务动作（幂等+审计） | [action](action.md) |
| 发布领域事件到 Kafka | [outbox](outbox.md) |
| 上传文件到 OSS | [file](file.md) |
| 金额计算/优惠分摊 | [money](money.md) |
| 推送实时通知 | [notification](notification.md) |
| 返回 API 响应/抛异常 | [web](web.md) |
| 新增渠道/平台集成 | [routing](routing.md) |
| 合作方仓库/门店数据可见性 | [data-scope](data-scope.md) |
| 配置 `lf.xxx` 参数 | 按前缀查对应模块 |

---

## 修改 / 新增 starter 时的红线

本 Skill 也适用于改 `template-scaffold/platform-kernel` 下 `kernel-*-starter` 本身：

- **默认避开不稳定 API**：Guava `@Beta`、各类 `@Experimental`、Spring `@Internal` 等标记的 API 不进 starter（例：Guava `RateLimiter` 是 `@Beta`）。轻量功能优先 JDK + `AtomicXxx` 手写；确实绕不开时在 PR 描述里说明理由。为什么：starter 被所有业务模块传递依赖，不稳定 API 一变全仓受影响，公司 API 稳定性扫描也会告警。业务模块（commerce-core 等）用 `@Beta` 不受此限。
- **只追加不破坏**：已发布的注解属性、SPI 方法、配置项只追加（带默认值），不改名不删除；废弃走 `@Deprecated` + 迁移期并存（参考 `@RequiresPermission` → `@RequiresCapability`）。为什么：业务模块升级 starter 版本时不应被迫改代码。
- 核对 starter 现状以 `origin/dev` 为准（`git show origin/dev:<path>`），本地工作区常落后。

---

## 配置前缀速查

| 前缀 | 模块 | 关键开关 |
|------|------|----------|
| `lf.authz.*` | authz | `enabled=true` |
| `lf.authz.data-scope.*` | data-scope | `enabled=true` |
| `lf.dict.*` | dict | `enabled=true`, `refresh.enabled`, `rpc.provider-enabled`, `rpc.consumer-enabled` |
| `lf.outbox.relay.*` | outbox | `enabled=true`, `batch-size`, `max-retries` |
| `lf.audit.*` | audit | `enabled=true` |
| `lf.file.*` | file | `enabled=true`, `oss.*`, `distribution.*` |
| `lf.notification.*` | notification | `enabled=true`, `gateway=true` |
| `lf.web.*` | web | `auth.enabled=true`, `auth.exclude-paths` |

---

## 注解速查

| 注解 | 模块 | 用途 | 示例 |
|------|------|------|------|
| `@RequiresCapability` | authz | Controller/方法鉴权（`@RequiresPermission` 已废弃） | `@RequiresCapability` 或 `@RequiresCapability(Capability.Codes.COMMERCE_AFTERSALE_MANAGE)` |
| `@DataScope` | data-scope | Mapper 行级过滤 | `@DataScope(orgField="org_id", resourceField="warehouse_id", resourceType="WAREHOUSE")` |
| `@DictLabel` | dict | DTO 字段翻译 | `@DictLabel("order_status") private String statusCode;` |
| `@Audited` | audit | 方法审计日志（**只审计，不鉴权**） | `@Audited(action="order.create", resource="order")` |
