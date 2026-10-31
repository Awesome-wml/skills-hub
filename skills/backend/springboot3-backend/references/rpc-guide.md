# 服务间通信指南：OpenFeign & gRPC

本项目通过 `kernel-feign-starter` 和 `kernel-grpc-starter` 封装了两种服务间调用方式，Token 透传、链路追踪、异常转换均由 starter 自动处理，业务代码无需关心。

参考实现：`octopus-cloud`（commerce-core 调用 system-core）

---

## 一、选型原则

| 场景 | 推荐方案 | 原因 |
|---|---|---|
| BFF 聚合、跨域低频查询 | **Feign（HTTP/REST）** | 接口即文档，调试方便，网关可直接透传 |
| 高频内部调用、强类型约束 | **gRPC（HTTP/2 + Protobuf）** | 二进制编码，低延迟，接口合约由 proto 强约束 |
| 消息驱动、跨库一致性 | **Outbox + Kafka** | 异步解耦，最终一致 |

> **原则**：同域内调用优先走 gRPC；跨域低频或 BFF 聚合走 Feign；跨域写操作走 Outbox 事件。

---

## 二、OpenFeign

### 2.1 kernel-feign-starter 自动能力

引入依赖后自动获得：

| 能力 | 实现 |
|---|---|
| Sa-Token 透传 | `FeignAuthInterceptor` 读取当前请求的 Token，注入下游请求头 `Authorization` |
| TraceId 透传 | 同一拦截器注入 `X-Trace-Id`，全链路日志可追踪 |
| 错误映射 | `FeignErrorDecoder` 将 HTTP 非 2xx 响应体（`R<T>` 格式）解析为 `BizException` |

**无需任何配置**，引入 `kernel-feign-starter` + `spring-cloud-starter-openfeign` 即生效。

### 2.2 @FeignClient 接口定义

```java
// infrastructure/client/SystemCoreFeignClient.java
@FeignClient(
    name = "system-core",
    url = "${services.system-core.url}"   // 本地直连；Nacos 模式删除此属性
)
public interface SystemCoreFeignClient {

    // 对应 system-core GET /system-core/users/{id}
    @GetMapping("/system-core/users/{id}")
    R<UserInfoDTO> getUserById(@PathVariable("id") Long id);

    // 分页查询
    @GetMapping("/system-core/users")
    R<PageData<UserInfoDTO>> pageUsers(
            @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize,
            @RequestParam(value = "keyword", required = false) String keyword);

    // 获取当前登录用户（Token 由拦截器自动透传）
    @GetMapping("/system-core/users/me")
    R<UserInfoDTO> getMe();
}
```

**命名规范**：`{目标服务驼峰}FeignClient`，放 `infrastructure/client/` 包下。

### 2.3 application.yml 配置

```yaml
# 本地开发：直接指定地址，无需 Nacos
services:
  system-core:
    url: ${SYSTEM_CORE_URL:http://localhost:18084}
  commerce-core:
    url: ${COMMERCE_CORE_URL:http://localhost:18081}
  fulfillment-core:
    url: ${FULFILLMENT_CORE_URL:http://localhost:18082}
  settlement-core:
    url: ${SETTLEMENT_CORE_URL:http://localhost:18083}
```

接入 Nacos 后：删除 `@FeignClient` 的 `url` 属性，框架自动按 `name` 做服务发现路由，`application.yml` 中的 `services.*` 配置也不再需要。

### 2.4 启动类开启 Feign 扫描

```java
@SpringBootApplication
@EnableFeignClients(basePackages = "cn.org.lengfenghl.laowang.commerce.core.infrastructure.client")
public class CommerceCoreApplication { ... }
```

### 2.5 在 AppService 中调用

```java
@Service
@RequiredArgsConstructor
public class OrderAppService {

    private final SystemCoreFeignClient systemCoreFeignClient;

    public void doSomething(Long userId) {
        // 直接调用，Token 自动透传，异常自动转 BizException
        R<UserInfoDTO> resp = systemCoreFeignClient.getUserById(userId);
        UserInfoDTO user = resp.getData();
        // ...
    }
}
```

### 2.6 调用链路

```
客户端 HTTP 请求（带 Authorization Token）
  → commerce-core Controller
    → AppService → SystemCoreFeignClient.getUserById()
      → FeignAuthInterceptor：注入 Authorization + X-Trace-Id
        → system-core GET /system-core/users/{id}
          → system-core Controller（Sa-Token 自动验证透传的 Token）
            → 返回 R<UserInfoDTO>
      → FeignErrorDecoder：非 2xx 响应 → BizException（自动抛出）
    → 返回数据给调用方
```

---

## 三、gRPC

### 3.1 kernel-grpc-starter 自动能力

| 能力 | 实现 |
|---|---|
| 客户端 Token 注入 | `GrpcAuthClientInterceptor`（`@GrpcGlobalClientInterceptor`）将 Sa-Token 写入 gRPC Metadata |
| 服务端 Token 提取 | `GrpcAuthServerInterceptor`（`@GrpcGlobalServerInterceptor`）从 Metadata 提取 Token 写入 Sa-Token 上下文 + MDC |
| 异常转换 | `GrpcExceptionTranslator`：`BizException/NotLoginException/NotPermissionException → gRPC Status` |
| TraceId 传递 | 客户端拦截器将 `X-Trace-Id` 写入 Metadata，服务端写入 MDC |

### 3.2 Proto 文件定义（在 common 模块）

**路径**：`common/src/main/proto/system/user_service.proto`

```protobuf
syntax = "proto3";

option java_package = "cn.org.lengfenghl.laowang.system.core.grpc";
option java_outer_classname = "UserServiceProto";
option java_multiple_files = true;

package system;

// 用户服务：在 common 模块定义，所有服务共享 Stub
service UserService {
  rpc GetUser (GetUserRequest) returns (UserResponse);
  rpc GetUserRoles (GetUserRequest) returns (UserRolesResponse);
}

message GetUserRequest {
  int64 user_id = 1;
}

message UserResponse {
  int64  user_id  = 1;
  string username = 2;
  string nickname = 3;
  string email    = 4;
  string phone    = 5;
  int32  status   = 6;
}

message UserRolesResponse {
  repeated string roles = 1;
}
```

> **【强制】proto 文件统一放在 `common` 模块**，由 `protobuf-maven-plugin` 一次性编译。各服务只依赖 `common`，不重复运行 `protoc`，避免 Windows 权限问题和版本不一致。

**`common/pom.xml` 关键编译配置**：

```xml
<build>
    <extensions>
        <extension>
            <groupId>kr.motd.maven</groupId>
            <artifactId>os-maven-plugin</artifactId>
            <version>1.7.1</version>
        </extension>
    </extensions>
    <plugins>
        <plugin>
            <groupId>org.xolstice.maven.plugins</groupId>
            <artifactId>protobuf-maven-plugin</artifactId>
            <version>0.6.1</version>
            <configuration>
                <protocArtifact>com.google.protobuf:protoc:3.25.5:exe:${os.detected.classifier}</protocArtifact>
                <pluginId>grpc-java</pluginId>
                <pluginArtifact>io.grpc:protoc-gen-grpc-java:1.68.0:exe:${os.detected.classifier}</pluginArtifact>
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <goal>compile</goal>
                        <goal>compile-custom</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

> **【强制】gRPC 版本锁定为 `1.68.0`**。勿升级到 `1.70+`，Nacos 客户端会拉取 gRPC 新版导致 `NoClassDefFoundError`。版本在根 `pom.xml` 的 `<properties>` 中统一声明。

### 3.3 gRPC 服务端实现（被调用方）

**路径**：`{服务模块}/infrastructure/grpc/XxxGrpcService.java`

```java
@Slf4j
@GrpcService                        // 自动注册为 gRPC 服务，无需额外配置
@RequiredArgsConstructor
public class UserGrpcService extends UserServiceGrpc.UserServiceImplBase {

    private final UserAppService userAppService;  // 调用应用层，不直接访问 DB

    @Override
    public void getUser(GetUserRequest request, StreamObserver<UserResponse> responseObserver) {
        try {
            UserResponseDTO dto = userAppService.getUserById(request.getUserId());

            UserResponse response = UserResponse.newBuilder()
                    .setUserId(dto.getId())
                    .setUsername(nullSafe(dto.getUsername()))
                    .setNickname(nullSafe(dto.getNickname()))
                    .setEmail(nullSafe(dto.getEmail()))
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            log.warn("gRPC getUser 失败 userId={}: {}", request.getUserId(), e.getMessage());
            // GrpcExceptionTranslator 将 BizException → gRPC Status（含错误码描述）
            responseObserver.onError(GrpcExceptionTranslator.translate(e));
        }
    }

    private String nullSafe(String s) { return s != null ? s : ""; }
}
```

**关键规范**：
- 继承 `XxxServiceGrpc.XxxServiceImplBase`（由 proto 编译生成）
- `try-catch` 包裹整个方法体，异常统一用 `GrpcExceptionTranslator.translate(e)` 转换
- 业务逻辑委托给 AppService，不在 gRPC 层写领域逻辑
- proto 返回 String 字段时用 `nullSafe()`，避免 NPE

### 3.4 gRPC 客户端封装（调用方）

**路径**：`{服务模块}/infrastructure/client/XxxGrpcClient.java`

```java
@Slf4j
@Component
public class SystemCoreGrpcClient {

    // 对应 application.yml: grpc.client.system-core
    @GrpcClient("system-core")
    private UserServiceGrpc.UserServiceBlockingStub userServiceStub;

    public UserResponse getUser(long userId) {
        try {
            return userServiceStub.getUser(
                    GetUserRequest.newBuilder().setUserId(userId).build());
        } catch (StatusRuntimeException e) {
            log.warn("gRPC getUser 失败 userId={} status={}", userId, e.getStatus());
            throw toBusinessException(e, "查询用户信息失败");
        }
    }

    public List<String> getUserRoles(long userId) {
        try {
            return userServiceStub.getUserRoles(
                    GetUserRequest.newBuilder().setUserId(userId).build())
                    .getRolesList();
        } catch (StatusRuntimeException e) {
            log.warn("gRPC getUserRoles 失败 userId={} status={}", userId, e.getStatus());
            throw toBusinessException(e, "查询用户角色失败");
        }
    }

    /** gRPC Status → BizException 映射 */
    private BizException toBusinessException(StatusRuntimeException e, String fallbackMsg) {
        String desc = e.getStatus().getDescription();
        return switch (e.getStatus().getCode()) {
            case INVALID_ARGUMENT -> BizException.of(desc != null ? desc : fallbackMsg);
            case NOT_FOUND        -> new BizException(ErrorCode.NOT_FOUND, desc != null ? desc : fallbackMsg);
            case UNAUTHENTICATED  -> new BizException(ErrorCode.NOT_LOGIN, "调用方无有效登录态");
            case PERMISSION_DENIED-> new BizException(ErrorCode.FORBIDDEN, "调用方无访问权限");
            default               -> new BizException(ErrorCode.REMOTE_ERROR,
                                         fallbackMsg + " [" + e.getStatus().getCode() + "]");
        };
    }
}
```

**命名规范**：`{目标服务驼峰}GrpcClient`，放 `infrastructure/client/` 包下，与 FeignClient 同目录。

### 3.5 application.yml 配置

**服务端（暴露 gRPC 接口的服务，如 system-core）**：

```yaml
grpc:
  server:
    port: ${GRPC_PORT:19084}    # 约定：HTTP 端口 + 1000
```

**客户端（调用其他服务 gRPC 的服务，如 commerce-core）**：

```yaml
grpc:
  server:
    port: ${GRPC_PORT:19081}    # 本模块自身的 gRPC 服务端口
  client:
    system-core:                # 对应 @GrpcClient("system-core")
      address: static://${SYSTEM_CORE_GRPC_HOST:localhost}:${SYSTEM_CORE_GRPC_PORT:19084}
      negotiation-type: plaintext    # 本地/内网无 TLS
    # 如需调用其他服务，继续追加：
    # commerce-core:
    #   address: static://${COMMERCE_CORE_GRPC_HOST:localhost}:${COMMERCE_CORE_GRPC_PORT:19081}
    #   negotiation-type: plaintext
```

**端口约定**（HTTP 端口 + 1000）：

| 服务 | HTTP 端口 | gRPC 端口 |
|---|---|---|
| gateway-bff | 18080 | —（网关无 gRPC Server） |
| commerce-core | 18081 | 19081 |
| fulfillment-core | 18082 | 19082 |
| settlement-core | 18083 | 19083 |
| system-core | 18084 | 19084 |
| open-api | 18085 | — |

### 3.6 调用链路

```
commerce-core HTTP 请求
  → GrpcTestController.getUser(userId)
    → SystemCoreGrpcClient.getUser(userId)
      → GrpcAuthClientInterceptor（全局，自动执行）
          注入 Metadata: satoken=<token>, x-trace-id=<traceId>
        → system-core gRPC :19084 UserService.GetUser
          → GrpcAuthServerInterceptor（全局，自动执行）
              提取 Metadata → 写入 Sa-Token 上下文 + MDC
            → UserGrpcService.getUser()
              → userAppService.getUserById()
              → 构建 UserResponse proto
            → responseObserver.onNext(response)
      → StatusRuntimeException → toBusinessException() → BizException
```

---

## 四、新增跨服务调用检查清单

### 新增 Feign 调用

- [ ] 在 `infrastructure/client/` 下新建 `XxxFeignClient.java`（`@FeignClient`）
- [ ] `@FeignClient.name` = 目标服务的 `spring.application.name`
- [ ] `application.yml` 中声明 `services.{服务名}.url`（本地开发用）
- [ ] 启动类已有 `@EnableFeignClients(basePackages = "...infrastructure.client")`
- [ ] 接口方法返回类型统一用 `R<T>` 或 `R<PageData<T>>`，与目标服务接口一致
- [ ] 不在 Feign 接口中加 `@Autowired`，通过构造注入到 AppService 使用

### 新增 gRPC 服务端

- [ ] proto 文件放在 `common/src/main/proto/` 下并提交
- [ ] 在 `mvn install` 前先构建 `common` 模块生成 Stub
- [ ] 服务实现类放 `infrastructure/grpc/`，加 `@GrpcService`
- [ ] 方法体用 `try-catch` 包裹，异常走 `GrpcExceptionTranslator.translate(e)`
- [ ] proto 返回的 String 字段用 `nullSafe()` 处理空值
- [ ] `application.yml` 配置 `grpc.server.port`

### 新增 gRPC 客户端

- [ ] 确认 `common` 模块已包含目标服务的 proto（并已编译）
- [ ] 在 `infrastructure/client/` 下新建 `XxxGrpcClient.java`，注入 Blocking Stub
- [ ] `@GrpcClient("服务名")` 的值与 `application.yml grpc.client.{服务名}` 保持一致
- [ ] `application.yml` 配置 `grpc.client.{服务名}.address` 和 `negotiation-type`
- [ ] `StatusRuntimeException` 统一转 `BizException`（参考 `toBusinessException` 模板）
- [ ] gRPC 版本固定为 `1.68.0`，不要升级

---

## 五、常见问题

**Q：Feign 调用时 Token 没有透传？**  
A：确认引入了 `kernel-feign-starter`，且启动类有 `@EnableFeignClients`。检查 `FeignAuthInterceptor` 是否被扫描到（看启动日志）。

**Q：gRPC 客户端报 `NoClassDefFoundError`？**  
A：99% 是 gRPC 版本被 Nacos 拉到 `1.70+`。在根 `pom.xml` 的 `<properties>` 中显式固定 `<grpc.version>1.68.0</grpc.version>`，并用 `<dependencyManagement>` 通过 `grpc-bom` 锁定。

**Q：gRPC 服务端异常没有返回错误描述给客户端？**  
A：确认用了 `GrpcExceptionTranslator.translate(e)`，不要直接 `new StatusRuntimeException()`。

**Q：本地 Windows 运行 `mvn package` 时 protoc 下载失败？**  
A：确认 `common/pom.xml` 有 `os-maven-plugin` extension，且网络可访问 Maven Central。离线时可手动下载 protoc 二进制放到 `~/.m2` 本地仓库。

**Q：Feign 接口加了 `@RequestBody` 但下游收到空数据？**  
A：Feign POST 请求需要在接口方法参数上加 `@RequestBody`，且 Content-Type 必须是 `application/json`（Feign 默认已配置）。
