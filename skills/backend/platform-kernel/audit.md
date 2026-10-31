# Operation Audit (kernel-audit-starter)

audit-starter：通过 AOP 自动采集操作审计日志。

---

## @Audited 用法

```java
@Audited(action = "order.create", resource = "order")
public R<OrderVO> createOrder(@RequestBody CreateOrderReq req) { ... }

@Audited(action = "user.changePassword", resource = "user", logParams = false)
public void changePassword(ChangePasswordReq req) { ... }

@Audited(action = "order.export", resource = "order", logResponse = true)
public List<OrderVO> exportOrders(...) { ... }

@Audited(action = "user.login", resource = "user", maskFields = {"password", "captcha"})
public LoginVO login(LoginReq req) { ... }
```

| 属性 | 默认值 | 说明 |
|------|--------|------|
| `action` | 必填 | 操作语义标签 |
| `resource` | "" | 资源类型 |
| `logParams` | true | 记录方法参数 |
| `logResponse` | false | 记录返回值（截断 2KB） |
| `maskFields` | {} | 额外脱敏字段 |

---

## 内置脱敏字段

`password, passwd, token, secret, authorization, accesstoken, refreshtoken, idcard, bankcard`（不区分大小写，递归匹配 JSON 嵌套）

---

## AuditEvent 字段

身份：userId, operator | HTTP：method, uri, clientIp, userAgent | 业务：action, resource, resourceId | 数据：requestParams, responseResult | 结果：success, errorMessage, elapsedMs | 追踪：traceId, timestamp

---

## 日志输出

- Logger 名称：`BIZ_AUDIT`（可配独立 appender）
- 成功：INFO，失败：WARN（附 `FAILED error=...`）
- MongoDB：`audit_logs` 集合，索引 userId/action/traceId/timestamp

---

## 自动装配优先级

1. 自定义 AuditLogger bean → 使用
2. MongoTemplate 存在 → MongoAuditLogger（双写 Mongo + SLF4J）
3. 其他 → Slf4jAuditLogger

开关：`lf.audit.enabled=true`（默认 true）

---

## 注意事项

- 审计不中断主流程，内部异常 catch + warn
- 非 Web 上下文可用（HTTP/用户字段为 null）
- 跳过序列化：HttpServletRequest/Response, MultipartFile
- @Audited 与 @RequiresCapability 共存时，鉴权切面先执行，权限拒绝无审计记录
- **@Audited 只审计不鉴权**：只挂 @Audited 的接口等于对所有登录用户开放，鉴权必须另挂 @RequiresCapability
