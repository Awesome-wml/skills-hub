# 分层架构规范检查清单

本项目采用 DDD + 六边形架构，严格遵循依赖方向和职责边界。

---

## 1. 包结构与依赖方向

### BLOCKER 级

- [ ] **依赖方向必须从外向内，禁止反向引用**
  ```
  api → application → domain ← infrastructure
  ```
  - `domain` 层不依赖 Spring、MyBatis 等框架
  - `api` 层不直接引用 `infrastructure` 层
  - `application` 层不引用 PO 类或 Mapper 接口
  - 检查：import 语句是否有跨层反向依赖

- [ ] **禁止跨域直接数据库访问**
  - 不同模块（commerce/fulfillment/settlement）不共享数据库
  - 跨域数据获取只能通过：Feign/gRPC 同步调用 或 Outbox 事件异步投影
  - 检查：是否有跨模块的 Mapper/Repository 引用

### WARNING 级

- [ ] **包结构应遵循标准分层**
  ```
  cn.org.lengfenghl.laowang.{module}.core/
  ├── api/
  │   ├── controller/    # REST 端点
  │   └── dto/           # 请求/响应 DTO
  ├── application/
  │   ├── service/       # 应用服务（编排）
  │   ├── command/       # 写操作命令
  │   ├── assembler/     # DTO ↔ Command 映射（MapStruct）
  │   └── action/        # TradeAction 实现
  ├── domain/
  │   ├── model/         # 聚合根与实体
  │   ├── repository/    # 仓储接口
  │   └── enums/         # 领域枚举
  └── infrastructure/
      ├── persistence/
      │   ├── po/        # 持久化对象
      │   ├── mapper/    # MyBatis-Plus Mapper
      │   └── repository/ # 仓储实现
      └── outbox/        # 事件发布实现
  ```

---

## 2. 各层职责边界

### BLOCKER 级

- [ ] **Controller 只负责参数接收、校验和转发**
  - 不包含业务逻辑（if/else 业务判断）
  - 不直接调用 Repository 或 Mapper
  - 只调用 AppService 或 ActionExecutor
  - 检查：Controller 方法体是否超过 10 行业务逻辑

- [ ] **Domain Model 不依赖框架注解**
  - 聚合根/实体不使用 `@TableName`、`@Data`（Lombok 可用 `@Getter`）
  - 使用工厂方法 `create()` / `restore()` 构造实例
  - 检查：domain/model 下的类是否有 MyBatis-Plus 或 Spring 注解

- [ ] **Repository 接口定义在 domain 层，实现在 infrastructure 层**
  - `domain/repository/OrderRepository.java` → 接口
  - `infrastructure/persistence/repository/MyBatisOrderRepository.java` → 实现
  - 检查：Repository 接口是否在正确的包下

### WARNING 级

- [ ] **AppService 负责编排，不直接操作数据库**
  - 通过 Repository 接口操作数据
  - 通过 ActionExecutor 执行关键写操作
  - 检查：AppService 中是否直接注入 Mapper

- [ ] **Assembler 使用 MapStruct，而非手写转换**
  - `@Mapper(componentModel = "spring")`
  - DTO → Command / PO → Domain Model 映射
  - 检查：是否有手写的大量 getter/setter 转换代码

- [ ] **PO 类只在 infrastructure 层使用**
  - PO 不应出现在 API 响应或 Domain 方法签名中
  - 检查：Controller 返回值或 AppService 参数是否使用了 PO 类型

---

## 3. 命名规范

### WARNING 级

- [ ] **类命名后缀应一致**
  | 层 | 后缀 | 示例 |
  |---|---|---|
  | Controller | `Controller` | `OrderController` |
  | DTO（请求） | `Req` / `Request` | `CreateOrderReq` |
  | DTO（响应） | `VO` | `OrderVO` |
  | Command | `Command` | `CreateOrderCommand` |
  | AppService | `AppService` | `OrderAppService` |
  | Domain Model | 无后缀 | `Order` |
  | Repository 接口 | `Repository` | `OrderRepository` |
  | PO | `PO` | `OrderPO` |
  | Mapper | `Mapper` | `OrderMapper` |
  | Assembler | `Assembler` | `OrderAssembler` |
  | TradeAction | `Action` | `CreateOrderAction` |

- [ ] **API 路径遵循项目动词约定**（项目只允许 GET/POST、禁用 `@PathVariable`，见 springboot3-backend）
  - `GET /orders/list` — 分页列表
  - `GET /orders/detail?id=` — 详情
  - `POST /orders/create` — 创建
  - `POST /orders/update` — 更新
  - `POST /orders/delete` — 删除

- [ ] **`@Operation(summary)` 标注调用端**
  - 以 `[PC]` / `[APP]` / `[H5]` 开头，多端共用写 `[PC + APP]` 并说明差异；同一业务三端入口不同，不标排查会走错链路

## 3.1 接口向后兼容

### BLOCKER 级

- [ ] **存量接口只追加，不破坏**
  - 只允许追加可选字段 / 枚举值；换路径、删字段、改语义、删已有状态值（如 `BLOCKED`）、方案里"规划删除"都打回
  - 新行为应装在现有接口背后；现网没有的动作才新增接口，且挂在现有 Controller 前缀下
  - 新建分类 / 模型须对齐现有枚举，不自造
  - 为什么：前端、运维脚本、其他服务依赖现有接口与状态值

### WARNING 级

- [ ] **环境变量改对仓库**
  - 新增 env / `secretKeyRef` 应改 octopus-deploy 的 `charts/<服务>/values*.yaml`（PR base=main）；改 octopus-cloud 的 `deploy/charts/` 不生效（拆仓遗留）
  - 新密钥建议 `optional: true`，避免 Secret 未写入时 Pod 起不来

---

## 4. 跨域通信

### BLOCKER 级

- [ ] **跨服务调用使用声明式客户端**
  - 高频场景：gRPC（Protobuf 定义在 common 模块）
  - 低频/聚合场景：Feign（OpenFeign）
  - 检查：是否有通过 RestTemplate/WebClient 硬编码 URL 调用其他服务

- [ ] **跨服务数据同步使用 Outbox 模式**
  - 事件随业务数据同事务写入 `event_outbox` 表
  - 异步投递到 Kafka
  - 检查：是否有在业务事务外发送 Kafka 消息

### WARNING 级

- [ ] **common 模块只放共享的 DTO/枚举/Proto**
  - 不放业务逻辑或 Spring Bean
  - 检查：common 模块是否有业务代码
