# 阿里巴巴 Java 开发规范要点

基于《阿里巴巴 Java 开发手册（嵩山版）》的关键规范，配合代码示例。

## 1. 命名规约

```java
// 【强制】类名 UpperCamelCase
public class UserController {}  // ✓
public class userController {}  // ✗

// 【强制】方法名、变量名 lowerCamelCase
private String userName;  // ✓
private String UserName;  // ✗

// 【强制】常量全大写，下划线分隔
public static final String USER_CACHE_KEY = "user:cache";  // ✓
public static final String userCacheKey = "user:cache";    // ✗

// 【强制】布尔变量不加 is 前缀
private Boolean deleted;    // ✓
private Boolean isDeleted;  // ✗

// 【强制】数组定义
int[] arrayDemo;     // ✓
int arrayDemo[];     // ✗
```

## 2. 常量定义

```java
// 【强制】不允许魔法值
if (status == 1) {}  // ✗

public static final Integer STATUS_ACTIVE = 1;
if (status.equals(STATUS_ACTIVE)) {}  // ✓

// 【强制】long 值用大写 L
Long timeout = 1000L;  // ✓
Long timeout = 1000l;  // ✗

// 【推荐】按功能分类常量
public class CacheConsts {}        // 缓存相关
public class ErrorCodeConsts {}    // 错误码相关
// 不要: public class Constants {}  // 所有常量混在一起
```

## 3. 代码格式

```java
// 【强制】if/for/while 后加空格
if (condition) {}   // ✓
if(condition) {}    // ✗

// 【强制】二目运算符左右加空格
int result = a + b;  // ✓
int result=a+b;      // ✗

// 【强制】4 空格缩进
public void method() {
    int a = 1;      // ✓
}

// 【强制】左大括号前不换行
if (condition) {    // ✓
    doSomething();
}
```

## 4. OOP 规约

```java
// 【强制】equals 方法防 NPE
if ("test".equals(str)) {}            // ✓
if (Objects.equals(str, "test")) {}   // ✓
if (str.equals("test")) {}           // ✗ 可能 NPE

// 【强制】整型包装类用 equals 比较
Integer a = 128;
Integer b = 128;
a == b;          // ✗ false（超出缓存范围）
a.equals(b);     // ✓ true
```

## 5. 集合处理

```java
// 【强制】判断集合为空
if (CollectionUtils.isEmpty(list)) {}  // ✓
if (list.size() == 0) {}               // ✗

// 【强制】使用 entrySet 遍历 Map
for (Map.Entry<String, String> entry : map.entrySet()) {
    String key = entry.getKey();
    String value = entry.getValue();   // ✓ 一次查找
}

// 【推荐】指定集合初始容量
List<String> list = new ArrayList<>(16);  // ✓
```

## 6. 并发处理

```java
// 【强制】不用 Executors 创建线程池
ExecutorService pool = Executors.newFixedThreadPool(10);  // ✗

// 手动创建
ExecutorService pool = new ThreadPoolExecutor(
    5, 10, 60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(1000),
    new ThreadFactoryBuilder().setNameFormat("pool-%d").build(),
    new ThreadPoolExecutor.AbortPolicy()
);  // ✓

// 【强制】用 DateTimeFormatter 替代 SimpleDateFormat
private static final DateTimeFormatter DTF =
    DateTimeFormatter.ofPattern("yyyy-MM-dd");  // ✓ 线程安全
```

## 7. 异常与日志

```java
// 【强制】记录异常堆栈
try {
    unstableMethod();
} catch (Exception e) {
    log.error("错误信息", e);  // ✓ 包含堆栈
}

// 【推荐】日志级别
log.debug("调试: {}", param);   // 开发环境
log.info("业务: {}", info);     // 关键业务
log.warn("警告: {}", warn);     // 需要关注
log.error("错误", e);           // 错误异常
```

## 8. MySQL 规约

```sql
-- 【强制】表名、字段名小写，下划线分隔
CREATE TABLE user_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_name VARCHAR(50)
);

-- 【强制】索引命名
ALTER TABLE user ADD INDEX idx_user_name (user_name);     -- 普通索引 idx_
ALTER TABLE user ADD UNIQUE INDEX uk_email (email);       -- 唯一索引 uk_

-- 【强制】小数用 DECIMAL，禁止 FLOAT/DOUBLE
amount DECIMAL(10,2)  -- ✓

-- 【强制】表必备三字段
CREATE TABLE xxx (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 9. 注释规约

```java
/**
 * 用户 Service 实现
 * 【强制】类必须用 Javadoc 注释
 *
 * @author yourname
 * @date 2024-01-01
 */
public class UserServiceImpl implements UserService {

    /**
     * 保存用户
     * 【推荐】public 方法用 Javadoc
     *
     * @param createDTO 创建 DTO
     * @return 用户 VO
     */
    @Override
    public UserVO saveUser(UserCreateDTO createDTO) {
        // 【强制】单行注释 // 后加一个空格
        // 校验参数
        validate(createDTO);
    }
}
```
