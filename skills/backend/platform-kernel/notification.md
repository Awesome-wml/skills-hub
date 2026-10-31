# Notification Push (kernel-notification-starter)

notification-starter：基于 Redis Pub/Sub + WebSocket 的实时通知推送。

---

## 两种部署模式

### 业务服务（Publisher Only）

```yaml
lf.notification.enabled: true
```

```java
publisher.publishNotification(tenantId, userId, notification, unseenCount, unreadCount);
publisher.publishBizEvent(tenantId, userId, bizEvent);
publisher.publishCounters(tenantId, userId, unseenCount, unreadCount);
```

### 网关（Full WebSocket Gateway）

```yaml
lf.notification.gateway: true
lf.notification.endpoint: /ws/notify
lf.notification.heartbeat-timeout-seconds: 90
```

---

## 数据流

```
业务服务 → BlockingRedisNotificationPublisher → Redis PUBLISH notify:user:{tenantId}:{userId}
                                                         ↓
网关 ← RedisNotificationSubscriber (PSUBSCRIBE) → WebSocketSessionManager.sendToUser() → 客户端
```

---

## 消息模型

```json
{ "protocolVersion": "v1", "messageId": "uuid",
  "type": "NOTIFICATION",
  "data": { "id": "...", "title": "...", "content": "...", "feed": "order" },
  "counters": { "unseenCount": 5, "unreadCount": 3 } }
```

MessageType：NOTIFICATION / UNSEEN_COUNT / BIZ_EVENT / PONG

---

## WebSocket 连接流程

1. 客户端请求 Ticket → `issueTicket(userId, tenantId)` → `{ ticket, expiresInSeconds: 60 }`
2. 建立 WebSocket `ws://gateway/ws/notify?ticket=xyz`
3. Handler 校验 ticket（一次性消费，防重放）→ 注册 Session
4. 客户端定期发 `{"type":"PING"}`，服务端回 PONG
5. 超 90s 无 PING → ConnectionHealthChecker 关闭连接

---

## 配置

```yaml
lf:
  notification:
    enabled: true
    gateway: true
    endpoint: /ws/notify
    channel-pattern: "notify:user:*"
    ticket-ttl-seconds: 60
    heartbeat-timeout-seconds: 90
```

---

## Micrometer 指标

`notification.websocket.connections.active` (Gauge) / `notification.messages.sent` (Counter) / `notification.messages.failed` (Counter) / `notification.messages.send.time` (Timer)

---

## 注意事项

- 网关必须是 WebFlux，业务服务是 MVC
- Redis channel 格式固定：notify:user:{tenantId}:{userId}
- Ticket 一次性消费
- 同用户可多设备多连接
- gateway=true 不需要同时设 enabled=true
