# 等保 2.0 安全合规检查清单

本文件覆盖《信息安全等级保护基本要求》（GB/T 22239-2019）中与应用代码直接相关的技术要求。

---

## 1. 身份鉴别（对应等保 8.1.4.1）

### BLOCKER 级

- [ ] **登录接口必须接入 Sa-Token 认证体系**
  - 使用 `AuthContext.setLoginUser()` 写入会话
  - 禁止自行实现 Token 签发/校验逻辑
  - 检查：新增的 `/auth/**` 或 `/login` 接口是否走 Sa-Token

- [ ] **密码存储必须使用不可逆加密**
  - 使用 BCrypt / Argon2 / SCrypt，禁止 MD5/SHA1/SHA256 直接哈希
  - 检查：`password` 字段是否经过 `passwordEncoder.encode()` 处理

- [ ] **会话 Token 必须有过期时间**
  - Sa-Token 配置 `sa-token.timeout` 必须为有限值（默认 30 天）
  - `sa-token.active-timeout` 应配置无操作超时（建议 ≤ 30 分钟）
  - 检查：`application.yml` 中 `sa-token` 配置段

- [ ] **登录失败必须有锁定机制**
  - 连续失败 N 次后锁定账户或增加验证码
  - 检查：登录逻辑中是否有失败计数与锁定处理

### WARNING 级

- [ ] **敏感操作应要求二次认证**
  - 资金操作、权限变更等使用 `SecurityLevel.HIGH`（Token 存活校验）
  - 检查：涉及资金/权限的 `@RequiresCapability` 是否配置 `securityLevel = SecurityLevel.HIGH`

- [ ] **接口应防暴力破解**
  - 登录/验证码/重置密码接口应配置限流
  - 检查：Gateway 路由是否配置 `RequestRateLimiter` filter

---

## 2. 访问控制（对应等保 8.1.4.2）

### BLOCKER 级

- [ ] **所有非公开 Controller 方法必须有权限注解**
  - 后台接口使用 `@RequiresCapability`（`@RequiresPermission` 已废弃）；C 端使用 `@ConsumerApi` + service 层行级所有权过滤
  - 检查：新增的 Controller 方法是否都有鉴权注解；`@Audited` 不算鉴权
  - 例外：确属公开的接口（登录前、webhook 签名校验等），须登记在 `scripts/endpoint-capability-exemptions.txt`

- [ ] **数据访问必须有行级过滤**
  - 涉及多组织数据的 Mapper 必须使用 `@DataScope`
  - 检查：新增 Mapper 是否配置了 `@DataScope(orgField, resourceField, resourceType)`

- [ ] **禁止在前端/网关层做唯一权限控制**
  - 每个服务内部必须独立校验权限（零信任原则）
  - 检查：Controller 方法不应假设"网关已拦截"

- [ ] **权限遵循最小权限原则**
  - 不为"更细粒度"往注解里填原子 code——归属走原子 → 接口配置；新增 `Capability` 须过架构评审，能并入既有能力的不新增
  - 检查：带参写法声明的能力是否过宽（如用 `system.*` 级能力守业务写接口）

### WARNING 级

- [ ] **API 路径应遵循 RESTful 约定**
  - 敏感资源不暴露内部 ID 规律（如自增 ID）
  - 建议使用 UUID 或雪花 ID 作为外部标识

- [ ] **文件上传路径不应暴露内部目录结构**
  - 使用 `FileStorageService` 统一管理，objectKey 不含服务器路径

---

## 3. 安全审计（对应等保 8.1.4.3）

### BLOCKER 级

- [ ] **关键操作必须有审计日志**
  - 增删改操作必须添加 `@Audited(action, resource)` 注解
  - 检查：新增的写操作 Controller 方法是否有 `@Audited`

- [ ] **审计日志必须记录操作者身份**
  - `AuditEvent` 自动采集 `userId`、`clientIp`、`traceId`
  - 检查：非 Web 上下文的操作是否手动传入 operator

- [ ] **审计日志中敏感字段必须脱敏**
  - 密码、Token、身份证、银行卡等内置脱敏
  - 自定义敏感字段通过 `@Audited(maskFields = {...})` 声明
  - 检查：新增接口的请求参数中是否有未脱敏的敏感字段

### WARNING 级

- [ ] **审计日志应可追溯且不可篡改**
  - 使用 MongoAuditLogger 或外部存储，禁止仅输出到本地文件
  - 日志应包含 `traceId` 以支持全链路追踪

- [ ] **登录/登出事件必须审计**
  - 检查：认证相关接口是否有 `@Audited`

---

## 4. 数据保密性（对应等保 8.1.4.5）

### BLOCKER 级

- [ ] **敏感数据传输必须加密**
  - 对外接口强制 HTTPS（Gateway 层 TLS 终止）
  - 内部 gRPC 生产环境应开启 TLS
  - 检查：配置中是否有明文传输敏感数据的情况

- [ ] **敏感数据存储必须加密或脱敏**
  - 密码：不可逆加密存储
  - 身份证/银行卡/手机号：AES 加密存储 + 前端脱敏展示
  - 检查：PO 类中敏感字段的存储策略

- [ ] **禁止在日志中输出敏感数据**
  - 检查：`log.info/debug/error` 中是否打印了密码、Token、完整身份证号等
  - 使用 `@Audited(maskFields)` 或 logback 过滤器脱敏

- [ ] **禁止在代码或配置文件中硬编码密钥/密码**
  - 密码、AK/SK、数据库密码等必须通过环境变量或配置中心注入
  - 检查：代码中是否有 hardcoded 的密码字符串
  - `.env` 文件已在 `.gitignore` 中

### WARNING 级

- [ ] **API 响应不应泄露内部实现细节**
  - 错误响应不暴露堆栈信息（`GlobalExceptionHandler` 兜底 → `R.fail(50000)`）
  - 检查：是否有手动 catch 后返回 `e.getMessage()` 的情况

---

## 5. 数据完整性（对应等保 8.1.4.6）

### BLOCKER 级

- [ ] **关键业务数据必须校验完整性**
  - 请求参数使用 `@Valid` + JSR 303 注解校验
  - 检查：Controller 的 `@RequestBody` 参数是否有 `@Valid`

- [ ] **金额计算必须使用 Money 值对象**
  - 禁止裸 `BigDecimal` 运算（精度丢失风险）
  - 分摊必须使用 `MoneyAllocator`（保证 sum == total）
  - 检查：涉及金额的代码是否使用了 `Money` / `MoneyCalculator` / `MoneyAllocator`

### WARNING 级

- [ ] **数据变更应有版本控制或乐观锁**
  - MyBatis-Plus `@Version` 字段或业务级版本号
  - 检查：并发更新场景是否有乐观锁保护

---

## 6. 入侵防范（对应等保 8.1.4.8）

### BLOCKER 级

- [ ] **输入参数必须校验和过滤**
  - 使用 `@Valid` + JSR 303 校验（`@NotBlank`, `@Size`, `@Pattern` 等）
  - 检查：用户输入是否直接用于 SQL/Shell/模板拼接

- [ ] **SQL 注入防护**
  - 使用 MyBatis-Plus `BaseMapper` 参数化查询
  - 禁止 `${}` 拼接用户输入（MyBatis XML 中只用 `#{}`）
  - 检查：Mapper XML 中是否有 `${` 引用用户输入

- [ ] **文件上传必须限制类型和大小**
  - 使用 `FileStorageService` 统一处理
  - 白名单校验文件后缀和 MIME 类型
  - 配置最大文件大小限制
  - 检查：文件上传接口是否有类型/大小校验

- [ ] **禁止反序列化不可信数据**
  - 不使用 `ObjectInputStream` 反序列化外部输入
  - JSON 反序列化使用 Jackson（已配置类型白名单）

### WARNING 级

- [ ] **XSS 防护**
  - 用户输入在存储前应做 HTML 转义或在展示时转义
  - 富文本字段使用白名单过滤

- [ ] **CORS 配置应限制来源**
  - 生产环境不应使用 `allowedOrigins: *`
  - 检查：Gateway CORS 配置是否过于宽松

- [ ] **依赖版本应无已知高危漏洞**
  - 检查：pom.xml 中的依赖版本是否有 CVE 告警
