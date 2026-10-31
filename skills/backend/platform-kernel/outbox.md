# Outbox Pattern (kernel-outbox-starter)

outbox-starter：事件随业务数据原子写入数据库，异步投递到消息队列，保证至少一次投递。

---

## 事件发布流程

```
业务事务内：
  业务写入 → OutboxRepository.save(OutboxEvent) [status=PENDING] → 事务提交

Relay（每 5s）：
  findPendingEvents(50) → 逐个：
    ├── 创建 OTel Span
    ├── OutboxEventSender.send(event)
    ├── 成功 → markSent(id)
    └── 失败 → retryCount < max → updateRetry（指数退避）
              retryCount >= max → markDead(id)
```

---

## 配置

```yaml
lf:
  outbox:
    relay:
      enabled: true
      batch-size: 50
      max-retries: 5
      retry-interval-seconds: 30    # 指数退避：30s × retryCount
      schedule-fixed-delay-ms: 5000
```

---

## 业务层 SPI

### OutboxRepository

```java
void save(OutboxEvent event);
List<OutboxEvent> findPendingEvents(int batchSize);
void markSent(Long id);
void updateRetry(Long id, int retryCount, LocalDateTime nextRetryTime);
void markDead(Long id);
```

### OutboxEventSender

```java
void send(OutboxEvent event) throws Exception;
// 例：kafkaTemplate.send(event.getEventType(), event.getPayload()).get();
```

### IdempotencyGuard（可选）

```java
boolean firstSeen(String idempotencyKey);
// 例：redisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofHours(24));
```

---

## DDL

```sql
CREATE TABLE event_outbox (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload LONGTEXT NOT NULL,
    trace_id VARCHAR(128),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    next_retry_time DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_status_retry (status, next_retry_time)
);
```

---

## 注意事项

- OutboxEvent 必须与业务数据同事务写入
- 消费端必须基于 eventId 做幂等处理
- OTel Span 为每个 Relay 事件独立创建，原始 traceId 存为属性
- DEAD 事件需告警 + 人工介入
- IdempotencyGuard 被 ActionExecutor 使用，不限于 outbox
