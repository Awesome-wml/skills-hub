# 可靠性与幂等检查清单

覆盖幂等设计、Outbox 事件、事务边界、异常处理、并发控制。

---

## 1. 幂等设计

### BLOCKER 级

- [ ] **关键写操作必须幂等**
  - 使用 `ActionExecutor` + `IdempotencyGuard`
  - `ActionContext.builder().idempotencyKey("ORDER-" + requestId)` 指定幂等键
  - 检查：创建订单/支付/库存扣减等操作是否接入幂等机制

- [ ] **幂等键必须由调用方生成**
  - 前端传入 `requestId` 或由业务规则生成唯一键
  - 禁止在服务端生成幂等键（无法防重复提交）
  - 检查：幂等键的来源是否合理

- [ ] **Repository 应提供幂等查询方法**
  - `existsByIdempotencyKey()` 或 `findByBizDocId()`
  - 检查：关键写操作前是否有幂等预检

### WARNING 级

- [ ] **HTTP 接口幂等语义**
  - POST：通过 idempotencyKey 保证幂等
  - PUT：天然幂等（全量更新）
  - DELETE：天然幂等（重复删除无副作用）
  - 检查：接口的 HTTP Method 是否匹配幂等语义

---

## 2. Outbox 事件可靠性

### BLOCKER 级

- [ ] **事件必须与业务数据同事务写入**
  - `OutboxPublisher.publish()` 必须在 `@Transactional` 范围内调用
  - 检查：publish 调用是否在事务边界内

- [ ] **事件负载应包含完整业务信息**
  - 消费方不应依赖回查生产方数据库
  - 事件 payload 应自包含所需的业务数据
  - 检查：事件 payload 是否足够消费方独立处理

- [ ] **消费方必须实现幂等**
  - 基于 `eventId` 去重（至少一次投递保证）
  - 检查：事件消费逻辑是否有去重处理

### WARNING 级

- [ ] **事件类型命名应语义清晰**
  - 格式：`{aggregate}.{past_tense}`，如 `order.created`、`inventory.adjusted`
  - 检查：eventType 命名是否规范

- [ ] **DEAD 事件需要告警**
  - 超过最大重试次数的事件标记为 DEAD
  - 应有监控告警 + 人工介入机制
  - 检查：是否配置了 DEAD 事件的告警

---

## 3. 事务边界

### BLOCKER 级

- [ ] **@Transactional 范围应最小化**
  - 只包裹数据库操作，不包裹远程调用（Feign/gRPC/HTTP）
  - 避免长事务导致连接池耗尽和锁等待
  - 检查：@Transactional 方法内是否有远程调用

- [ ] **事务传播行为应正确**
  - 默认 `REQUIRED`：加入现有事务
  - 独立事务场景使用 `REQUIRES_NEW`（如审计日志写入）
  - 检查：事务传播行为是否符合业务需求

- [ ] **避免 @Transactional 自调用失效**
  - Spring AOP 代理不拦截同类内部方法调用
  - 检查：`@Transactional` 方法是否被同一类的其他方法直接调用

### WARNING 级

- [ ] **只读查询使用 `@Transactional(readOnly = true)`**
  - 提示数据库优化器可以使用只读事务
  - 检查：纯查询方法是否标记了 readOnly

---

## 4. 异常处理

### BLOCKER 级

- [ ] **业务异常与系统异常严格区分**
  - 业务异常：`BizException`（预期的，WARN 级别）
  - 系统异常：未捕获的 Exception（非预期的，ERROR 级别）
  - 禁止 catch(Exception) 后吞掉异常或转为业务异常
  - 检查：catch 块是否正确处理了异常类型

- [ ] **禁止空 catch 块**
  - 至少记录日志或重新抛出
  - 检查：是否有空的 catch(Exception e) {}

- [ ] **异常信息不应泄露内部实现，且要讲清因果与处理**
  - `BizException.of("用户名已存在")` — 面向用户的消息
  - 禁止直接 throw `e.getMessage()` / 第三方错误原文给前端
  - 检查：BizException 的 message 是否包含堆栈/SQL/类名等内部信息
  - 检查：涉及业务失败的文案、通知模板、异常原因字段是否讲清——什么问题（带对象/金额）、这次的具体原因、影响、系统已做了什么、谁处理、怎么处理（入口 + 步骤）、处理后怎样；系统 bug 是否明说「系统问题，研发处理后自动恢复」。只写「打款失败」之类 → WARNING
  - 文案提到的入口/按钮/时效/「系统会自动 xx」须能在前端路由和代码里找到，找不到要求标【待确认】

### WARNING 级

- [ ] **远程调用应有降级/超时处理**
  - Feign 配置超时时间
  - gRPC 配置 deadline
  - 失败场景有合理的兜底策略
  - 检查：远程调用是否有超时配置

---

## 5. 并发控制

### BLOCKER 级

- [ ] **并发更新场景必须有乐观锁或悲观锁**
  - 库存扣减：SELECT ... FOR UPDATE 或 UPDATE ... WHERE qty >= #{deduct}
  - 状态变更：WHERE status = #{expectedStatus}
  - 检查：并发写场景是否有锁保护

### WARNING 级

- [ ] **批量操作应控制批次大小**
  - MyBatis-Plus 批量插入/更新使用分批处理
  - 避免一次性操作大量数据导致内存溢出或长事务
  - 检查：批量操作是否有分页/分批处理

- [ ] **分布式锁使用 Redis**
  - 跨实例互斥操作应使用 Redis 分布式锁
  - 锁必须有超时时间（避免死锁）
  - 检查：跨实例的互斥场景是否有分布式锁
