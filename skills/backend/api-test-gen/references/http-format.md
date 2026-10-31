# IntelliJ HTTP Client .http 文件格式规范

## 文件结构

```
### 文件头：变量声明
@baseUrl = {{baseUrl}}
@token = {{token}}

### 分组注释（来自 @Tag name）

# ──────────────────────────────────────────
# 接口名称（来自 @Operation summary）
# ──────────────────────────────────────────

### GET 请求示例
GET {{baseUrl}}/system-core/v1/user/page?pageNum=1&pageSize=10
Authorization: {{token}}
Content-Type: application/json

### POST 请求示例（带 RequestBody）
POST {{baseUrl}}/system-core/v1/user/create
Authorization: {{token}}
Content-Type: application/json

{
  "username": "",       // required
  "password": "",       // required
  "nickname": "",
  "email": "",
  "phone": ""
}

### PUT 请求示例（带路径参数）
# @id = 1
PUT {{baseUrl}}/system-core/v1/user/{{id}}
Authorization: {{token}}
Content-Type: application/json

{
  "nickname": ""
}

### DELETE 请求示例
DELETE {{baseUrl}}/system-core/v1/user/{{id}}
Authorization: {{token}}
```

---

## 完整示例：AuthController.http

```http
@baseUrl = {{baseUrl}}
@token = {{token}}

# ══════════════════════════════════════════
# 认证（注册 / 登录 / 登出 / 当前用户信息）
# ══════════════════════════════════════════

### 获取验证码
GET {{baseUrl}}/system-core/v1/auth/captcha

###

### 登录
POST {{baseUrl}}/system-core/v1/auth/login
Content-Type: application/json

{
  "username": "admin",  // required
  "password": "123456", // required
  "captchaKey": "",     // required
  "captchaCode": ""     // required
}

###

### 注册
POST {{baseUrl}}/system-core/v1/auth/register
Content-Type: application/json

{
  "username": "",   // required
  "password": "",   // required
  "nickname": "",
  "email": "",
  "phone": ""
}

###

### 发送短信验证码
POST {{baseUrl}}/system-core/v1/auth/sms/send?phone=13800000000&scene=LOGIN

###

### 短信验证码登录
POST {{baseUrl}}/system-core/v1/auth/login/sms
Content-Type: application/json

{
  "phone": "",  // required
  "code": ""    // required
}

###

### 登出
POST {{baseUrl}}/system-core/v1/auth/logout
Authorization: {{token}}

###

### 当前用户信息
GET {{baseUrl}}/system-core/v1/auth/me
Authorization: {{token}}

###

### 可切换的租户列表
GET {{baseUrl}}/system-core/v1/auth/tenants
Authorization: {{token}}

###

### 切换租户
POST {{baseUrl}}/system-core/v1/auth/switch/tenant
Authorization: {{token}}
Content-Type: application/json

{
  "tenantId": ""  // required
}

###

### 可切换的角色列表
GET {{baseUrl}}/system-core/v1/auth/roles
Authorization: {{token}}

###

### 切换角色
POST {{baseUrl}}/system-core/v1/auth/switch/role
Authorization: {{token}}
Content-Type: application/json

{
  "roleCode": ""  // required
}

###

### 可切换的组织列表
GET {{baseUrl}}/system-core/v1/auth/orgs
Authorization: {{token}}

###

### 切换组织
POST {{baseUrl}}/system-core/v1/auth/switch/org
Authorization: {{token}}
Content-Type: application/json

{
  "orgId": ""  // required
}

###
```

---

## 完整示例：UserController.http

```http
@baseUrl = {{baseUrl}}
@token = {{token}}
@userId = 1

# ══════════════════════════════════════════
# 用户管理
# ══════════════════════════════════════════

### 用户分页列表
GET {{baseUrl}}/system-core/v1/user/page?pageNum=1&pageSize=10&username=&nickname=&phone=&status=
Authorization: {{token}}

###

### 用户详情
GET {{baseUrl}}/system-core/v1/user/detail?id={{userId}}
Authorization: {{token}}

###

### 创建用户
POST {{baseUrl}}/system-core/v1/user/create
Authorization: {{token}}
Content-Type: application/json

{
  "username": "",   // required
  "password": "",   // required
  "nickname": "",
  "email": "",
  "phone": "",
  "orgIds": [],
  "roleIds": []
}

###

### 更新用户信息
PUT {{baseUrl}}/system-core/v1/user/update
Authorization: {{token}}
Content-Type: application/json

{
  "id": "",         // required
  "nickname": "",
  "email": "",
  "phone": "",
  "orgIds": [],
  "roleIds": []
}

###

### 重置密码
POST {{baseUrl}}/system-core/v1/user/reset-password
Authorization: {{token}}
Content-Type: application/json

{
  "id": "",           // required
  "newPassword": ""   // required
}

###

### 启用/禁用用户
POST {{baseUrl}}/system-core/v1/user/toggle-status?id={{userId}}&enabled=true
Authorization: {{token}}

###
```

---

## http-client.env.json 格式

放在 `tests/http/` 同级或父目录：

```json
{
  "dev": {
    "baseUrl": "http://localhost:18084",
    "token": ""
  },
  "test": {
    "baseUrl": "http://test.example.com",
    "token": ""
  }
}
```

IntelliJ 在运行 .http 文件时会弹出环境选择器，选择 `dev` 后 `{{baseUrl}}` 自动替换。

---

## 常见 HTTP 方法映射

| Spring 注解 | HTTP 方法 |
|---|---|
| `@GetMapping` | `GET` |
| `@PostMapping` | `POST` |
| `@PutMapping` | `PUT` |
| `@DeleteMapping` | `DELETE` |
| `@PatchMapping` | `PATCH` |

## Java 类型 → JSON 值映射

| Java 类型 | JSON 示例值 |
|---|---|
| `String` | `""` |
| `Long` / `Integer` / `int` | `0` |
| `Boolean` / `boolean` | `true` |
| `BigDecimal` | `0.00` |
| `List<T>` | `[]` |
| `LocalDate` | `"2026-01-01"` |
| `LocalDateTime` | `"2026-01-01T00:00:00"` |
| 枚举类型 | `""` (注释列出可选值) |
| 嵌套 DTO | `{}` |
