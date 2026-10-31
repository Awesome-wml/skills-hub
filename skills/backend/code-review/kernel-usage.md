# 平台 Kernel 使用规范检查清单

平台公共能力已封装在 platform-kernel 各 starter 中，业务代码应优先使用而非自行实现。

---

## 1. Web 基础设施（kernel-web-starter）

### BLOCKER 级

- [ ] **统一响应体必须使用 `R<T>`**
  - `R.ok(data)` / `R.fail(code, msg)` / `R.page(pageData)`
  - 禁止自定义 ResponseEntity 或 Map 返回
  - 检查：Controller 返回值是否都是 `R<T>` 类型

- [ ] **业务异常必须使用 `BizException`**
  - `BizException.of("msg")` / `.notFound()` / `.invalidStatus()` / `.idempotencyConflict()`
  - 禁止自定义异常类或直接抛 RuntimeException
  - 检查：throw 语句是否使用了 BizException 体系

- [ ] **错误码必须使用 `ErrorCode` 常量**
  - 6 位编码，按范围分类：400xx/401xx/403xx/404xx/409xx/422xx/500xx
  - 禁止随意定义新的错误码数字
  - 检查：`R.fail()` 调用的 code 参数是否来自 ErrorCode

### WARNING 级

- [ ] **分页返回使用 `PageData<T>`**
  - `PageData.of(list, total, pageNum, pageSize)`
  - 检查：分页接口是否返回标准 PageData 结构

- [ ] **当前用户获取使用 `AuthContext`**
  - `AuthContext.getLoginId()` / `.getLoginUser()` / `.isLogin()`
  - 禁止直接操作 `StpUtil`（除非在认证模块内部）

---

## 2. 权限控制（kernel-authz-starter）

### BLOCKER 级

- [ ] **Controller 鉴权使用 `@RequiresCapability` 注解**
  - 推荐无参 `@RequiresCapability`（所需权限由原子 → 接口配置决定）；存量写法 `@RequiresCapability(Capability.Codes.XXX)`
  - 检查：新增 Controller 方法是否缺少鉴权注解；新代码出现 `@RequiresPermission(domain, object, action)` 即打回（已 `@Deprecated`）
  - 检查：只挂了 `@Audited` 的后台接口 = 没鉴权（`@Audited` 只审计）
  - C 端接口用 `@ConsumerApi`（登录 + consumer 身份 + 可选审计，不做 RBAC），service 层必须按 `user_id = 当前登录用户` 做行级过滤；资金/权益/认证/不可逆操作须 `audit = true`
  - 无参接口：PR 是否附带原子 → 接口种子（或说明已在配置页配置），否则非超管一律 403

- [ ] **数据行级过滤使用 `@DataScope` 注解**
  - Mapper 接口上声明 `orgField`、`resourceField`、`resourceType`
  - 检查：多租户/多组织数据的 Mapper 是否配置了 @DataScope

### WARNING 级

- [ ] **资金/权限变更使用 `SecurityLevel.HIGH`**
  - 额外验证 Token 存活状态
  - 检查：敏感操作的 `@RequiresCapability` 是否配置了 `securityLevel = SecurityLevel.HIGH`

- [ ] **不要提议给原子和按钮建关联表**
  - `sys_permission_atom.code` 与 `sys_menu.identity`（BUTTON）只靠同码约定、运行时字符串相等拼接，这是已定方案

- [ ] **改 `platform-kernel` starter 时避开 `@Beta` / `@Experimental` / Spring `@Internal` API**
  - starter 被所有业务模块传递依赖，API 稳定性扫描会告警；轻量功能用 JDK + `AtomicXxx`，确需使用须在 PR 描述说明（业务模块不受此限）

---

## 3. 审计日志（kernel-audit-starter）

### BLOCKER 级

- [ ] **关键写操作必须添加 `@Audited` 注解**
  - `@Audited(action = "order.create", resource = "order")`
  - 检查：新增的 POST/PUT/DELETE 接口是否有 @Audited

### WARNING 级

- [ ] **敏感参数应声明 `maskFields`**
  - `@Audited(maskFields = {"password", "idCard"})`
  - 检查：请求参数包含敏感信息时是否配置了脱敏

- [ ] **导出/批量操作应记录响应**
  - `@Audited(logResponse = true)` 用于导出、批量操作
  - 检查：导出接口是否开启了响应日志

---

## 4. 字典翻译（kernel-dict-starter）

### BLOCKER 级

- [ ] **展示文案禁止 hardcode**
  - 使用 `@DictLabel("dict_key")` 自动翻译 code → label
  - 使用 `DictTranslator.label(dictKey, code)` 编程式翻译
  - 检查：VO 中是否有 hardcode 的中文状态映射（如 `if status==1 return "已完成"`）

### WARNING 级

- [ ] **DTO/VO 同时返回 code 和 label**
  - 字段命名：`xxxCode` + `xxxLabel`
  - 检查：返回给前端的状态/类型字段是否只有 code 没有 label

---

## 5. 金额计算（kernel-money-starter）

### BLOCKER 级

- [ ] **金额字段必须使用 `Money` 类型**
  - 禁止在业务层使用裸 `BigDecimal` 做金额运算
  - DB 层 PO 用 `BigDecimal`，Assembler 层转 `Money`
  - 检查：涉及金额的变量/参数类型

- [ ] **金额分摊必须使用 `MoneyAllocator`**
  - `MoneyAllocator.allocate(total, weights)` 按权重分摊
  - `MoneyAllocator.allocateEvenly(total, count)` 均分
  - 分摊后调用 `MoneyAllocator.verifySum()` 校验
  - 检查：是否有手动除法分摊金额的代码

---

## 6. 动作执行（kernel-action-starter）

### BLOCKER 级

- [ ] **关键写操作应通过 `ActionExecutor` 执行**
  - 自动包装幂等 + 审计 + OTel 链路
  - 实现 `TradeAction` 接口，注册 action code
  - 检查：涉及资金/库存/状态变更的写操作是否接入 ActionExecutor

### WARNING 级

- [ ] **Action code 应全局唯一且语义清晰**
  - 格式：`{resource}.{operation}`，如 `order.create`、`inventory.adjust`
  - 检查：新增 TradeAction 的 code 命名

---

## 7. 事件发布（kernel-outbox-starter）

### BLOCKER 级

- [ ] **跨域事件必须通过 Outbox 发布**
  - `OutboxPublisher.publish(aggregateType, aggregateId, eventType, payload)`
  - 事件必须与业务数据在**同一事务**内写入
  - 检查：是否有在事务外直接发 Kafka 消息

### WARNING 级

- [ ] **消费端必须基于 eventId 做幂等**
  - Outbox 保证至少一次投递，消费端需去重
  - 检查：事件消费逻辑是否有幂等处理

---

## 8. 文件存储（kernel-file-starter）

### WARNING 级

- [ ] **文件操作使用 `FileStorageService`**
  - `upload()` / `delete()` / `getUrl()` / `getPresignedUrl()`
  - 禁止直接操作 OSS SDK
  - 检查：是否有直接引用阿里云/AWS SDK 的文件操作代码

---

## 9. 通知推送（kernel-notification-starter）

### WARNING 级

- [ ] **实时通知使用 `NotificationPublisher`**
  - `publishNotification()` / `publishBizEvent()` / `publishCounters()`
  - 检查：是否有自行实现 WebSocket 推送的代码
