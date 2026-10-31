# Application 配置模板

> 基于 `generated-platform05/system-core/src/main/resources/application.yml`，替换 `{module-name}` 和数据库名。
> 敏感配置（密码、URI）统一从 `.env` 文件读取，不写入 application.yml。

---

## .env 文件（本地开发，不提交 Git）

```properties
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# MongoDB（审计日志）
# 无认证（本地）: mongodb://host:port/database
# 有认证（生产）: mongodb://username:password@host:port/database?authSource=admin
MONGO_URI=mongodb://localhost:27017/{module-name}_audit

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Sa-Token 超时（秒），默认 30 天
SA_TOKEN_TIMEOUT=2592000
```

---

## application.yml（完整模板）

```yaml
server:
  port: 18084  # 按端口约定修改：18081/18082/18083/18084

spring:
  # 从项目根目录 .env 加载（本地开发用，文件不存在时忽略）
  config:
    import: "optional:file:.env[.properties],optional:file:../.env[.properties]"
  application:
    name: {module-name}
  jackson:
    time-zone: Asia/Shanghai
    date-format: yyyy-MM-dd HH:mm:ss

  # --- Nacos（默认关闭，nacos profile 启用）---
  cloud:
    nacos:
      discovery:
        enabled: false
        register-enabled: false
    service-registry:
      auto-registration:
        enabled: false

  # --- MySQL ---
  datasource:
    url: ${DB_URL:jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/{db_name}?useUnicode=true&characterEncoding=utf-8&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai}
    username: ${DB_USER:root}
    password: ${DB_PASSWORD:}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      # -1 = 启动时跳过 MySQL 连接验证（使用 InMemoryRepository 本地开发时保留）
      # 切换到 MyBatisImpl 后请删除此行
      initialization-fail-timeout: -1

  # --- Redis（Sa-Token 会话 + 字典缓存）---
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
      database: ${REDIS_DB:0}

    # --- MongoDB（审计日志 + 行为埋点）---
    mongodb:
      uri: ${MONGO_URI:mongodb://localhost:27017/{module-name}_audit}

  # --- Kafka（Outbox Relay 消息投递）---
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.StringSerializer
      acks: all
      retries: 3
    consumer:
      group-id: {module-name}-group
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.StringDeserializer

# --- MyBatis-Plus ---
mybatis-plus:
  mapper-locations: classpath*:mapper/**/*.xml
  type-aliases-package: cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.po
  global-config:
    db-config:
      id-type: assign_id          # 雪花 ID
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl  # 生产环境删除

# --- Easy-Trans 字典翻译 ---
easy-trans:
  is-enable-redis: true    # 字典缓存到 Redis
  is-enable-global: true   # 全局响应自动翻译
  is-enable-tile: true
  dict-use-redis: true
  db-type: mysql
  mp-new: true

# --- LiteFlow（默认关闭）---
liteflow:
  enable: false
  rule-source: classpath:flow/*.el.xml
  print-execution-log: true

# --- Actuator（Kubernetes 健康探针）---
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      probes:
        enabled: true

# --- SpringDoc ---
springdoc:
  swagger-ui:
    path: /swagger-ui.html
  scalar:
    path: /scalar

# --- Sa-Token ---
sa-token:
  token-name: Authorization
  timeout: ${SA_TOKEN_TIMEOUT:2592000}
  is-read-header: true
  is-read-cookie: false
  is-log: true
  is-share: false

# --- Platform Kernel 开关 ---
lf:
  # 多租户（默认关闭，单租户无需开启）
  tenant:
    enabled: false
    column: tenant_id
    header: X-Tenant-Id
    ignore-tables:
      # - t_some_shared_table

  # Web 认证拦截
  web:
    auth:
      enabled: true
      exclude-paths:
        - /{module-name}/auth/**
        - /{module-name}/health

  # 接口鉴权：@RequiresCapability（无参注解由 DynamicPermissionResolver 按配置解析）
  # 新接口不需要再写 casbin.policies；该配置只服务于已废弃的 @RequiresPermission 存量代码
  authz:
    enabled: true

  # 字典翻译
  dict:
    enabled: true

  # Outbox Relay（自动投递 event_outbox 表中的待投递事件）
  outbox:
    relay:
      enabled: true
      batch-size: 50
      max-retries: 5
      retry-interval-seconds: 30
      schedule-fixed-delay-ms: 5000

  # 审计日志
  audit:
    enabled: true

---
# Nacos Profile（NACOS_SERVER_ADDR 环境变量触发注册）
spring:
  config:
    activate:
      on-profile: nacos
  cloud:
    service-registry:
      auto-registration:
        enabled: true
    nacos:
      discovery:
        enabled: true
        register-enabled: true
        server-addr: ${NACOS_SERVER_ADDR:127.0.0.1:8848}
        namespace: ${NACOS_NAMESPACE:public}
        group: ${NACOS_GROUP:DEFAULT_GROUP}
        username: ${NACOS_USERNAME:nacos}
        password: ${NACOS_PASSWORD:}
```

---

## logback-spring.xml 要点

```xml
<!-- 放在 src/main/resources/logback-spring.xml -->

<!-- 默认/dev：控制台 + 普通文件日志 -->
<springProfile name="default,dev">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder><pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern></encoder>
    </appender>
</springProfile>

<!-- nacos/prod：JSON 结构化日志（供 Filebeat 采集） -->
<springProfile name="nacos,prod">
    <appender name="JSON_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/{module-name}.json</file>
        <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/{module-name}.%d{yyyy-MM-dd}.json</fileNamePattern>
            <maxHistory>7</maxHistory>
        </rollingPolicy>
    </appender>
</springProfile>

<!-- 审计日志单独文件（所有环境） -->
<appender name="AUDIT_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>logs/audit.log</file>
    <encoder><pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %msg%n</pattern></encoder>
</appender>
<logger name="AUDIT" level="INFO" additivity="false">
    <appender-ref ref="AUDIT_FILE"/>
</logger>
```

---

## 切换 MyBatis 仓储实现

1. 删除 `application.yml` 中的 `hikari.initialization-fail-timeout: -1`
2. 将 `InMemoryXxxRepository` 上的 `@Repository` 改为 `@Repository("xxxInMemoryRepository")`（避免 Bean 冲突）
3. 启用 `OrderRepositoryMybatisImpl`（加 `@Repository` 注解）
4. 确保数据库表和 Mapper XML 已创建
