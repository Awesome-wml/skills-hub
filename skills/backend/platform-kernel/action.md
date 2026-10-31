# Action Execution Framework (kernel-action-starter)

action-starter：统一的动作执行框架，自动包装幂等、审计、OTel 链路追踪。

---

## 实现 TradeAction

```java
@Component
public class CreateOrderAction implements TradeAction {
    @Override public String code() { return "order.create"; }
    @Override public ActionResult execute(ActionContext context) {
        CreateOrderCommand cmd = context.getParam("cmd");
        // 业务逻辑...
        return ActionResult.ok(Map.of("orderId", order.getId()));
    }
}
```

所有 `TradeAction` bean 启动时自动注册到 `ActionRegistry`。

---

## 调用 ActionExecutor

```java
ActionContext ctx = ActionContext.builder()
    .bizContext(bizCtx)
    .idempotencyKey("ORDER-" + requestId)
    .operator(AuthContext.getLoginId())
    .param("cmd", command)
    .build();

ActionResult result = actionExecutor.execute("order.create", ctx);
if (result.isSuccess()) {
    String orderId = result.getData(Map.class).get("orderId").toString();
}
```

---

## 执行流程

```
ActionExecutor.execute(code, ctx)
  ├── ActionRegistry.resolve(code)
  ├── 创建 OTel Span: "action.{code}"
  ├── 幂等检查: IdempotencyGuard.firstSeen(key)
  │    └── 重复 → fail("IDEMPOTENT_DUPLICATE")
  ├── action.execute(ctx) → ActionResult
  ├── ActionAuditLogger.log(code, ctx, result, elapsed, error)
  └── Span.end()
```

---

## ActionResult API

```java
ActionResult.ok()                          // success=true, code="OK"
ActionResult.ok(data)                      // 带数据
ActionResult.fail("STOCK_INSUFFICIENT", "库存不足")
result.isSuccess() / result.getCode() / result.getMessage()
result.<T>getData(Class<T> type)           // 类型安全
```

---

## 自定义审计日志

```java
@Bean
public ActionAuditLogger actionAuditLogger() {
    return (code, ctx, result, elapsed, error) -> { /* Kafka/ES/... */ };
}
```

---

## 注意事项

- IdempotencyGuard 来自 outbox-starter，可选。无 Guard 跳过幂等检查
- action code 全局唯一，重复抛 IllegalStateException
- OTel 无 Agent 时为 no-op
- 异常捕获后重新抛出（不吞），审计在 finally 中记录
