# Web Infrastructure (kernel-web-starter)

web-starter：统一响应包装、异常处理、认证上下文、登录拦截。

---

## R<T> 统一响应（HTTP 始终 200）

```java
R.ok(data)                                  // code=0
R.ok()                                      // code=0, 无 data
R.page(list, total, pageNum, pageSize)       // code=0, PageData
R.fail(ErrorCode.BIZ_ERROR, "库存不足")      // code=42200
R.fail("操作失败")                           // code=42200
```

```json
{ "code": 0, "message": "ok", "data": {...}, "traceId": "abc", "timestamp": 1700000000000 }
```

---

## ErrorCode 编码规范

| 范围 | 含义 | 常量 |
|------|------|------|
| 0 | 成功 | SUCCESS |
| 400xx | 参数 | PARAM_ERROR(40000), PARAM_MISSING(40001), PARAM_INVALID(40002) |
| 401xx | 认证 | NOT_LOGIN(40100), TOKEN_EXPIRED(40101) |
| 403xx | 权限 | FORBIDDEN(40300), ROLE_DENIED(40301) |
| 404xx | 未找到 | NOT_FOUND(40400) |
| 409xx | 冲突 | IDEMPOTENCY_CONFLICT(40900), DUPLICATE_KEY(40901) |
| 422xx | 业务 | BIZ_ERROR(42200), INVALID_STATUS(42201), INSUFFICIENT(42202) |
| 500xx | 服务端 | SERVER_ERROR(50000), REMOTE_ERROR(50200) |

---

## BizException

```java
throw BizException.of("用户名已存在");                       // 42200
throw BizException.notFound("Order", orderId);              // 40400
throw BizException.invalidStatus("PENDING", "SHIPPED");     // 42201
throw BizException.idempotencyConflict(requestId);          // 40900
throw new BizException(422001, "库存不足：剩余 " + available);
```

---

## GlobalExceptionHandler 映射

| 异常 | Code | 级别 |
|------|------|------|
| BizException | 自带 code | WARN |
| NotLoginException | 40100 | WARN |
| NotPermissionException | 40300 | WARN |
| MethodArgumentNotValidException | 40000 | WARN |
| ForbiddenException | 40300 | WARN |
| Exception (兜底) | 50000 | ERROR |

---

## AuthContext

```java
String userId = AuthContext.getLoginId();           // 未登录抛异常
String userId = AuthContext.getLoginIdOrNull();     // null 安全
boolean loggedIn = AuthContext.isLogin();
LoginUserInfo user = AuthContext.getLoginUser();    // 完整信息
AuthContext.setLoginUser(loginUserInfo);            // 登录时写入
```

---

## PageData

```java
PageData<OrderVO> pageData = PageData.of(voList, page.getTotal(), pageNum, pageSize);
return R.page(pageData);
// { "list": [...], "total": 100, "pageNum": 1, "pageSize": 20, "pages": 5, "hasMore": true }
```

---

## 登录拦截配置

```yaml
lf:
  web:
    auth:
      enabled: true
      exclude-paths:
        - /api/*/public/**
        - /webhook/**
```

内置排除：`/*/auth/**`, `/*/health`, `/actuator/**`, `/swagger-ui/**`, `/v3/api-docs/**`, `/scalar/**`, `/error`

---

## 注意事项

- HTTP 状态码始终 200，前端通过 code 判断
- traceId 从 MDC 自动填充
- BizException 是预期异常（WARN），兜底 Exception 是非预期（ERROR）
- Sa-Token Session 存 Redis，所有服务共享
