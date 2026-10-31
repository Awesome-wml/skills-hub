---
name: springboot3-backend
description: 本项目 Spring Boot 3 后端开发规范，基于 platform-kernel 全套 starter、DDD 分层架构、Sa-Token 认证、@RequiresCapability 能力鉴权（C 端 @ConsumerApi）、Outbox 模式、ActionExecutor 幂等执行、@Audited 审计、kernel-id 编码/ID 生成（SnowflakeIdGenerator/BizNoFormatter）、Flyway 数据库版本管理；含 5 库分库边界基线（database-boundary.md）。遵循阿里巴巴 Java 开发规范。当开发 Java 后端、新增业务模块、Controller、Service、Action、Repository、数据库迁移、生成订单号/SKU 编码/单号或微服务时使用；也用于写 Mapper/XML 查询、加字典 label（@DictLabel）、写 R__ 种子、设计接口契约（标注 PC/APP/H5 调用端、向后兼容）、写 BizException 提示文案、提 octopus-cloud PR 前跑 CI 门禁、新增服务环境变量。
metadata:
  last-updated: "2026-10-31"
  spring-boot-version: "3.5.9"
  spring-cloud-version: "2025.0.0"
  jdk-version: "17"
---

# Spring Boot 3 后端开发（Platform Kernel 版）

遵循**阿里巴巴 Java 开发规范（嵩山版）**，结合 platform-kernel 全套 starter 治理规范。

参考实现：`generated-platform05/system-core`

---

## 项目知识沉淀（写代码前必查）

> **强制必查（与 [`docs-knowledge-mandatory.mdc`](../../rules/docs-knowledge-mandatory.mdc) 等价）**：动手任何业务代码 / spec / bug 修复前，先按下表扫四件套索引。Cursor 的 `alwaysApply` 规则已自动注入四个 INDEX 文件，本 skill 二次提醒——不得跳过。

本项目长期积累的"跨次有用"知识统一沉淀在 **[`docs/knowledge/`](../../../docs/knowledge/README.md)**，分四类：

| 子目录 / 文件 | 用途 | 必查触发场景 |
|---------------|------|--------------|
| [`conventions/INDEX.md`](../../../docs/knowledge/conventions/INDEX.md) | 项目级编码约定补丁（优先级高于本 skill 通用条款） | **写 / 审业务代码前** |
| [`bug-patterns/INDEX.md`](../../../docs/knowledge/bug-patterns/INDEX.md) | 经典 bug 修复库（按「现象」列 grep） | **解 bug 前**（含写新代码自检是否复现已知坑） |
| [`glossary.yaml`](../../../docs/knowledge/glossary.yaml) | 术语表（一词多义 / 多词一义、canonical 命名） | **起草 / 修订 spec、新增字段 / 枚举 / 接口命名时** |
| [`decisions/INDEX.md`](../../../docs/knowledge/decisions/INDEX.md) | 架构 / 业务决策（ADR-lite） | **反向修改既定规则 / 架构前** |

**强制 checklist（每次开发前逐项过）**：
1. 写业务代码 → 扫 `conventions/INDEX.md`，命中即按项目补丁执行（覆盖本 skill 通用条款）
2. 解 bug / 新代码自检 → 在 `bug-patterns/INDEX.md` 的「现象」列 grep 关键症状，避免重复踩坑
3. 命名字段 / 枚举 / 接口 → 在 `glossary.yaml` 查 canonical term，杜绝一词多义
4. 想反向改既定规则 / 架构 → 先读 `decisions/INDEX.md` 命中的 ADR，未命中可提议但需人确认

**沉淀红线**：
- 解出非显然 bug → PR 内一并按 `bug-patterns/TEMPLATE.md` 沉淀 `BP-xxx`（PR 描述说明新增条目）
- 发现命名冲突 → 直接补 `glossary.yaml`
- 候选 `ADR-xxx` / `CONV-xxx` → 仅起草，必须由人确认后落盘
- 文件不存在或未命中不阻塞，正常推进即可

**现状核对以 origin/dev 为准**：本地工作区常签出在落后 dev 上百个提交的功能分支，读工作区文件得出的"现状"可能早已过时。评审、排查、写方案前先 `git fetch` 后用 `git show origin/dev:<path>` 或 `git diff HEAD origin/dev -- <file>` 确认；产出的文档 / 结论注明基线 commit。

---

## 开发前置：Spec 优先（强制）

**核心原则**：代码动手前必须先有"写下来的设计意图"——可以是**新建** spec、**修订**已有 spec、或在既有 spec 上**追加章节**。spec 评审 / 确认通过后方可编码。**不是每次都要新建文件**。

### 何时新建 vs 修订 vs 豁免

| 变更类型 | spec 动作 | 推荐 Skill |
|----------|-----------|------------|
| 全新业务域 / 新模块 / 新聚合 | **新建**领域 spec（含 §1 领域契约 + §6 确认清单） | `octopus-spec-author` → `openspec-propose` → `openspec-apply-change` |
| 已有 spec 覆盖的领域内追加 / 调整契约（新增字段、状态、规则、接口） | **修订**已有 spec：改 §1 契约 + §6 加新的确认项；不另建文件 | 直接编辑 spec，必要时配合 `octopus-confirm-sync` 回填确认 |
| 跨多个已有 spec 的协同变更 / 重构 | **修订涉及的所有 spec**，并在 OpenSpec change 中串联 | `openspec-propose`（change 层串联） |
| 一次性小修补（同一个 spec 范围内、契约不变，仅实现细节调整） | 可不动 spec，PR 描述说明即可 | — |
| Bug 修复 | 一般不动 spec；根因 + 修复方案 + 回归用例沉淀进 PR 描述或 `docs/knowledge/bug-patterns/BP-xxx.md`。若 bug 暴露了 spec 缺漏，**同时修订 spec** | `superpowers:systematic-debugging` |
| 字面修补（错别字、日志补充、注释、依赖升级、不影响行为的重构） | 豁免 | — |

### 判断规则

修订前先问三个问题：
1. **契约（领域不变量 / 接口签名 / 状态机 / 字段语义）变了吗？** → 是 → 必须改 spec（新建或修订）
2. **现有 spec 已经覆盖这块吗？** → 是 → **修订**它，**不要**新建重复 spec
3. **完全没有相关 spec 吗？** → 是 → **新建** spec

### 禁止

- 未写 / 未更新 spec 就直接生成跨多文件实现
- spec §6 仍有未关闭的 `@PM确认` / `@架构确认` 时跑批量 tasks（详见 CLAUDE.md「Spec 确认 Gate」）
- 为同一领域新建第二份 spec（应修订原 spec）
- 在 spec 之外凭推断自行补默认值、扩展边界
- 用户正在改 spec 时按「旧 spec + 对话里的口头决策」先行编码——等 spec 落定再写；实现与新 spec 有出入要先指出，不要静默按自己的理解实现
- spec / 方案里出现没有来源（用户原话 / PRD / 原型）的界面元素（按钮、跳转、文案、通知）——没来源的单列「建议（待产品确认）」

完整流程见：[`docs/superpowers/development-workflow.md`](../../../docs/superpowers/development-workflow.md)

---

## 技术栈

| 类别 | 技术 | 版本 |
|---|---|---|
| JDK | OpenJDK | 17 (LTS) |
| 框架 | Spring Boot | 3.5.9 |
| 云原生 | Spring Cloud / Alibaba | 2025.0.0 |
| ORM | MyBatis-Plus | 3.5.12 |
| 认证 | Sa-Token | 1.44.0 |
| 授权 | kernel-authz-starter：`@RequiresCapability`（jCasbin 仅支撑已废弃的 `@RequiresPermission`） | 1.96.0 (jCasbin) |
| 对象转换 | MapStruct | 1.5.5.Final |
| 消息 | Spring Kafka | — |
| 缓存 | Spring Data Redis | — |
| 审计存储 | MongoDB | — |
| 数据库版本管理 | Flyway（flyway-core + flyway-mysql） | Spring Boot BOM |
| 流程编排 | LiteFlow | 2.12.4.1 |
| API 文档 | SpringDoc OpenAPI + Scalar | 2.8.15 |

---

## Platform Kernel Starters（核心工具库）

所有 starter：`com.lengfeng.platform:kernel-*-starter:0.1.0`

> 本节是**业务模块**使用 starter 的规范。修改 `platform-kernel` 下 starter 本身（如默认避开 Guava `@Beta` 等不稳定 API）见 `/platform-kernel` 的「修改 / 新增 starter 时的红线」。

### kernel-web-starter — 统一响应 & 异常

```java
// 统一响应包装（所有接口必须返回 R<T>）
R.ok(T data)  /  R.ok()  /  R.fail(String msg)  /  R.page(PageData<T> pageData)
PageData.of(List<T>, long total, int pageNum, int pageSize)

// 业务异常（GlobalExceptionHandler 自动映射为标准 R 响应）
BizException.of(String msg)
BizException.notFound(String resource, Object id)    // → code 40400
BizException.invalidStatus(String current, String target)  // → code 42201
BizException.idempotencyConflict(String key)         // → code 40900
```

配置：`lf.web.auth.enabled=true`，`lf.web.auth.exclude-paths`

> **【强制】禁止在业务模块中自定义 `GlobalExceptionHandler`。**  
> `kernel-web-starter` 通过 `WebAutoConfiguration` 自动注册了 `GlobalExceptionHandler`，覆盖范围：`BizException`、`NotLoginException`、`NotPermissionException`、`NotRoleException`、`MethodArgumentNotValidException`、`MissingServletRequestParameterException`、`MethodArgumentTypeMismatchException`、`IllegalArgumentException`、兜底 `Exception`。  
> 业务模块只需引入 `kernel-web-starter` 依赖即可，**不得在 `api/controller/` 或任何包下重新定义同名或功能重叠的异常处理器**，否则会导致两个 `@RestControllerAdvice` 并存，响应格式漂移。

### kernel-action-starter — 写操作执行器（幂等 + 审计）

```java
// 1. 实现 Action（application/action/ 目录）
@Component
public class CreateXxxAction implements TradeAction {
    @Override public String code() { return "资源.动作"; }   // 命名格式：资源.动作
    @Override public ActionResult execute(ActionContext ctx) {
        String val = (String) ctx.getParam("key");
        return ActionResult.ok(Map.of("entityId", id));     // 或 ActionResult.fail(code, msg)
    }
}

// 2. 在 AppService 中调用
ActionContext ctx = ActionContext.builder()
    .bizContext(bizCtx).idempotencyKey(cmd.getIdempotencyKey())
    .operator(cmd.getOperatorId()).param("key", value).build();
ActionResult result = actionExecutor.execute("资源.动作", ctx);
if (!result.isSuccess()) throw new IllegalStateException(result.getMessage());
```

### kernel-audit-starter — 操作审计

```java
// 加在 Controller 方法（记录 HTTP 上下文）和 AppService 写方法（记录业务参数），两层形成完整链路
@Audited(action = "资源.create", resource = "资源")              // 标准
@Audited(action = "user.login", resource = "user", logParams = false)   // 敏感接口不记参数
@Audited(action = "order.create", resource = "order", logParams = true) // 记录入参
```

配置：`lf.audit.enabled=true`，持久化到 MongoDB

> **`@Audited` 只审计、不鉴权**：只挂 `@Audited` 的接口对所有登录用户开放，鉴权必须另挂 `@RequiresCapability`（见下节）。

### kernel-outbox-starter — Outbox 模式 & 幂等守卫

```java
// 发布跨域事件（AppService 中）
@Autowired ObjectProvider<OutboxPublisher> publisherProvider;
OutboxPublisher pub = publisherProvider.getIfAvailable();
if (pub != null) pub.publish("aggregate", aggregateId, "eventType", jsonPayload);

// 业务方需在 infrastructure/outbox/ 实现两个接口：
// OutboxRepository → save/findPendingEvents/markSent/updateRetry/markDead
// OutboxEventSender → send(OutboxEvent event)（通常用 Kafka 实现）
```

配置：`lf.outbox.relay.enabled=true`，`batch-size=50`，`max-retries=5`

### kernel-authz-starter — 接口鉴权（@RequiresCapability）

> **纠正旧写法**：`@RequiresPermission(domain, object, action)` 已在 kernel 标 `@Deprecated`（2026-04-18），origin/dev 上只剩个别存量类；**新代码一律用 `@RequiresCapability`**，也不再往 `lf.authz.casbin.policies` 里加策略。完整说明见 platform-kernel `authz.md`。

```java
import com.lengfeng.platform.kernel.authz.RequiresCapability;

// 【强制】后台/员工接口鉴权统一用注解，严禁在方法内写 StpUtil.checkPermissionOr() / 手写拦截器
@RequiresCapability                                            // 推荐：无参，所需权限由「原子 → 接口」配置决定（fail-closed，未配置 = 403）
@RequiresCapability(Capability.Codes.COMMERCE_AFTERSALE_MANAGE) // 存量：能力码写死，配置对它不生效
@RequiresCapability(securityLevel = SecurityLevel.HIGH)        // 资金/权限变更：额外校验 Token 存活

// C 端（commerce-core）：组合注解，= 登录校验 + consumer 身份校验 + 可选审计；不做 RBAC
@ConsumerApi(action = "order.create", resource = "order", audit = true)  // 资金/权益/认证/不可逆操作必须 audit = true（默认 false）
// C 端数据隔离靠 service 层强制 WHERE user_id = AuthContext.getLoginId()

// 【强制】登录校验：由 Sa-Token 拦截器统一处理，严禁在方法内写 StpUtil.checkLogin()
// 【强制】获取当前登录用户：严禁直接调用 StpUtil.getLoginId() 等原生方法，统一使用 AuthContext
LoginUserInfo userInfo = AuthContext.getLoginUser();      // 未登录抛 NotLoginException
String loginId         = AuthContext.getLoginId();        // 未登录抛 NotLoginException
String loginId         = AuthContext.getLoginIdOrNull();  // 未登录返回 null，不抛异常
boolean isLogin        = AuthContext.isLogin();
// 已知 userId 的跨请求场景（如异步任务）
LoginUserInfo userInfo = AuthContext.getLoginUserById(userId);
```

- 没有任何鉴权注解 = 公开接口；确需公开的登记到 `scripts/endpoint-capability-exemptions.txt`。
- 无参接口上线前要配好原子 → 接口映射（`/authz-map`），并用**非超管**测试账号走一遍——超管在切面直接放行，自测发现不了漏配。
- 新增能力（`Capability` 枚举）要过架构评审，能并入既有能力的不新增。

### kernel-dict-starter — 字典翻译

```java
// 编程式
String label = dictTranslator.label("order_status", "PENDING");

// DTO 字段注解（自动生成 statusLabel 字段——序列化期追加，DTO 无需显式声明 label 字段）
@DictLabel("order_status")
private String status;
```

> **【强制】`@DictLabel` 字段的 `@Schema(description)` 必须显式写字面量 dictKey**（2026-07-27 起，存量豁免：某域下次改动时补齐当前文件）。
>
> dictKey 只活在 `@DictLabel("xxx")` 注解里，SpringDoc **不反射读注解参数**——不写进 `@Schema`，前端在 Swagger/Apifox 看到的只是裸 code（`status: "PENDING"`），不知道去查哪个字典，下拉/筛选做不出来（真实痛点：前端反馈"字段缺字典 key"）。这是 §21「@Schema 唯一权威」在字典场景的具体化。详见 [CONV-011](../../../docs/knowledge/conventions/CONV-011-dictlabel-schema-dictkey.md)。
>
> 三条硬约束：
> 1. 字段标 `@DictLabel("<dictKey>")`——序列化期自动产出 `<field>Label` 中文兄弟字段；
> 2. **`@Schema(description)` 必须出现字面量 dictKey**，统一格式 `「...；字典 <dictKey>」`（或括注 `（字典 <dictKey>）`）；
> 3. dictKey 即使用常量引用（如 `CommerceDictKeys.COUPON_TYPE`），`@Schema` 里仍必须写字面量值（`coupon_type`）——前端只看文档、不读源码常量。
>
> **前端对接契约**（写进 description 让前端照做）：展示中文读 `<field>Label`（自动产出）；拉可选值（下拉/筛选）从 `@Schema` 取 dictKey 调 `GET /system-core/v1/dict/by-key?dictKey=<key>`。**状态码 → 中文不要让前端硬编码 map**，一律走 `@DictLabel`。
>
> **字典数据放哪**：`code` = 后端枚举名、`label` = 中文，灌在 `system-core/src/main/resources/db/seed/common/R__dict_*.sql`（主键用秒级时间戳、upsert 按业务键门控，见 `/dict-creator`）；commerce 域 dict_key 常量登记在 `CommerceDictKeys.java`。

正反例：

```java
// ✓ @Schema 显式写字面量 dictKey
@Schema(description = "门店状态：NORMAL/FROZEN/CANCELLED；字典 store_status")
@DictLabel("store_status")
private String status;

// ❌ @Schema 没写 dictKey，前端不知道查哪个字典
@Schema(description = "门店状态：NORMAL/FROZEN/CANCELLED")
@DictLabel("store_status")
private String status;
```

### kernel-routing-starter — 渠道路由

```java
BizContext bizCtx = new BizContext();
bizCtx.setBizDocId(cmd.getOrderNo());
// SalesChannel: LIVE_ROOM / OFFLINE_STORE / TOC_MALL / AGENCY
// PlatformCode: WECHAT_LIVE / DOUYIN_LIVE / SELF_MALL / POS / ERP_IMPORT
```

### kernel-feign-starter & kernel-grpc-starter — 服务间调用

> 详细使用指南（含完整代码骨架、配置、调用链路、常见问题）见 **[rpc-guide.md](references/rpc-guide.md)**。

```java
// ① OpenFeign：跨服务低频查询 / BFF 聚合，Token 自动透传
@FeignClient(name = "system-core", url = "${services.system-core.url}")
public interface SystemCoreFeignClient {
    @GetMapping("/system-core/users/{id}")
    R<UserInfoDTO> getUserById(@PathVariable("id") Long id);
}

// ② gRPC 客户端：高频内部调用，强类型约束
@GrpcClient("system-core")   // 对应 grpc.client.system-core 配置
private UserServiceGrpc.UserServiceBlockingStub userServiceStub;

// ③ gRPC 服务端：@GrpcService 自动注册，异常统一走 GrpcExceptionTranslator
@GrpcService
public class UserGrpcService extends UserServiceGrpc.UserServiceImplBase {
    @Override
    public void getUser(GetUserRequest req, StreamObserver<UserResponse> obs) {
        try { /* 业务逻辑 */ obs.onNext(resp); obs.onCompleted(); }
        catch (Exception e) { obs.onError(GrpcExceptionTranslator.translate(e)); }
    }
}
```

| 选型 | 使用场景 |
|---|---|
| Feign（HTTP/REST） | 跨域低频查询、BFF 聚合、接口调试 |
| gRPC（HTTP/2） | 高频内部调用、强类型约束、低延迟 |
| Outbox + Kafka | 跨域写操作、最终一致性 |

### kernel-infra-starter — 基础设施

```java
public class XxxPO extends BasePO { }           // MyBatis-Plus，自动填充 createdAt/updatedAt
public class XxxDocument extends BaseDocument { } // MongoDB 文档
// Kafka 幂等消费：继承 IdempotentMessageHandler<T>，实现 handleMessage(T event, String messageId)
```

### kernel-id-starter — 分布式 ID & 业务编号生成

> 完整 API / 选型决策 / 配置见 platform-kernel skill 的 **[id.md](../platform-kernel/id.md)**。

```java
@RequiredArgsConstructor
class Foo {
    private final SnowflakeIdGenerator idGenerator;   // 构造器注入
    void demo() {
        long id        = idGenerator.nextId();                                  // 主键
        String spuCode = BizNoFormatter.build("SPU-", idGenerator.nextId(), false);   // 业务编号（格式：前缀+雪花）
        String outNo   = BizNoFormatter.buildWithDate("OUT", idGenerator.nextId(), false); // 前缀+日期+雪花
    }
}
@TableId(type = IdType.ASSIGN_ID) private Long id;   // 主键雪花 ID 自动赋值（MP 适配器）
```

**编码生成选型**：默认 `BizNoFormatter` + `SnowflakeIdGenerator`（强唯一、可读前缀）；要短码且不依赖 Redis 用 `RandomCodeGenerator`（近唯一+唯一约束+重试）；要连续序号用 `SequenceGenerator`（Redis，按 key 隔离、可日/月重置）。

**【强制·编码红线】**
- 业务编号 / 主键**禁止**用 MyBatis-Plus 的 `IdWorker.getId()/getIdStr()`：它按网卡推导 workerId，**多 Pod 有重复 ID 风险**；一律改注入 kernel `SnowflakeIdGenerator`。
- **禁止** `ThreadLocalRandom` / `System.currentTimeMillis()` 拼业务编号（并发碰撞，见 `bug-patterns/BP-006`）。
- 迁移既有 `"前缀" + IdWorker.getIdStr()` 用 `BizNoFormatter.build("前缀", idGenerator.nextId(), false)`——**输出格式不变**，仅换底层生成器。

---

## 数据库版本管理（Flyway）— 必须遵循的规则

本架构已集成 Flyway，**每个微服务独立管理自己的数据库变更**，脚本在服务启动时自动执行。

> **⚠️ 先分流（2026-07-06 起强制）**：配置类种子数据（字典/菜单/sys_role_menu/Casbin 策略等）不进 `db/migration`，一律放 `db/seed/common/R__{功能域}.sql`（声明式终态 + ON DUPLICATE KEY UPDATE + 固定 ID）。分流标准、组合变更放置规则与红线见 `/flyway-migration` skill 与 `docs/superpowers/specs/2026-07-06-flyway-schema-seed-separation-design.md`。CI 硬检查：`scripts/check-migration-seed-separation.sh`（版本号 ≥ 20260706000000 的 V 脚本 INSERT `sys_dict_type|sys_dict|sys_menu|sys_role_menu|casbin_rule` 直接失败）。
>
> **种子三条红线**（详见 `/flyway-migration`）：① R__ 内容一变就整文件重跑，必须可重复执行；② `ON DUPLICATE KEY UPDATE` 按业务键门控赋值，禁止裸 `label = new_row.label`（主键撞到别域行会盖写；用 `AS new_row` 后现有行列必须带表名前缀，否则 Error 1052 服务起不来）；③ 主键不手挑小号——字典用秒级时间戳，权限类顺序号要对 dev 和所有活跃 release 分支取全局最大。种子/迁移改完必须在真 MySQL 上实跑，编译通过 ≠ SQL 能跑。
>
> **写库 SQL 不自己执行**：数据回填/订正的 INSERT/UPDATE/DELETE/DDL 只交付给用户，只读 SELECT / dry-run 可以跑。

### 脚本位置与命名

| 约定 | 说明 |
|------|------|
| 目录 | `src/main/resources/db/migration/` |
| 命名格式 | `V{版本号}__{描述}.sql`（双下划线分隔） |
| 历史/小版本号 | 如 `V1__init.sql`、`V77__create_xxx.sql`（早期脚本可保留） |
| **【本项目·多人协作】版本号** | 新建迁移用 **`V{yyyyMMddHHmmss}__{英文描述}.sql`**，例如 `V20260401143929__repair_sys_region_missing_columns.sql` |
| **目的** | **降低多人并行加脚本时版本号撞车**（不依赖口头约定「下一个 V 几」）；精确到秒一般足够，同一秒内两人各建一个时再改一秒或加后缀 |
| **生成方式（强制）** | **必须**通过 Bash 调用本 skill 自带脚本获取真实当前时间，禁止 AI 自行编造时间戳：<br>`bash .claude/skills/springboot3-backend/scripts/new-migration-version.sh {英文描述}`<br>脚本会输出完整文件名 `V{yyyyMMddHHmmss}__{描述}.sql`（例如 `V20260407135822__repair_sys_region.sql`）。不带参数调用则只返回 14 位时间戳。底层等价于 `date +%Y%m%d%H%M%S`。 |
| **避免** | 不要为「排在某条脚本后面」**手编** `40001`、`133000` 等假时间式序号；版本号应来自**真实生成时刻**（或团队统一约定的等价高熵规则） |

> Flyway 仍按**版本号整体**排序执行；时间戳越大通常越晚执行。`system-core` 等模块若开启 `flyway.out-of-order: true`，可缓解分支合并后版本号交错，但**不能替代**唯一、递增的版本号设计。

### 强制规则

1. **【强制】禁止修改已执行过的脚本**  
   Flyway 通过 `flyway_schema_history` 表记录校验和，修改已执行脚本会导致校验失败、启动报错。所有后续变更必须通过**新增**迁移文件（如 `V2__xxx.sql`）完成。

2. **【强制】迁移脚本中禁止出现 `CREATE DATABASE`、`USE database_name`**  
   Flyway 使用应用配置的 `spring.datasource.url` 连接**已存在的库**执行脚本，建库/切库由运维或 CI 在应用启动前完成。

3. **【强制】单脚本内 SQL 需可重复执行或幂等**  
   建议：表用 `CREATE TABLE IF NOT EXISTS` 或只写 `CREATE TABLE`（由 Flyway 保证只执行一次）；数据用 `INSERT IGNORE` 或先 `SELECT` 再决定是否插入，避免重复执行报错。

4. **【强制】版本号全局唯一且面向环境单调递增**  
   禁止在已存在更高版本的环境上再提交**更小**的版本号（易与 `flyway_schema_history` 冲突）。历史模块若使用 `V1`/`V77` 等与时间戳混排，以 Flyway 实际排序为准；**新建脚本优先用本节「yyyyMMddHHmmss」**，减少合并冲突。部分服务配置了 `flyway.out-of-order: true` 时仅缓解交错执行顺序，**不放宽**「禁止改已执行脚本」与「版本号不得故意倒退」。

5. **【推荐】描述使用英文+下划线**  
   `V2__add_email_column.sql`，便于跨环境一致性和日志检索。

6. **【强制】建表 SQL 禁止使用外键（FOREIGN KEY）**  
   所有表之间的关联关系**只在应用层维护**，数据库不得定义 `FOREIGN KEY` 约束。外键会在分库分表、异步写入（Outbox）、数据迁移时造成死锁或约束冲突，且无法在微服务跨库边界使用。跨聚合/跨库的数据一致性统一由 Outbox + 幂等写入保障。

### 启用与关闭

| 场景 | 配置 |
|------|------|
| 使用 InMemory 仓储、无真实 MySQL | 保持默认：`FLYWAY_ENABLED=false`（或省略），且保留 `hikari.initialization-fail-timeout: -1` |
| 使用 MyBatis + 真实 MySQL | 在 `.env` 中设置 `FLYWAY_ENABLED=true`，并删除 `application.yml` 中的 `initialization-fail-timeout: -1` |

新增表或字段时：在对应模块的 `db/migration/` 下新增 `V{n}__描述.sql`，重新部署/启动后自动执行。

---

## 强制规则（阿里巴巴规范 + 平台约束）

### 命名规范

| 对象 | 规则 | 示例 |
|---|---|---|
| 包名 | 全小写 | `api.controller` |
| 类名 | UpperCamelCase | `OrderAppService` |
| 方法/变量 | lowerCamelCase | `createOrder` |
| 常量 | 全大写下划线 | `MAX_RETRY_COUNT` |
| 布尔变量 | 不加 `is` 前缀 | `deleted`（非 `isDeleted`）|
| 异常类 | `Exception` 结尾 | `BizException` |
| 枚举 | 类名大驼峰，成员全大写 | `OrderStatus.PENDING` |

### 分层模型命名（DDD 版）

| 层 | 后缀 | 用途 |
|---|---|---|
| PO | `xxxPO` | MyBatis-Plus 持久化对象 |
| DTO | `xxxDTO` | 请求 DTO（入参） |
| ResponseDTO | `xxxResponseDTO` | 响应 DTO（出参，含 @DictLabel） |
| Command | `xxxCommand` | 应用层命令（含 idempotencyKey） |
| Assembler | `xxxAssembler` | MapStruct DTO→Command 转换 |

### 代码约束

1. **【强制】不允许魔法值**，必须定义常量
2. **【强制】整型包装类比较用 `equals()`**，不用 `==`
3. **【强制】`@Transactional` 必须指定 `rollbackFor = Exception.class`**
4. **【强制】Controller 不写业务逻辑**，只做参数校验 + 权限校验 + 调用 AppService
5. **【强制】所有写操作通过 `ActionExecutor` 执行**，自动获得幂等 + 审计
6. **【强制】跨域事件走 `OutboxPublisher`**，禁止直接调用 Kafka Producer
7. **【强制】状态/字典禁止硬编码中文**（后端和前端都不硬编码），枚举 `.code()` + `@DictLabel` 注入 `xxxLabel`（见 kernel-dict-starter 节）
8. **【强制】`BizException` 替代直接抛 `RuntimeException`**（自动映射标准响应）。**文案要让看到的人知道怎么办**：讲清什么问题（带对象/金额）、这一次的具体原因（业务语言）、影响、系统已做了什么、该谁处理、怎么处理（入口 + 步骤）、处理后会怎样；系统 bug 要明说「系统问题，研发处理后自动恢复」。禁止只写「打款失败」或透传技术原文（异常栈、第三方错误码）。文案里的入口/按钮/时效/「系统会自动 xx」必须查前端路由和代码确认，查不到标【待确认】。同样适用于通知模板和异常原因字段
9. **【强制】禁止在业务模块自定义 `GlobalExceptionHandler`**，`kernel-web-starter` 已自动装配，重复定义会造成响应格式漂移
10. **【强制】Command 必含 `idempotencyKey` 和 `operatorId`**
11. **【推荐】用 `@RequiredArgsConstructor` 代替 `@Autowired` 注入**
12. **【强制】HTTP 方法只允许 GET 和 POST**，禁止使用 `PUT`、`DELETE`、`PATCH`
13. **【强制】禁止在接口路径中使用 `@PathVariable`**，GET 参数用 `@RequestParam`，POST 参数用 `@RequestBody`
14. **【强制】接口路径遵循动词约定**：`/list`（分页）、`/all`（全量）、`/detail`（详情）、`/{scene}/list`（个性化列表）、`/create`、`/update`、`/delete`
15. **【强制】领域层 Repository 接口禁止引用 `api.dto` 包下的 DTO**。查询参数超过 2 个时，必须在领域层定义专用查询对象（如 `XxxQuery`，位于 `domain/model/query/`），接口签名只允许使用基础类型或领域内部类型；反向依赖（domain → api）破坏分层隔离，导致领域层无法独立演进
16. **【强制】应用层（AppService / Action）禁止直接注入 MyBatis Mapper 或操作 PO 对象**。所有持久化读写必须通过领域 Repository 接口完成；Mapper 和 PO 只能在 `infrastructure/persistence/repository/` 的实现类中出现
17. **【强制】Controller 禁止注入任何 Mapper、Repository 或 PO**，也禁止编写 `LambdaQueryWrapper`、`deleted = 0` 过滤、PO→DTO 转换等持久化逻辑。Controller 只做：参数校验 + 权限声明 + 调用 AppService，违反者视为三层短路
18. **【强制】数据库操作规范（MyBatis-Plus）**——约束新增代码，老代码不强制改：
    - **单表一律用 MyBatis-Plus**：`selectById` / `selectOne` / `selectList` / `selectCount` / `selectPage(new Page<>(..), wrapper)` / `insert` / `updateById` / `update` 等，配合 `LambdaQueryWrapper` / `LambdaUpdateWrapper`；**单表不写 `@Select`，也不为单表另写 XML**
    - **多表（JOIN、子查询、复杂聚合）必须写 Mapper XML**（`src/main/resources/mapper/XxxMapper.xml`）；**禁止 `@Select` 注解版 SQL**，即使用 `<script>` 包也不行（难读、难审、不能复用 resultMap）。多表分页在 XML 里写查询、由分页插件接管 COUNT + LIMIT，XML 中禁止手写 `LIMIT/OFFSET`
    - **禁止用 `Map<String, Object>` 接 mapper 返回**：定义具体 PO/VO（可作为 mapper 接口的 `public static` 内部类），字段有类型、可被编译期检查
    - **必须使用 lambda 方法引用**（如 `UserPO::getStatus`、`UserPO::getDeleted`），**禁止将字段名硬编码为字符串**（如 `"status"`、`"deleted"`），防止字段重命名后编译期检测不到错误
    - 持久化逻辑只能出现在 `infrastructure/persistence/repository/` 实现类中（受规则 16、17 约束）

```java
// ❌ BAD — 字段名硬编码为字符串，重命名时编译器无法检测
QueryWrapper<UserPO> wrapper = new QueryWrapper<>();
wrapper.eq("status", "ACTIVE").eq("deleted", 0);
List<UserPO> list = userMapper.selectList(wrapper);

// ❌ BAD — 单表简单查询却另写 XML，无谓增加维护成本
// <select id="findActiveById" resultType="UserPO">
//   SELECT * FROM sys_user WHERE id = #{id} AND status = 'ACTIVE' AND deleted = 0
// </select>

// ✅ GOOD — lambda 方法引用，编译期校验字段名
LambdaQueryWrapper<UserPO> wrapper = Wrappers.<UserPO>lambdaQuery()
    .eq(UserPO::getStatus, "ACTIVE")
    .eq(UserPO::getDeleted, 0);
List<UserPO> list = userMapper.selectList(wrapper);

// ✅ GOOD — 单记录直接走内置方法
UserPO po = userMapper.selectById(id);

// ✅ GOOD — 单表分页直接 selectPage + LambdaQueryWrapper
IPage<UserPO> page = userMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);

// ✅ GOOD — 多表分页走 Mapper XML（分页插件接管 COUNT + LIMIT），返回具体 VO
IPage<UserWithOrgVO> page = userMapper.selectPageWithOrg(new Page<>(pageNum, pageSize), query);

// ❌ BAD — 注解版多表 SQL / Map 接返回值
// @Select("<script>SELECT u.*, o.name FROM sys_user u JOIN ... </script>")
// List<Map<String, Object>> listWithOrg(...);
```

19. **【强制】Mapper XML 中含动态条件的 SELECT 必须用 `<where>` 标签包裹所有过滤条件**，禁止裸写 `WHERE xxx = 0` 后跟 `AND <if>`。`deleted = 0` 等固定条件也放入 `<where>` 内，`<if>` 块前统一加 `AND`，由 MyBatis 自动处理首个 `AND` 的剥离。错误示例：`WHERE deleted = 0 <if ...> AND ... </if>`；正确示例：`<where> deleted = 0 <if ...> AND ... </if> </where>`。

20. **【强制】响应 DTO 中所有 `Long` 类型的 id 字段（包括 `id`、`parentId`、`xxxId` 等）必须加 `@JsonSerialize(using = ToStringSerializer.class)`**，将其序列化为 JSON 字符串。JavaScript `Number` 最大安全整数为 2^53-1，雪花算法生成的 Long ID（约 19 位）超出此范围后前端会发生精度丢失导致 ID 错误。前端收到的 id 字段为字符串类型，比较时用 `===` 字符串比较。

```java
// ❌ BAD — 前端 JS 精度丢失
private Long id;
private Long parentId;

// ✅ GOOD — 序列化为字符串，前端安全使用
@JsonSerialize(using = ToStringSerializer.class)
private Long id;

@JsonSerialize(using = ToStringSerializer.class)
private Long parentId;
```

21. **【强制】接口文档字段说明只认 `@Schema(description)`，不认 Javadoc**。SpringDoc **不读 Javadoc**，Scalar 页面只渲染 `@Schema`——没有 `@Schema` 的字段一律显示裸类型（`string`/`integer`），前端对不上口径。本项目 pom **未接入** `therapi-runtime-javadoc`，Javadoc 对 OpenAPI 完全不可见（真实事故：`OrderListQuery` 21 个 query 参数注释全写在 Javadoc，文档页面一个字都没出）。因此对外 DTO/VO/Query 的**每个字段**必须：
    - 写 `@Schema(description=...)`——写在 Javadoc 里不算数，Javadoc 可保留但不能替代 `@Schema`；
    - 枚举字段补 `@Schema(allowableValues=..., description=...)`，取值与中文来自**枚举类的 `code()+desc()`**（Scalar 直接出下拉），禁止照字段名手编；
    - 分页/带默认值字段补 `defaultValue`；请求必填字段补 `requiredMode = Schema.RequiredMode.REQUIRED`；
    - 用 `String` 或 `ToStringSerializer` 传的金额/ID 字段，`description` 里注明「字符串传递防精度丢失」；
    - `normalize()` 等内部拆解、不对外暴露的字段标 `@Schema(hidden = true)`，避免污染前端 query 参数列表。
    - **字典 code 字段**：`@Schema(description)` 必须显式写字面量 dictKey（格式「...；字典 <dictKey>」），前端据此调 `GET /system-core/v1/dict/by-key`——详见 `kernel-dict-starter` 章节 / CONV-011；

    > 想让 Javadoc 自动进 OpenAPI，唯一正解是全局接入 `therapi-runtime-javadoc`（编译期注解处理器 + `SpringDocProvider`）；在未接入前，「@Schema 唯一权威」是硬约束。

22. **【强制】`LocalDateTime` 时间格式必须全局统一**。`spring.jackson.date-format` 只作用于 `java.util.Date`，对 JSR-310 的 `LocalDateTime` **无效**（由 `JavaTimeModule` 接管）。不统一时同一响应里会两种格式并存——带 `@JsonFormat` 的输出 `2026-07-24 09:10:59`、不带的输出 ISO-8601 `2026-07-24T09:10:59.708`，前端要对同一响应的不同时间字段分别处理，极易踩坑。二选一并保持全项目一致：
    - **全局**注册 `LocalDateTimeSerializer(ofPattern("yyyy-MM-dd HH:mm:ss"))`（一次性，影响全部接口，需前端同步确认）；或
    - **逐字段**加 `@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")`。

    改动会变更响应 JSON，属行为变更——如需在纯文档 PR 里先如实标注格式差异、后续单独统一，须与前端确认后再动。

23. **【强制】现有接口向后兼容**：已上线接口只**追加可选字段 / 追加枚举值**，不换路径、不删字段、不改语义，也不在方案里"规划删除"；已有状态值（如 `BLOCKED`）保留，新状态追加。新行为优先装在现有接口背后；只有现网确实没有的动作才新增接口，并挂在现有 Controller 前缀下。新建分类/模型先对齐现有枚举，别自造一套。为什么：前端、运维脚本和其他服务依赖现有接口与状态值，一换就静默断（2026-10-21 方案里"换接口 / 去掉 BLOCKED"被纠正）。

---

## 包结构（DDD 分层）

```
cn.org.lengfenghl.laowang.{domain}.core.
├── api/controller/          # REST 端点（@RequiresCapability 鉴权 + @Audited 审计；C 端 @ConsumerApi）
├── api/dto/                 # 请求/响应 DTO（@DictLabel 翻译状态）
├── application/
│   ├── assembler/           # MapStruct：DTO → Command（@Mapper）
│   ├── command/             # 命令对象（含 idempotencyKey、operatorId）
│   ├── service/             # 应用服务：编排层，写操作走 ActionExecutor
│   └── action/              # TradeAction 实现（code = "资源.动作"）
├── domain/
│   ├── model/               # 聚合根（含 create() / restore() 工厂方法）
│   ├── model/query/         # 领域查询参数对象（XxxQuery），只用基础类型，禁止引用 api.dto
│   └── repository/          # 仓储接口（参数只允许基础类型或 domain.model.query.*）
├── infrastructure/
│   ├── persistence/mapper/  # MyBatis-Plus BaseMapper
│   ├── persistence/po/      # 继承 BasePO
│   ├── persistence/repository/  # InMemory（默认）+ MyBatisImpl
│   └── outbox/              # OutboxRepository + KafkaOutboxEventSender 实现
└── health/                  # HealthController（GET /{module}/health）
```

---

## 接口设计规范（HTTP 方法 & URL 约定）

### 【强制】HTTP 方法只允许 GET 和 POST

禁止使用 `PUT`、`DELETE`、`PATCH` 等 RESTful 语义方法。所有写操作（修改、删除）统一通过 `POST` 实现。

```java
// ❌ BAD
@PutMapping("/{id}")
@DeleteMapping("/{id}")
@PatchMapping("/{id}")

// ✅ GOOD
@PostMapping("/update")
@PostMapping("/delete")
```

### URL 命名约定

所有接口路径使用动词明确表达操作语义，禁止直接在路径中嵌入 HTTP 方法语义（REST 风格）。

| 场景 | 方法 | 路径格式 | 示例 |
|---|---|---|---|
| 分页列表 | GET | `/{resource}/list` | `GET /menu/list` |
| 全量列表 | GET | `/{resource}/all` | `GET /menu/all` |
| 详情 | GET | `/{resource}/detail` | `GET /menu/detail?id=xxx` |
| 个性化列表 | GET | `/{resource}/{scene}/list` | `GET /menu/tree/list` |
| 新增 | POST | `/{resource}/create` | `POST /menu/create` |
| 修改 | POST | `/{resource}/update` | `POST /menu/update` |
| 删除 | POST | `/{resource}/delete` | `POST /menu/delete` |
| 其他写操作 | POST | `/{resource}/{action}` | `POST /menu/enable` |

### 【强制】标注调用端（PC / APP / H5）

同一业务在 PC 管理后台、BD App、店长 H5 往往是三个不同入口，不标调用端排查时极易走错链路。

- Controller 方法 `@Operation(summary = "[APP] BD 发起门店注册")` 以 `[PC]` / `[APP]` / `[H5]` 开头；多端共用写 `[PC + APP]`，并在 `description` 或 Javadoc 说明各端差异；类级 `@Tag` 能区分端的也写上。
- 技术方案 / spec 的接口契约表必须有「调用端」列。
- 新接口路径建议体现端：`/v1/app/...`、`/v1/pc/...`、`/h5/...`（存量路径不为此改名，见规则 23 向后兼容）。

### 参数传递规则

- **GET 请求**：参数通过 `@RequestParam` 或 `PageRequest`（分页对象）传递，**禁止使用 `@PathVariable`**
- **POST 请求**：参数通过 `@RequestBody` 传递，`id` 字段包含在请求体 DTO 中，**禁止使用 `@PathVariable`**

```java
// ❌ BAD - 使用路径变量
@GetMapping("/{id}")
public R<XxxResponseDTO> detail(@PathVariable String id) { ... }

@PostMapping("/{id}/cancel")
public R<Void> cancel(@PathVariable String id) { ... }

// ✅ GOOD - 参数通过请求参数或请求体传递
@GetMapping("/detail")
public R<XxxResponseDTO> detail(@RequestParam String id) { ... }

@PostMapping("/delete")
public R<Void> delete(@RequestBody @Valid DeleteXxxDTO dto) { ... }
```

### 完整 Controller 路径示例

```
GET  /{module}/{resource}/list        # 分页查询（带 pageNum/pageSize 等查询参数）
GET  /{module}/{resource}/all         # 全量查询（返回所有，不分页）
GET  /{module}/{resource}/detail      # 详情（?id=xxx）
GET  /{module}/{resource}/{scene}/list # 个性化列表（如 /menu/tree/list）
POST /{module}/{resource}/create      # 新增
POST /{module}/{resource}/update      # 修改（body 中含 id）
POST /{module}/{resource}/delete      # 删除（body 中含 id）
```

---

## 端口约定

| 模块 | 端口 |
|---|---|
| gateway-bff | 18080 |
| commerce-core | 18081 |
| fulfillment-core | 18082 |
| settlement-core | 18083 |
| system-core | 18084 |

---

## 新增模块检查清单

- [ ] Controller `@RequestMapping` 前缀 = `/{module-name}/`
- [ ] **HTTP 方法只用 GET / POST**，无 `@PutMapping` / `@DeleteMapping` / `@PatchMapping`
- [ ] **路径遵循动词约定**：`/list`、`/all`、`/detail`、`/create`、`/update`、`/delete`（个性化用 `/{scene}/list`）
- [ ] **无 `@PathVariable`**：GET 参数走 `@RequestParam`，POST 参数走 `@RequestBody`（id 含在 DTO 中）
- [ ] **领域 Repository 接口无 `api.dto` 包 import**：查询参数超 2 个时改用 `domain/model/query/XxxQuery`
- [ ] **AppService / Action 中无 Mapper 注入**：所有持久化通过 Repository 接口，PO 只在 `infrastructure/persistence/repository/` 内出现
- [ ] **查询写法**：单表（含单表分页 `selectPage`）走 MyBatis-Plus 内置方法 + `LambdaQueryWrapper`（lambda 方法引用，禁止字符串字段名），不写 `@Select`；多表 / JOIN 走 `XxxMapper.xml`（无 `@Select` 注解版，XML 中禁止手写 `LIMIT/OFFSET`）；mapper 返回不用 `Map<String, Object>`
- [ ] **Controller 中无 Mapper / Repository / Wrapper**：只注入 AppService 和 Assembler
- [ ] 写操作通过 `ActionExecutor`，Action code = `资源.动作`
- [ ] 需鉴权的接口挂 `@RequiresCapability`（C 端用 `@ConsumerApi`）；`@Audited` 只审计不鉴权，不能代替鉴权注解
- [ ] Controller 和 AppService 写方法均加 `@Audited`（两层审计链路）
- [ ] `@Operation(summary)` 以 `[PC]` / `[APP]` / `[H5]` 标注调用端
- [ ] 改的是存量接口：只追加可选字段 / 枚举值，未换路径、未删字段、未删状态值
- [ ] 跨域事件走 `OutboxPublisher`，不直接调用 Kafka
- [ ] 响应 DTO 状态字段用 `.code()` + `@DictLabel` 翻译
- [ ] Command 必含 `idempotencyKey` 和 `operatorId`
- [ ] 默认 `InMemoryXxxRepository`；切换 MyBatis 时删除 `initialization-fail-timeout: -1` 并设置 `FLYWAY_ENABLED=true`
- [ ] **数据库变更**：仅通过 `db/migration/` 下新增迁移；**新建文件用 `V{yyyyMMddHHmmss}__描述.sql`**，版本号必须通过 `bash .claude/skills/springboot3-backend/scripts/new-migration-version.sh {desc}` 生成，禁止手编，禁止修改已执行过的脚本
- [ ] **建表 SQL 禁止定义 `FOREIGN KEY`**，关联关系由应用层维护，跨域一致性走 Outbox
- [ ] 无参 `@RequiresCapability` 接口已配原子 → 接口映射（`/authz-map`），非超管账号验证无 403；不再往 `lf.authz.casbin.policies` 加策略
- [ ] 新增环境变量 / `secretKeyRef`：改 **octopus-deploy** 仓库 `charts/<服务>/values.yaml`（三环境基线）或 `values-dev/uat/prod.yaml`，从 `origin/main` 拉分支、PR base=main；octopus-cloud 里的 `deploy/charts/` 是拆仓前遗留，改了不生效。新密钥建议 `optional: true`，防 Secret 未写入时 Pod 起不来
- [ ] 新模块加入根 `pom.xml` 的 `<modules>` 列表；ArgoCD Application 在 `octopus-infra` 仓库 `argocd/applications/<env>/octopus-cloud/` 新建并手动 `kubectl apply`（本仓库不再存放 Application 定义）

### 提 PR 前本地跑 CI 门禁（octopus-cloud）

与 `.drone.yml` 一致，逐个跑、看退出码（**不要接 `| tail`**，会吞掉非零退出码）：

```bash
sh scripts/check-migration-seed-separation.sh   # V 脚本不得 INSERT 配置表，种子走 R__
sh scripts/ci/check-fast-test-excludes.sh       # 容器测试登记
sh scripts/check-migration-expand-only.sh       # 迁移禁止破坏性 DDL
sh scripts/check-no-test-skip.sh                # 不得跳过测试
sh scripts/check-knowledge-index.sh             # 知识库索引一致
```

- 新增 `import org.testcontainers` 的 `*Test` 必须按字母序登记到 `scripts/ci/surefire-fast-excludes.txt`，否则快速测试阶段会因无容器环境失败。
- 部署失败修好后，把对应服务 `CITestController` 返回的 `success-vN` 版本号 +1，以触发该服务重新部署。

### DTO / VO 字段完整性自检（【强制】提交前逐项核对）

**QueryDTO / 请求 DTO（对照代码约束 §21，逐字段核对——331 个字段整包漏掉就是靠肉眼核对失守的，别只抽查）**
- [ ] **每个字段**都有 `@Schema(description)`——漏一个 Scalar 上就是裸类型；写在 Javadoc 里不算数
- [ ] description 里的匹配方式（精准 `=` / 模糊 `LIKE` / 区间 `BETWEEN`）**逐字段对照 Mapper XML 的 where 子句核对**，不照字段名编
- [ ] 每个 query 字段在对应 Mapper XML 里**真的被消费**（`grep -c '字段名' XxxMapper.xml` 结果 > 0）；查询侧从未使用的「死参数」要么补实现、要么 `@Schema` 标注「当前未生效，传入会被忽略」（真实事故：`AfterSaleListQuery.approverName` 文档写了按姓名筛选、XML 从没消费、前端传了被静默忽略）
- [ ] 枚举字段有 `allowableValues` + 中文，取值来自枚举类 `code()+desc()`
- [ ] 分页/默认值字段有 `defaultValue`；必填字段有 `requiredMode = REQUIRED`
- [ ] 内部拆解、不对外的字段标 `@Schema(hidden = true)`
- [ ] **提交前跑机械扫描**（人工 checklist 不可扩展）：`bash .claude/skills/springboot3-backend/scripts/check-schema-coverage.sh <包路径>`，缺失数必须为 0

**CreateCmd**
- [ ] PRD「新增时填写」的字段全部存在
- [ ] 包含幂等键 `idempotencyKey`

**UpdateCmd**
- [ ] 包含 `id`
- [ ] **不含**任何 PRD 标注为「创建后不可修改」的字段
- [ ] 包含所有 PRD 标注为「可编辑」的字段
- [ ] AppService.update() 中只对 UpdateCmd 有的字段调用 `po.setXxx()`，不可编辑字段不赋值

**响应 VO**
- [ ] 含 `id`
- [ ] **所有 `Long` 类型的 id 字段（`id`、`parentId`、`xxxId`）均加 `@JsonSerialize(using = ToStringSerializer.class)`**（防止 JS 精度丢失）
- [ ] 含所有业务主字段（对照 PRD「列表展示字段」）
- [ ] 含所有 enriched JOIN 字段（xxxName、xxxCode 来自关联表），Mapper XML SELECT 子句包含对应列
- [ ] 含审计字段：`updatedAt`、`updatedBy`
- [ ] 不可编辑字段仍在 VO 中（前端回显用）
- [ ] **每个 `@DictLabel` 字段的 `@Schema(description)` 都写了字面量 dictKey**（格式「...；字典 <dictKey>」）；`*Label` 兄弟字段由序列化自动产出，DTO 无需显式声明

**Mapper XML**
- [ ] SELECT 子句与 VO 字段一一对应，无遗漏
- [ ] enriched 字段通过 `LEFT JOIN / INNER JOIN` 正确关联
- [ ] 多层权限过滤（如 user → company → warehouse）JOIN 链路完整，无错误 WHERE 条件

---

## 详细参考

- **[code-templates.md](references/code-templates.md)** — 各层完整代码模板（PO/DTO/Command/Assembler/DomainQuery/Repository 接口/InMemoryImpl/MyBatisImpl/AppService/Action/聚合根/Controller）
- **[maven-config.md](references/maven-config.md)** — 根 pom.xml + 模块 pom.xml 模板
- **[application-config.md](references/application-config.md)** — application.yml 完整配置（含所有 lf.* 开关）
- **[alibaba-guidelines.md](references/alibaba-guidelines.md)** — 阿里巴巴规范详细要点与代码示例
- **[rpc-guide.md](references/rpc-guide.md)** — 服务间通信完整指南（OpenFeign + gRPC 选型、配置、代码骨架、调用链路、常见问题）
- **[database-boundary.md](references/database-boundary.md)** — 5 库分库边界基线（oms_db/product_db/fulfillment_db/bms_db/sys_db），数据归属规则、禁止跨库 join、Outbox 跨域一致性链路、建表速查表
