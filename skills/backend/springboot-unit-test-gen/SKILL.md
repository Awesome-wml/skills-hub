---
name: springboot-unit-test-gen
description: 本项目 Spring Boot Controller 单元测试生成器。当用户说「生成单元测试」「为 Controller 写单元测试」「给 XXController 写 JUnit 测试」「生成 MockMvc 测试」「Controller 单测」时使用。根据指定的 Controller 文件，解析路由/DTO/依赖，生成基于 JUnit 5 + MockMvc + Mockito 的独立 Controller 层单元测试，Mock 掉 AppService 等依赖，覆盖每个接口的正常路径与基础异常路径，输出到对应模块的 `src/test/java` 目录。
version: 0.1.0
---

# Spring Boot Controller 单元测试生成器

根据本项目的 Controller 源文件生成 JUnit 5 + MockMvc + Mockito 风格的 Controller 层单元测试。

---

## 适用范围

- 仅针对 **Controller 层** 的单元测试：Mock 掉 Service/AppService 依赖，只验证 HTTP 绑定、参数校验、返回结构，不启动完整 Spring 容器、不连数据库、不连 Redis/Kafka。
- 使用 **MockMvc standalone 模式**（`MockMvcBuilders.standaloneSetup`），避免加载整个应用上下文，跑得更快、隔离性更好。
- Auth / 权限注解（`@RequiresCapability`、C 端 `@ConsumerApi`、`@Audited`、Sa-Token 拦截）在 standalone 下天然不生效，无需额外配置。也因此 Controller 单测**验证不了鉴权**——无参 `@RequiresCapability` 是否漏配原子要用非超管账号走查（见 `/authz-map`）。
- **不使用 `@WebMvcTest`**：本项目 Controller 依赖的上下文（过滤器、全局异常处理器等）在 WebMvcTest 下容易触发自动装配问题，standalone 更干净。

---

## 工作流程

### Step 1 — 确认目标 Controller

若用户指定了 Controller（如 "给 AppOnboardingController 写单测"），直接定位该文件：

```
octopus-cloud/*/src/main/java/**/{ControllerName}.java
```

若用户给了模块名（如 "system-core 的 Store 相关 controller"），Glob 出对应模块下的候选 Controller，列给用户确认。

若完全未指定，**必须先问用户**目标 Controller，不要默认扫描全部。

### Step 2 — 读取并解析 Controller

对目标 Controller 文件用 Read 工具读取完整内容，提取：

| 信息 | 来源 |
|---|---|
| 类包名 | `package ...` |
| 类上 base path | 类注解 `@RequestMapping("...")` |
| 依赖字段 | `private final XxxAppService ...` / `private final XxxAssembler ...` 等 |
| 接口方法 | `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` / `@PatchMapping` |
| 每个方法的入参 | `@RequestBody`、`@RequestParam`、`@PathVariable`、`@Valid` |
| 方法返回类型 | `R<XxxDTO>` / `R<PageData<...>>` / `R<Void>` |
| 接口描述 | `@Operation(summary = "...")` |

记录每个依赖字段，它们在测试里需要被 `Mockito.mock(...)` 后用构造器注入。

### Step 3 — 解析请求/响应 DTO（按需）

- 若入参含 `@RequestBody XxxDTO`：用 Grep/Read 找到 DTO 文件，识别带 `@NotBlank` / `@NotNull` / `@NotEmpty` 的必填字段，在测试里构造"合法最小 DTO"与"缺必填字段的非法 DTO"。
- 若入参只有 `@RequestParam`：按 Java 类型构造默认值（String 用 `"x"`，Long 用 `1L`，Enum 用首个枚举常量，Boolean 用 `true`）。
- 若返回 `R<XxxDTO>`：stub 时返回一个 `new XxxDTO()` 或 `Mockito.mock(XxxDTO.class)` 即可，不需要填充字段。

### Step 4 — 生成测试用例矩阵

**对每个接口方法，至少生成以下用例**：

1. **happy path**：构造合法入参，stub AppService 返回正常结果，断言 HTTP 200 + `$.code == 0`。
2. **参数校验失败**（仅当存在 `@Valid @RequestBody` 且 DTO 有必填字段时）：发送缺字段的 body，断言 HTTP 400 或 `$.code != 0`。
3. **业务异常**（可选，代表性接口补一条）：stub AppService 抛 `BizException`，断言错误响应。

注意：由于 standalone 模式下无全局异常处理器，业务异常用例可选；若 Controller 所在模块在 `octopus-cloud/*/src/main/java` 有全局 `@RestControllerAdvice`，可在测试里通过 `.setControllerAdvice(...)` 注册。

### Step 5 — 生成测试文件

**输出路径**：

```
octopus-cloud/<模块名>/src/test/java/<与 Controller 相同包路径>/{ControllerName}Test.java
```

例如：
- 源文件 `octopus-cloud/system-core/src/main/java/cn/org/lengfenghl/laowang/system/core/v1/api/controller/app/AppOnboardingController.java`
- 测试文件 `octopus-cloud/system-core/src/test/java/cn/org/lengfenghl/laowang/system/core/v1/api/controller/app/AppOnboardingControllerTest.java`

**文件模板**参考 [references/junit-template.md](references/junit-template.md)。

核心规则：
- 类名：`{ControllerName}Test`
- 包路径与源 Controller 一致
- 类注解：`@ExtendWith(MockitoExtension.class)`（如果没有 `@Mock` 字段可以省略）
- 字段：`private MockMvc mockMvc;`、每个依赖一个 `private {Type} {name};`、Controller 本身一个 `private {ControllerName} controller;`
- `@BeforeEach setUp()`：实例化所有 mock + Controller + `MockMvc = MockMvcBuilders.standaloneSetup(controller).build();`
- 测试方法命名：`{methodName}_should{Behavior}_when{Condition}`，例如 `submit_shouldReturnAgreementCode_whenDraftIdValid`
- 使用 `MockMvcRequestBuilders.post("...")` / `get(...)` 等；JSON body 用 `objectMapper.writeValueAsString(dto)`
- 断言：`andExpect(status().isOk())`、`.andExpect(jsonPath("$.code").value(0))`、`.andExpect(jsonPath("$.data").value("..."))`
- 对 AppService 依赖用 `when(...).thenReturn(...)` / `verify(...)` 做桩与行为断言

### Step 6 — 检查 / 补充 pom 依赖

单测依赖在本项目由 `platform-kernel` starter 或父 POM 统一引入 `spring-boot-starter-test`，通常已包含 `junit-jupiter` + `mockito-core` + `spring-test`。若目标模块 `pom.xml` 中没有 `spring-boot-starter-test` 且父 POM 也没有，主动提示用户添加：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

**不要**自动修改 pom；先告知用户，由用户确认后再改。

### Step 7 — 输出结果

生成完成后告诉用户：

1. 生成的测试文件完整相对路径（markdown 链接形式）
2. 覆盖的接口数 / 测试方法数
3. 运行命令：
   ```
   cd octopus-cloud && mvn -pl <module> test -Dtest={ControllerName}Test
   ```
4. 如果某些接口因复杂入参（文件上传、嵌套 DTO 过深）只生成了 happy path 骨架，明确标注待人工补充的 TODO。

---

## 关键约束

- **不要改源码**：测试生成过程中不修改 Controller、Service、DTO 等任何主代码，仅新增测试文件。
- **不要启动完整上下文**：禁用 `@SpringBootTest`、`@AutoConfigureMockMvc`，仅用 standalone MockMvc。
- **一个 Controller 对应一个 Test 类**：不跨 Controller 合并。
- **测试方法独立、可重复**：禁止测试方法之间共享状态；每个方法自行 stub 自行 verify。
- **不要生成无意义断言**：避免 `assertTrue(true)` 等占位；happy path 至少断言 HTTP 状态 + 业务码 + 关键返回字段。
- **中文命名仅限于 `@DisplayName`**，方法名保持英文驼峰。
- **默认不引入 Testcontainers**：本生成器产出的是纯单测。若确需新增 `import org.testcontainers` 的 `*Test`，必须按字母序登记到 octopus-cloud 的 `scripts/ci/surefire-fast-excludes.txt`，并本地跑 `sh scripts/ci/check-fast-test-excludes.sh` 确认通过（不要接 `| tail`，会吞退出码）——否则 CI 快速测试阶段没有容器环境会失败。
- **不要用跳过测试的方式"让 CI 绿"**：`@Disabled` 整类、`-DskipTests` 之类会被 `scripts/check-no-test-skip.sh` 拦。

---

## 常见 Pitfall

1. **`@Valid` 校验在 standalone 下不触发**：默认 `MockMvcBuilders.standaloneSetup(...)` 不会注册 `LocalValidatorFactoryBean`。若需要触发 Bean Validation，在 `setUp` 里显式 `.setValidator(new LocalValidatorFactoryBean())`（需要 `afterPropertiesSet()`）。
2. **`AuthContext` 线程态**：Controller 里调用 `AuthContext.getLoginId()` / `AuthContext.getLoginUser()` 时，standalone 不会自动注入。需要在测试里 mock 掉对应静态调用（使用 `Mockito.mockStatic(AuthContext.class)` try-with-resources），或让待测方法只走你 mock 掉的 AppService 分支。
3. **`@PathVariable` 数字类型**：`get("/foo/{id}", 1L)` 注意 long 转 path 段不要漏类型。
4. **`R<Void>` 返回值**：Controller 返回 `R.ok()` 时，`$.data` 是 null，用 `jsonPath("$.data").doesNotExist()` 或 `.isEmpty()`。

---

## 示例触发语句

- "给 AppOnboardingController 写单元测试"
- "生成 StoreManagementController 的 JUnit 测试"
- "为 system-core 的 ProductController 生成 MockMvc 单测"
- "Controller 单测"
