# JUnit 5 + MockMvc Controller 单元测试模板

本文档提供生成 Controller 层单元测试的代码骨架与可复用片段。所有示例假设使用项目中的 `R<T>` 统一响应包装。

---

## 通用骨架

```java
package {与源 Controller 相同的包};

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("{ControllerName} 单元测试")
class {ControllerName}Test {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 依赖字段（根据 Controller 构造器参数）
    private {AppServiceType} {appServiceName};

    // 被测对象
    private {ControllerName} controller;

    @BeforeEach
    void setUp() {
        {appServiceName} = mock({AppServiceType}.class);
        controller = new {ControllerName}({appServiceName});
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    // === 接口用例在下方 ===
}
```

---

## Happy Path 片段（POST + @RequestBody）

```java
@Test
@DisplayName("POST /path — 正常提交返回 200")
void submit_shouldReturnOk_whenRequestValid() throws Exception {
    // given
    {DtoType} dto = new {DtoType}();
    dto.setField1("x");
    dto.setField2(1L);
    when({appServiceName}.{method}(any())).thenReturn("AGREEMENT-001");

    // when / then
    mockMvc.perform(post("/system-core/v1/app/onboarding/submit")
                    .param("cooperationType", "DISTRIBUTION")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data").value("AGREEMENT-001"));

    verify({appServiceName}).{method}(any());
}
```

---

## Happy Path 片段（GET + @RequestParam）

```java
@Test
@DisplayName("GET /drafts — 返回当前登录组织的草稿列表")
void listDrafts_shouldReturnList_whenCalled() throws Exception {
    when({appServiceName}.listDraftsByOrg(any(), any()))
            .thenReturn(java.util.Collections.emptyList());

    mockMvc.perform(get("/system-core/v1/app/onboarding/drafts")
                    .param("cooperationType", "DISTRIBUTION"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data").isArray());
}
```

---

## Happy Path 片段（GET + @PathVariable）

```java
@Test
void detail_shouldReturnStore_whenIdValid() throws Exception {
    StoreDetailResponseDTO resp = new StoreDetailResponseDTO();
    resp.setId(1L);
    when({appServiceName}.detail(eq(1L))).thenReturn(resp);

    mockMvc.perform(get("/system-core/v1/store/{id}", 1L))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(1));
}
```

---

## 业务异常片段

```java
@Test
void submit_shouldReturnBizError_whenAppServiceThrows() throws Exception {
    when({appServiceName}.submitDraftByOrg(any(), any()))
            .thenThrow(com.lengfeng.platform.kernel.web.exception.BizException.of("草稿不完整"));

    mockMvc.perform(post("/system-core/v1/app/onboarding/submit")
                    .param("draftId", "123"))
            .andExpect(status().is4xxClientError().match(mvcResult -> {}));
    // 注：若模块存在全局 @RestControllerAdvice 将 BizException 转成 200 + code != 0，
    // 则断言改为 .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.not(0)));
}
```

---

## AuthContext 静态 Mock 片段

当 Controller 调用 `AuthContext.getLoginId()` / `AuthContext.getLoginUser()` 时：

```java
import com.lengfeng.platform.kernel.web.auth.AuthContext;
import com.lengfeng.platform.kernel.web.auth.LoginUserInfo;
import org.mockito.MockedStatic;

@Test
void submit_shouldWork_whenAuthContextStubbed() throws Exception {
    LoginUserInfo login = new LoginUserInfo();
    login.setPrimaryOrgId("1001");

    try (MockedStatic<AuthContext> mocked = org.mockito.Mockito.mockStatic(AuthContext.class)) {
        mocked.when(AuthContext::getLoginUser).thenReturn(login);
        mocked.when(AuthContext::getLoginId).thenReturn("user-1");
        when({appServiceName}.submitDraftByOrg(eq(1001L), eq("draft-1")))
                .thenReturn("AG-1");

        mockMvc.perform(post("/system-core/v1/app/onboarding/submit")
                        .param("draftId", "draft-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("AG-1"));
    }
}
```

---

## 启用 Bean Validation（@Valid）

```java
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

@BeforeEach
void setUp() {
    {appServiceName} = mock({AppServiceType}.class);
    controller = new {ControllerName}({appServiceName});

    LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
    validator.afterPropertiesSet();

    mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setValidator(validator)
            .build();
}

@Test
void draft_shouldReturn4xx_whenRequiredFieldMissing() throws Exception {
    {DtoType} dto = new {DtoType}(); // 未填必填字段

    mockMvc.perform(post("/system-core/v1/app/onboarding/draft")
                    .param("cooperationType", "DISTRIBUTION")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isBadRequest());
}
```

---

## 命名 & 组织规范

- **类名**：`{ControllerName}Test`（对应源类放在相同包下的 `src/test/java`）。
- **方法名**：`{endpointMethod}_should{Behavior}_when{Condition}` 英文驼峰。
- **`@DisplayName`**：可用中文描述。
- **断言风格**：统一用 `MockMvcResultMatchers.jsonPath` + `status()`，避免混用 `assertThat(result.getResponse()...)`。
- **Arrange-Act-Assert** 三段式，使用 `// given`、`// when / then` 注释分隔。
- **禁止**：`Thread.sleep`、真实数据库连接、`@SpringBootTest`。
