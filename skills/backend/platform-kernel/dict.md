# Dictionary Translation (kernel-dict-starter)

dict-starter 提供字典翻译能力：code → label 自动序列化、两级缓存、定时刷新、跨服务 RPC 翻译。

---

## @DictLabel 用法（最常用）

```java
public class OrderVO {
    @DictLabel("order_status")
    private String statusCode;  // → { "statusCode": "PAID", "statusLabel": "已支付" }

    @DictLabel(value = "payment_method", labelField = "payMethodDesc")
    private String payMethod;   // → { "payMethod": "WECHAT", "payMethodDesc": "微信支付" }
}
```

字段名推导：`statusCode` → `statusLabel`；`status` → `statusLabel`；可用 `labelField` 覆盖。

注解全名 `com.lengfeng.platform.kernel.dict.jackson.DictLabel`。

### 状态文案一律走 @DictLabel（octopus 约定）

状态码 → 中文**不要在前端硬编码 map**，也不要在后端拼中文。为什么：同一状态在多端、多页面重复维护，改一处漏一处。标准做法：

1. 后端响应 DTO 的状态字段加 `@DictLabel("<dict_key>")`，序列化自动注入 `{字段名}Label`，DTO 不用显式声明 label 字段；
2. 字典条目：`code` = 后端枚举名，`label` = 中文，灌在 `system-core/src/main/resources/db/seed/common/R__dict_*.sql`（写法与主键规则见 `/dict-creator`、`/flyway-migration`）；
3. dict_key 常量登记在 `CommerceDictKeys.java`（commerce 域）；`@Schema(description)` 里仍要写字面量 dictKey（见 springboot3-backend「kernel-dict-starter」节）；
4. 前端展示读 `row.xxxLabel`，下拉/筛选按 dictKey 调字典接口拉选项。

---

## 缓存层次

```
读取：L1 Caffeine → L2 Redis → 返回原始 code
写入：L2 Redis → L1 Caffeine
```

无 Caffeine 无 Redis → ConcurrentHashMap 降级。

---

## 配置

```yaml
lf:
  dict:
    enabled: true
    cache:
      l1-ttl-seconds: 60
      l1-max-size: 10000
      l2-ttl-minutes: 0         # 0=不过期
    redis:
      key-prefix: "easytrans:dict:"
    refresh:
      enabled: false
      fixed-delay-ms: 300000
      initial-delay-ms: 10000
    rpc:
      provider-enabled: false   # 暴露 /easyTrans/proxy/**
      consumer-enabled: false   # 注册 TransRpcClient
      cache-ttl-seconds: 120
      cache-max-size: 5000
```

---

## 实现 DictDataSource（定时刷新）

```java
@Component
public class DbDictDataSource implements DictDataSource {
    @Override
    public Map<String, Map<String, String>> loadAll() {
        return Map.of(
            "order_status", Map.of("PAID", "已支付", "CANCELED", "已取消"),
            "payment_method", Map.of("WECHAT", "微信支付", "ALIPAY", "支付宝")
        );
    }
}
```

配合 `lf.dict.refresh.enabled=true`。

---

## DictCode 枚举模式

```java
public enum OrderStatus implements DictCode {
    PAID("PAID"), CANCELED("CANCELED");
    private final String code;
    @Override public String code() { return code; }
    @Override public String dictKey() { return "order_status"; }
}
String label = dictTranslator.label(OrderStatus.PAID); // "已支付"
```

---

## 跨服务 RPC 翻译

**Provider 端**：实现 `TransDataProvider<T>` + `lf.dict.rpc.provider-enabled=true`

```java
@Component
public class UserTransDataProvider implements TransDataProvider<User> {
    @Override public String transType() { return "user"; }
    @Override
    public Map<String, Map<String, Object>> findByIds(Collection<String> ids, List<String> fields) { ... }
}
```

**Consumer 端**：`lf.dict.rpc.consumer-enabled=true`，注入 `TransRpcClient`。需配置 `services.{targetService}.url`。

---

## 注意事项

- @DictLabel 只影响 JSON 序列化，不影响数据库
- 翻译失败返回原始 code（不抛异常）
- Redis L2 使用 DELETE + HSET 原子更新
- Consumer 自动带 Caffeine 缓存（如 classpath 有 Caffeine）
