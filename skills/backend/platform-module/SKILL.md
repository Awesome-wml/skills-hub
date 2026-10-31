---
name: platform-module
description: 在本项目中新增业务模块、Controller、Service、Action、Repository 或整个微服务模块时的代码生成指引。遵循 system-core 的 DDD 分层架构和 platform-kernel 六大 starter 治理规范。当用户要新增功能、业务类、接口、Action 或服务模块，或给接口加鉴权（@RequiresCapability / C 端 @ConsumerApi）、标注调用端、改存量接口时使用。
---

# Platform Module 代码生成指引

参考实现：`generated-platform05/system-core`

---

## 一、Platform Kernel Starters（核心工具库）

所有 starter 坐标：`com.lengfeng.platform:kernel-*-starter:0.1.2`

### 1. kernel-web-starter — 统一响应 & 异常

```java
// 统一响应
R<T>  R.ok(T data)  R.ok()  R.fail(String msg)  R.fail(int code, String msg)
R<PageData<T>>  R.page(PageData<T> pageData)

// 分页
PageData<T>  PageData.of(List<T> list, long total, int pageNum, int pageSize)
PageData<T>  PageData.empty(int pageNum, int pageSize)

// 业务异常（自动被 GlobalExceptionHandler 捕获返回标准 R）
BizException.of(String msg)
BizException.notFound(String resource, Object id)
BizException.invalidStatus(String current, String target)
BizException.idempotencyConflict(String key)

// 错误码常量（ErrorCode 接口）
SUCCESS=0  PARAM_ERROR=40000  NOT_LOGIN=40100  FORBIDDEN=40300
IDEMPOTENCY_CONFLICT=40900  BIZ_ERROR=42200  SERVER_ERROR=50000
```

配置：`lf.web.auth.enabled=true`，`lf.web.auth.exclude-paths`

---

### 2. kernel-action-starter — 统一写操作执行器

```java
// 实现 Action
@Component
public class CreateXxxAction implements TradeAction {
    @Override public String code() { return "资源.动作"; }  // 命名：资源.动作
    @Override public ActionResult execute(ActionContext ctx) {
        String val = (String) ctx.getParam("key");
        // ...业务逻辑...
        return ActionResult.ok(Map.of("entityId", id));   // 或 ActionResult.fail(code, msg)
    }
}

// 执行（在 AppService 中调用）
ActionContext ctx = ActionContext.builder()
    .bizContext(bizCtx)           // BizContext（来自 kernel-routing-starter）
    .idempotencyKey(cmd.getIdempotencyKey())
    .operator(cmd.getOperatorId())
    .param("key", value)
    .build();
ActionResult result = actionExecutor.execute("资源.动作", ctx);
if (!result.isSuccess()) throw new IllegalStateException(result.getMessage());
String id = (String) result.getData().get("entityId");
```

自动装配：`ActionRegistry`（扫描所有 `TradeAction` Bean）、`ActionExecutor`（包装幂等+审计）

---

### 3. kernel-audit-starter — 操作审计

```java
// 注解（加在 Controller 和 AppService 写方法上，两层形成完整链路）
@Audited(action = "资源.动作", resource = "资源")                  // 基础
@Audited(action = "user.login", resource = "user", logParams = false)   // 敏感接口不记参数
@Audited(action = "order.create", resource = "order", logParams = true) // 记录入参

// AuditEvent 关键字段（由 AuditAspect 自动填充）
userId, operator, httpMethod, requestUri, clientIp, userAgent,
action, resource, resourceId, requestParams, success, elapsedMs, traceId, timestamp
```

配置：`lf.audit.enabled=true`，持久化到 MongoDB（`spring.data.mongodb.uri`）

---

### 4. kernel-outbox-starter — Outbox 模式 & 幂等

```java
// 发布跨域事件（在 AppService 中调用）
@Autowired ObjectProvider<OutboxPublisher> publisherProvider;
OutboxPublisher pub = publisherProvider.getIfAvailable();
if (pub != null) {
    pub.publish("aggregateType", aggregateId, "eventType", jsonPayload);
    //          "order"          orderId      "order.created"  "{...}"
}

// 业务方需实现（基础设施层）
OutboxRepository   → save / findPendingEvents / markSent / updateRetry / markDead
OutboxEventSender  → send(OutboxEvent event)   // 通常用 Kafka 实现

// 幂等守卫（由 ActionExecutor 内部使用，也可单独注入）
IdempotencyGuard.firstSeen(String idempotencyKey)  // true=首次，false=重复

// OutboxEvent 字段
id, eventId, aggregateType, aggregateId, eventType, payload,
status(PENDING/SENT/DEAD), retryCount, nextRetryTime
```

配置：`lf.outbox.relay.enabled=true`，`batch-size=50`，`max-retries=5`，`schedule-fixed-delay-ms=5000`

---

### 5. kernel-authz-starter — 接口鉴权（@RequiresCapability）

```java
import com.lengfeng.platform.kernel.authz.RequiresCapability;

// 推荐：无参 —— 加了 = 需要鉴权，所需权限由「原子 → 接口」配置决定（未配置 = 403，fail-closed）
@RequiresCapability
// 存量：能力码写死（配置对它不生效）
@RequiresCapability(Capability.Codes.COMMERCE_AFTERSALE_MANAGE)
// 资金/权限变更：额外校验 Token 存活
@RequiresCapability(securityLevel = SecurityLevel.HIGH)

// C 端（commerce-core）组合注解：登录 + consumer 身份校验 + 可选审计，不做 RBAC；
// 数据隔离靠 service 层 WHERE user_id = AuthContext.getLoginId()
@ConsumerApi(action = "order.create", resource = "order", audit = true)
```

- **`@RequiresPermission(domain, object, action)` 已废弃**（kernel 标 `@Deprecated`，origin/dev 只剩个别存量类），新代码不要再写，也不再往 `lf.authz.casbin.policies` 加策略。
- `@Audited` 只审计不鉴权；没有任何鉴权注解 = 公开接口（需登记 `scripts/endpoint-capability-exemptions.txt`）。
- 无参接口要配原子映射（`/authz-map`），并用非超管账号验证——超管直接放行，自测看不出漏配。
- 详见 platform-kernel `authz.md`。

---

### 6. kernel-dict-starter — 字典翻译

```java
// 编程式（在 Service 中使用）
@Autowired DictTranslator dictTranslator;
String label = dictTranslator.label("order_status", "PENDING");

// DTO 字段翻译注解（响应 DTO，自动补充 xxxLabel 字段）
@DictLabel("order_status")
private String status;  // 返回时自动生成 statusLabel
```

配置：`lf.dict.enabled=true`，`easy-trans.is-enable-redis=true`

> 状态码 → 中文一律走 `@DictLabel`，前端读 `row.xxxLabel`，不要在前端硬编码 map。字典 `code` = 后端枚举名、`label` = 中文，灌在 `system-core/.../db/seed/common/R__dict_*.sql`（主键用秒级时间戳，upsert 按业务键门控，见 `/dict-creator`）；commerce 域 dict_key 登记在 `CommerceDictKeys.java`。

---

### 7. kernel-web-starter — Session 用户上下文

```java
// 登录时写入（AuthController.login() 调用 StpUtil.login() 之后）
AuthContext.setLoginUser(LoginUserInfo.builder()
        .userId(user.getId())          // Long，实际从用户表查询
        .username(user.getUsername())
        .nickname(user.getNickname())
        .roles(List.of("admin", "user"))
        .permissions(List.of("order:create", "order:query"))
        .build());

// 任意微服务中读取（Sa-Token Session 以 Redis 共享，持相同 Token 即可读取）
LoginUserInfo userInfo = AuthContext.getLoginUser();  // 未登录抛 NotLoginException
String loginId  = AuthContext.getLoginId();           // 未登录抛 NotLoginException
String loginId  = AuthContext.getLoginIdOrNull();     // 未登录返回 null，不抛异常
boolean isLogin = AuthContext.isLogin();

// 跨请求/跨服务场景（如异步任务已知 userId）
LoginUserInfo userInfo = AuthContext.getLoginUserById(userId);

// LoginUserInfo 字段
Long   userId;        // 用户 ID
String username;      // 登录账号
String nickname;      // 显示名称
List<String> roles;   // 角色编码列表
List<String> permissions; // 权限标识列表
```

> **原理**：Sa-Token Session 以 Redis 为后端（`sa-token.is-share=true`），登录时写入后，
> 其他微服务持相同 Bearer Token 发起请求，`StpUtil.getSession()` 读取的是同一个 Redis key，
> 因此无需重复查库即可获得完整用户上下文。

---

### 8. kernel-routing-starter — 渠道路由

```java
// BizContext（贯穿整个请求链路）
BizContext bizCtx = new BizContext();
bizCtx.setBizDocId(cmd.getOrderNo());          // 业务单号
bizCtx.setSalesChannel(SalesChannel.TOC_MALL); // 销售渠道枚举
bizCtx.setPlatformCode(PlatformCode.SELF_MALL);
bizCtx.setBizScene("checkout");

// SalesChannel 枚举：LIVE_ROOM / OFFLINE_STORE / TOC_MALL / AGENCY
// PlatformCode 枚举：WECHAT_LIVE / DOUYIN_LIVE / SELF_MALL / POS / ERP_IMPORT

// 实现渠道适配器（可选，多渠道差异化处理时使用）
public class WechatLiveAdapter implements ChannelAdapter<WechatReq, BizContext> {
    public SalesChannel supportChannel() { return SalesChannel.LIVE_ROOM; }
    public PlatformCode supportPlatform() { return PlatformCode.WECHAT_LIVE; }
    public String supportBizScene() { return "checkout"; }
    public BizContext adapt(WechatReq req) { ... }
}
```

---

### 9. kernel-infra-starter — 基础设施

```java
// PO 基类（MyBatis-Plus，自动填充 createdAt/updatedAt）
import com.lengfeng.platform.kernel.infra.mybatis.BasePO;
public class XxxPO extends BasePO { ... }
// 注解：@TableName("t_xxx")（id 已由 BasePO 定义，无需重复声明 @TableId）
```

**凡是 PO 继承 `BasePO`，对应 MySQL 建表语句必须包含以下全部字段，缺一不可：**

```sql
-- BasePO 公共字段（所有继承 BasePO 的表必须包含）
`id`         VARCHAR(64)  NOT NULL               COMMENT '主键（雪花算法）',
`tenant_id`  VARCHAR(64)  NOT NULL DEFAULT ''    COMMENT '租户ID',
`created_at` DATETIME(3)  NOT NULL               COMMENT '创建时间',
`created_by` VARCHAR(64)  NOT NULL DEFAULT ''    COMMENT '创建人ID',
`updated_at` DATETIME(3)  NOT NULL               COMMENT '更新时间',
`updated_by` VARCHAR(64)  NOT NULL DEFAULT ''    COMMENT '更新人ID',
`version`    INT          NOT NULL DEFAULT 0     COMMENT '乐观锁版本号',
`deleted`    TINYINT(1)   NOT NULL DEFAULT 0     COMMENT '逻辑删除：0=正常，1=已删除',
PRIMARY KEY (`id`)

// MongoDB 文档基类
public class XxxDocument extends BaseDocument { ... }

// Kafka 幂等消费基类
public class XxxMessageHandler extends IdempotentMessageHandler {
    protected void handleMessage(PlatformMessage message) { ... }
}

// Kafka 消息格式
PlatformMessage  // 字段：eventId, eventType, aggregateType, aggregateId, payload, traceId
```

配置：`lf.tenant.enabled=false`（多租户，默认关）；`lf.tenant.column=tenant_id`

---

### 10. kernel-infra-starter — 延迟任务（Kafka Delayed Task）

基于 Redis ZSET + Kafka 实现轻量延迟调度，无需引入额外中间件。

```yaml
# application.yml
lf:
  delay:
    enabled: true              # 默认关闭，按需开启
    poll-interval-ms: 1000     # 轮询间隔（毫秒）
    batch-size: 50             # 每批最多摘取任务数
    topic: delay.task.trigger  # Kafka topic，消费端订阅此 topic
```

```java
// 生产端：调度延迟任务（在 AppService 中调用）
@Autowired ObjectProvider<DelayTaskPublisher> delayPublisherProvider;

DelayTaskPublisher delayPublisher = delayPublisherProvider.getIfAvailable();
if (delayPublisher != null) {
    String taskId = delayPublisher.schedule(
        "order.auto_refund",                          // taskType（命名：资源.动作）
        orderId,                                       // bizId（Kafka key，保证有序消费）
        String.format("{\"orderId\":\"%s\"}", orderId), // payload（JSON）
        Duration.ofMinutes(30)                         // 延迟时长
    );
    // 取消任务（可选）：delayPublisher.cancel(taskId);
}

// 消费端：extends IdempotentMessageHandler，过滤 taskType 处理
@Component
public class OrderAutoRefundHandler extends IdempotentMessageHandler {

    public OrderAutoRefundHandler(StringRedisTemplate redis, ObjectMapper mapper,
                                  OrderAppService orderAppService) {
        super(redis, mapper);
        this.orderAppService = orderAppService;
    }

    @KafkaListener(topics = "${lf.delay.topic:delay.task.trigger}",
                   groupId = "commerce-core-delay-group")
    public void listen(ConsumerRecord<String, String> record) { consume(record); }
    // 注意：方法名不能用 onMessage（基类已声明 final），改用任意其他名称再调用 consume()

    @Override
    protected void handleMessage(PlatformMessage message) {
        if (!"order.auto_refund".equals(message.getEventType())) return; // 过滤其他 taskType
        orderAppService.cancel(message.getAggregateId());
    }
}
```

**运行机制：**
1. `DelayTaskPublisher.schedule()` → 写入 Redis ZSET（score = 当前时间 + 延迟毫秒数）
2. `DelayTaskPoller`（每秒执行）→ Lua 脚本原子摘取 score ≤ now 的任务 → 发送 `PlatformMessage` 到 Kafka
3. 消费端 `@KafkaListener` → `IdempotentMessageHandler` 幂等去重 → 按 `eventType` 路由业务逻辑

**并发安全：** Lua 脚本在 Redis 单线程中执行 ZRANGEBYSCORE + ZREM，多实例部署时每个任务只触发一次。

**取消机制：** `cancel(taskId)` 将 taskId 写入 Redis SET，轮询器摘取时检查并跳过。

---

## 二、包结构（DDD 分层）

```
cn.org.lengfenghl.laowang.{domain}.core.
├── api/controller/          # REST 端点（@RequiresCapability 鉴权 + @Audited 审计；C 端 @ConsumerApi）
├── api/dto/                 # 请求/响应 DTO（@DictLabel 翻译状态）
├── application/
│   ├── assembler/           # MapStruct：DTO → Command
│   ├── command/             # 命令对象（含 idempotencyKey、operatorId）
│   ├── service/             # 应用服务：编排，写操作走 ActionExecutor
│   └── action/              # TradeAction 实现
├── domain/
│   ├── model/               # 聚合根（含 create() / restore() 工厂方法）
│   └── repository/          # 仓储接口
├── infrastructure/
│   ├── persistence/mapper/  # MyBatis-Plus Mapper
│   ├── persistence/po/      # 继承 BasePO
│   ├── persistence/repository/  # InMemory（默认）+ MyBatisImpl
│   └── outbox/              # OutboxRepository + KafkaOutboxEventSender 实现
└── health/                  # HealthController（GET /{module}/health）
```

---

## 三、代码骨架

### Controller

```java
@Tag(name = "模块名（PC 管理后台）")
@RestController
@RequestMapping("/{module-name}/资源")
public class XxxController {

    @Operation(summary = "[PC] 创建资源")      // 调用端前缀：[PC] / [APP] / [H5]，多端写 [PC + APP] 并说明差异
    @Audited(action = "资源.create", resource = "资源")
    @RequiresCapability
    @PostMapping("/create")
    public R<String> create(@RequestBody XxxDTO dto) {
        return R.ok(appService.create(assembler.toCommand(dto)));
    }

    @Operation(summary = "[PC] 资源分页查询")
    @RequiresCapability
    @GetMapping("/list")
    public R<PageData<XxxResponseDTO>> page(PageRequest req,
                                            @RequestParam(required = false) String status) {
        return R.ok(appService.queryPage(req, status));
    }
}
```

> **登录校验**：由 Sa-Token 拦截器统一处理（`SaTokenInterceptorConfig`），**严禁**在 Controller / Service 方法内写 `StpUtil.checkLogin()`。
>
> **权限校验**：通过 `@RequiresCapability` 注解由 `AuthzAspect` 处理，**严禁**在方法内写 `StpUtil.checkPermissionOr()`。
>
> **调用端**：同一业务在 PC 后台、BD App、店长 H5 入口不同，`@Operation(summary)` 必须以 `[PC]` / `[APP]` / `[H5]` 开头，否则排查容易走错链路；新接口路径建议体现端（`/v1/app/...`、`/v1/pc/...`、`/h5/...`）。
>
> **改存量接口**：只追加可选字段 / 枚举值，不换路径、不删字段、不删已有状态值（如 `BLOCKED`）；新行为装在现有接口背后，现网没有的动作才新增接口并挂在现有 Controller 前缀下。为什么：前端、运维脚本和其他服务依赖现有契约（2026-10-21 被纠正过）。
>
> **获取当前登录用户**：**严禁**直接调用 `StpUtil.getLoginId()` 等原生方法，统一使用 `AuthContext` 工具类：
> ```java
> LoginUserInfo userInfo = AuthContext.getLoginUser();      // 未登录抛 NotLoginException
> String loginId         = AuthContext.getLoginId();        // 未登录抛 NotLoginException
> String loginId         = AuthContext.getLoginIdOrNull();  // 未登录返回 null，不抛异常
> boolean isLogin        = AuthContext.isLogin();
> // 已知 userId 的跨请求场景（如异步任务）
> LoginUserInfo userInfo = AuthContext.getLoginUserById(userId);
> ```

### AppService（写操作）

```java
@Audited(action = "资源.create", resource = "资源", logParams = true)
public String create(XxxCommand cmd) {
    BizContext bizCtx = new BizContext();
    bizCtx.setBizDocId(cmd.getBizNo());

    ActionContext ctx = ActionContext.builder()
            .bizContext(bizCtx)
            .idempotencyKey(cmd.getIdempotencyKey())
            .operator(cmd.getOperatorId())
            .param("bizNo", cmd.getBizNo())
            .build();

    ActionResult result = actionExecutor.execute("资源.create", ctx);
    if (!result.isSuccess()) throw new IllegalStateException(result.getMessage());

    String id = (String) result.getData().get("entityId");

    OutboxPublisher pub = publisherProvider.getIfAvailable();
    if (pub != null) {
        pub.publish("资源", id, "资源.created",
                String.format("{\"id\":\"%s\",\"bizNo\":\"%s\"}", id, cmd.getBizNo()));
    }
    return id;
}
```

### TradeAction

```java
@Component
public class CreateXxxAction implements TradeAction {
    @Override public String code() { return "资源.create"; }

    @Override
    public ActionResult execute(ActionContext ctx) {
        String bizNo = (String) ctx.getParam("bizNo");
        Xxx entity = Xxx.create(bizNo);
        repository.save(entity);
        return ActionResult.ok(Map.of("entityId", entity.getId()));
    }
}
```

### 聚合根

```java
@Getter
public class Xxx {
    private String id;
    private XxxStatus status;   // 枚举，对外用 .code()

    public static Xxx create(String bizNo) {
        Xxx e = new Xxx();
        e.id = UUID.randomUUID().toString().replace("-", "");
        e.status = XxxStatus.PENDING;
        return e;
    }

    public static Xxx restore(String id, String statusCode) {
        Xxx e = new Xxx();
        e.id = id;
        e.status = XxxStatus.fromCode(statusCode);
        return e;
    }
}
```

---

## 四、端口约定

| 模块 | 端口 |
|------|------|
| gateway-bff | 18080 |
| commerce-core | 18081 |
| fulfillment-core | 18082 |
| settlement-core | 18083 |
| system-core | 18084 |

---

## 五、新增模块检查清单

- [ ] 包路径：`cn.org.lengfenghl.laowang.{domain}.core`
- [ ] Controller `@RequestMapping` 前缀 = `/{module-name}/`
- [ ] 写操作通过 `ActionExecutor`，Action code = `资源.动作`（动词用 create/cancel/update）
- [ ] Controller 和 AppService 写方法均加 `@Audited`（两层审计链路）
- [ ] 跨域事件走 `OutboxPublisher`，不直接调用 Kafka Producer
- [ ] 响应 DTO 状态字段用 `.code()` 返回，配合 `@DictLabel` 翻译
- [ ] Command 必含 `idempotencyKey` 和 `operatorId`
- [ ] 默认使用 `InMemoryXxxRepository`；切换 MyBatis 后删除 `initialization-fail-timeout: -1`
- [ ] 需鉴权接口挂 `@RequiresCapability`（C 端 `@ConsumerApi`），无参接口已配原子映射；不再声明 Casbin 策略
- [ ] `@Operation(summary)` 标注调用端 `[PC]` / `[APP]` / `[H5]`
- [ ] 查询：单表用 MyBatis-Plus + `LambdaQueryWrapper`（含 `selectPage`），多表写 XML，不用 `@Select`、不用 `Map<String, Object>` 接返回
- [ ] 新模块加入根 `pom.xml` 的 `<modules>` 列表；ArgoCD Application 在 octopus-infra 仓库维护（见 springboot3-backend 检查清单）
- [ ] 新增环境变量 / `secretKeyRef` 改 octopus-deploy 仓库 `charts/<服务>/values*.yaml`（PR base=main），octopus-cloud 的 `deploy/charts/` 是遗留、改了不生效；新密钥建议 `optional: true`
- [ ] `BizException` 替代直接抛 `RuntimeException`（自动映射为标准 `R` 响应）；文案讲清问题、原因、影响、谁处理、怎么处理，不透传技术原文（见 springboot3-backend 代码约束第 8 条）
- [ ] 提 PR 前本地跑 octopus-cloud CI 门禁脚本（见 springboot3-backend「提 PR 前本地跑 CI 门禁」）
