---
name: api-test-gen
description: 本项目接口测试脚本生成器。当用户说「生成接口测试」「生成 http 测试文件」「为 Controller 生成测试脚本」「生成 .http 文件」「给 XXController 写测试」「接口冒烟测试」时使用。扫描指定模块的 Spring Boot Controller，结合 DTO 字段，输出 IntelliJ HTTP Client 格式的 .http 测试文件，保存到 tests/http/ 目录。
version: 0.1.0
---

# API 接口测试脚本生成（IntelliJ HTTP Client）

扫描本项目 Spring Boot Controller 文件，解析路由和 DTO 字段，生成 IntelliJ HTTP Client `.http` 测试文件。

---

## 工作流程

### Step 1 — 确认范围

若用户未指明，默认扫描 `octopus-cloud/system-core` 下所有 Controller。若指定了 Controller 名称或模块，仅扫描对应文件。

### Step 2 — 扫描 Controller

使用 Glob 找到所有 `*Controller.java`：

```
octopus-cloud/*/src/main/java/**/*Controller.java
```

对每个 Controller 提取：

| 信息 | 来源 |
|---|---|
| 模块基础路径 | 类上的 `@RequestMapping` |
| 接口方法 | `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` / `@PatchMapping` |
| 接口描述 | `@Operation(summary = "...")`（项目约定以 `[PC]` / `[APP]` / `[H5]` 开头标注调用端，原样保留进注释，并据此选用对应端的 token） |
| 请求体类型 | `@RequestBody XxxDTO` |
| Query 参数 | `@RequestParam` / `@Valid XxxQueryDTO` （不含 `@RequestBody`）|
| 路径参数 | `@PathVariable` |

### Step 3 — 解析 DTO 字段

对每个 `@RequestBody` 的 DTO 类，用 Grep/Read 找到它的 Java 文件，提取字段：

- `private String fieldName;` → 生成 `"fieldName": ""`
- `private Long fieldName;` → 生成 `"fieldName": 0`
- `private Boolean fieldName;` → 生成 `"fieldName": true`
- `private List<XxxDTO> items;` → 生成 `"items": [{}]`
- 带 `@NotBlank` / `@NotNull` 的字段在注释中标注 `// required`

对 Query 参数 DTO，提取字段生成 `?key=value` 形式。

### Step 4 — 生成 .http 文件

**输出目录**：`octopus-cloud/<模块名>/tests/http/<ControllerName>.http`

**文件格式**参考 `references/http-format.md`。

核心规则：
- 文件顶部声明变量（`@baseUrl`、`@token`），从 `http-client.env.json` 读取
- 每个接口一个 `###` 分隔块
- 需要认证的接口加 `Authorization: Bearer {{token}}`
- Auth 类接口（login/captcha/register）不加 Authorization header
- `@tag.name` 作为分组注释

### Step 5 — 生成环境文件

若目录中没有 `http-client.env.json`，同时生成：

```json
{
  "dev": {
    "baseUrl": "http://localhost:18084",
    "token": ""
  }
}
```

端口从 `application.yml` 的 `server.port` 读取。

### Step 6 — 输出结果

告知用户生成了哪些文件，并展示 Auth Controller 的片段作为预览。

---

## 注意事项

- `PageRequest` Query 参数固定生成 `?pageNum=1&pageSize=10`
- `@PathVariable String id` 生成占位符 `{{id}}`，并在文件顶部声明 `@id = 1`
- 若字段是枚举类型，尝试读取枚举类提取可选值，写入注释
- 认证判断：Controller 类上有 `@IgnoreTenant` 或路径含 `/auth/` 视为免 Token（但 logout/me 仍需 Token）
- 鉴权注解：挂 `@RequiresCapability`（后台）或 `@ConsumerApi`（C 端，需 C 端用户 token）的都要带 Token；只挂 `@Audited` 不代表需要权限。无参 `@RequiresCapability` 接口用超管 token 永远通过，冒烟测权限时要用只勾了对应能力的非超管 token
- 免 Token 接口：`/auth/captcha`、`/auth/login`、`/auth/register`、`/auth/login/sms`、`/auth/sms/send`

---

## 附加资源

- **`references/http-format.md`** — .http 文件完整格式规范与示例
