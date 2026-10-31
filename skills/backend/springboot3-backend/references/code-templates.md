# Platform Kernel 代码模板

> 所有模板基于 `generated-platform05/system-core` 实现。替换 `Xxx/xxx/资源` 为实际业务名。

---

## 1. PO（持久化对象）

```java
package cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.lengfeng.platform.kernel.infra.persistence.BasePO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_xxx")
public class XxxPO extends BasePO {

    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    private String bizNo;

    /** 状态码（枚举 .code()） */
    private String status;

    /** 逻辑删除（BasePO 已内置 deleted 字段） */
}
```

---

## 2. 请求 DTO

```java
package cn.org.lengfenghl.laowang.{domain}.core.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateXxxDTO {

    @NotBlank(message = "幂等键不能为空")
    private String idempotencyKey;

    @NotBlank(message = "业务单号不能为空")
    private String bizNo;

    // ... 业务字段
}
```

---

## 3. 响应 DTO（含字典翻译）

```java
package cn.org.lengfenghl.laowang.{domain}.core.api.dto;

import com.fhs.trans.service.impl.TransType;
import com.fhs.trans.vo.anno.Trans;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class XxxResponseDTO {

    private String id;

    /** 状态码（枚举 .code() 赋值，easy-trans 自动生成 statusLabel） */
    @Trans(type = TransType.DICTIONARY, key = "xxx_status", ref = "statusLabel")
    private String status;

    private String statusLabel;  // 由 easy-trans 自动填充
}
```

---

## 4. Command（应用层命令）

```java
package cn.org.lengfenghl.laowang.{domain}.core.application.command;

import lombok.Data;

@Data
public class CreateXxxCommand {

    /** 幂等键（必填，由调用方保证唯一性） */
    private String idempotencyKey;

    /** 操作人 ID */
    private String operatorId;

    private String bizNo;

    // ... 业务字段
}
```

---

## 5. Assembler（MapStruct DTO → Command）

```java
package cn.org.lengfenghl.laowang.{domain}.core.application.assembler;

import cn.org.lengfenghl.laowang.{domain}.core.api.dto.CreateXxxDTO;
import cn.org.lengfenghl.laowang.{domain}.core.application.command.CreateXxxCommand;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface XxxAssembler {

    CreateXxxCommand toCommand(CreateXxxDTO dto);
}
```

---

## 6. 聚合根（Domain Model）

```java
package cn.org.lengfenghl.laowang.{domain}.core.domain.model;

import com.lengfeng.platform.kernel.dict.enums.OrderStatus;
import lombok.Getter;

import java.util.UUID;

@Getter
public class Xxx {

    private String id;
    private String bizNo;
    private XxxStatus status;   // 业务枚举，对外用 .code()

    /** 工厂方法：新建 */
    public static Xxx create(String bizNo) {
        Xxx e = new Xxx();
        e.id = UUID.randomUUID().toString().replace("-", "");
        e.bizNo = bizNo;
        e.status = XxxStatus.PENDING;
        return e;
    }

    /** 工厂方法：从持久层恢复 */
    public static Xxx restore(String id, String bizNo, String statusCode) {
        Xxx e = new Xxx();
        e.id = id;
        e.bizNo = bizNo;
        e.status = XxxStatus.fromCode(statusCode);
        return e;
    }

    /** 业务方法 */
    public void cancel() {
        if (this.status != XxxStatus.PENDING) {
            throw BizException.invalidStatus(this.status.code(), XxxStatus.CANCELLED.code());
        }
        this.status = XxxStatus.CANCELLED;
    }
}
```

---

## 7. Domain Query Object（领域查询参数）

> **【强制】**当查询参数超过 2 个时，必须定义此对象。  
> 位于 `domain/model/query/` 包下，**禁止** import 任何 `api.dto` 包的类。  
> AppService 调用 Repository 时将 DTO/RequestParam 映射为此对象，领域层对 API 层完全透明。

```java
package cn.org.lengfenghl.laowang.{domain}.core.domain.model.query;

import lombok.Builder;
import lombok.Getter;

/**
 * Xxx 领域查询参数——只使用基础类型，禁止引用 api.dto 包。
 */
@Getter
@Builder
public class XxxQuery {

    private final int pageNum;
    private final int pageSize;

    /** 状态过滤（枚举 code 字符串，null = 不过滤） */
    private final String status;

    /** 业务单号（模糊匹配，null = 不过滤） */
    private final String bizNo;

}
```

---

## 8. Repository 接口

> **【强制】接口方法参数只允许使用基础类型或 `domain.model.query.*` 类型，禁止引入 `api.dto.*`。**  
> 依赖方向必须是 api → application → domain，反向依赖会导致领域层无法独立演进。

```java
package cn.org.lengfenghl.laowang.{domain}.core.domain.repository;

import cn.org.lengfenghl.laowang.{domain}.core.domain.model.Xxx;
import cn.org.lengfenghl.laowang.{domain}.core.domain.model.query.XxxQuery;
import com.lengfeng.platform.kernel.web.response.PageData;

public interface XxxRepository {

    Xxx byId(String id);

    void save(Xxx entity);

    boolean existsByIdempotencyKey(String idempotencyKey);

    /** 分页查询——参数通过领域查询对象传递，不依赖 API DTO */
    PageData<Xxx> queryPage(XxxQuery query);
}
```

---

## 9. Mapper 接口 & XML

> **【强制】单表用 MyBatis-Plus，多表用 XML**（约束新增代码，老代码不强制改）：
> - **单表**（按 ID、条件列表、单表分页、计数、幂等键检查、写操作）：`selectById` / `selectOne` / `selectList` / `selectPage` / `selectCount` / `insert` / `updateById` + `LambdaQueryWrapper`，写在 RepositoryImpl 里；**不写 `@Select`，也不为单表另写 XML**。
> - **多表**（JOIN、子查询、复杂聚合）：**必须**写在 `src/main/resources/mapper/XxxMapper.xml`；**禁止 `@Select` 注解版**（含 `<script>` 写法）。
> - **返回值不用 `Map<String, Object>`**：定义具体 VO（可作为 mapper 接口的 `public static` 内部类）。

### 开发者必读：新增模块时你需要写哪些 SQL

| 场景 | 写法 | 说明 |
|---|---|---|
| 按 ID 查单条 / 新增 / 修改 | MP 内置 | `selectById` / `insert` / `updateById` |
| 单表分页列表（含过滤条件） | MP 内置 | `selectPage(new Page<>(..), LambdaQueryWrapper)`，分页插件处理 COUNT/LIMIT |
| 单表全量列表（下拉、树） | MP 内置 | `selectList(LambdaQueryWrapper)` |
| 幂等键检查 | MP 内置 | `selectCount(wrapper.eq(Xxx::getIdempotencyKey, key)) > 0` |
| 多表查询 / 多表分页（含 JOIN） | **必须写 XML** | 按需命名，返回具体 VO；分页只写 WHERE + ORDER BY，分页插件接管 COUNT/LIMIT |

**写 XML 前先想清楚三件事：**
1. **SELECT 字段**：VO 需要展示哪些字段？关联表的字段（xxxName、xxxCode）？→ 写进 SELECT 子句并在 VO 中体现
2. **WHERE 条件**：哪些字段是精准匹配（`=`）？哪些是模糊匹配（`LIKE`）？哪些是范围（`BETWEEN`）？→ 逐个写 `<if>` 块
3. **ORDER BY**：默认排序是什么？业务有没有自定义排序需求？→ 写在 SQL 末尾

### Mapper 接口

```java
package cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.mapper;

import cn.org.lengfenghl.laowang.{domain}.core.domain.model.query.XxxQuery;
import cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.po.XxxPO;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface XxxMapper extends BaseMapper<XxxPO> {

    /** 多表分页（JOIN 组织表），SQL 在 XxxMapper.xml；分页插件自动注入 COUNT + LIMIT */
    Page<XxxWithOrgRow> selectPageWithOrg(Page<XxxWithOrgRow> page, @Param("query") XxxQuery query);

    /** 多表查询结果行：具体类型，不用 Map<String, Object> */
    @Data
    class XxxWithOrgRow {
        private Long id;
        private String bizNo;
        private String status;
        private String orgName;
    }
}
```

### Mapper XML（仅多表查询）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.mapper.XxxMapper">

    <!--
        分页插件自动处理 COUNT 和 LIMIT/OFFSET，这里只写业务过滤条件。
        禁止在 XML 中手写 LIMIT/OFFSET。
        WHERE 条件必须用 <where> 标签，不得裸写 WHERE ... AND。
    -->
    <select id="selectPageWithOrg"
            resultType="cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.mapper.XxxMapper$XxxWithOrgRow">
        SELECT x.id, x.biz_no, x.status, o.name AS org_name
        FROM t_xxx x
        LEFT JOIN t_org o ON o.id = x.org_id AND o.deleted = 0
        <where>
            x.deleted = 0
            <if test="query.status != null and query.status != ''">
                AND x.status = #{query.status}
            </if>
            <if test="query.bizNo != null and query.bizNo != ''">
                AND x.biz_no LIKE CONCAT('%', #{query.bizNo}, '%')
            </if>
        </where>
        ORDER BY x.created_at DESC
    </select>

</mapper>
```

---

## 10. InMemory Repository（默认实现，本地开发用）

```java
package cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.repository;

import cn.org.lengfenghl.laowang.{domain}.core.domain.model.Xxx;
import cn.org.lengfenghl.laowang.{domain}.core.domain.model.query.XxxQuery;
import cn.org.lengfenghl.laowang.{domain}.core.domain.repository.XxxRepository;
import com.lengfeng.platform.kernel.web.response.PageData;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
@ConditionalOnMissingBean(name = "xxxRepositoryMybatisImpl")
public class InMemoryXxxRepository implements XxxRepository {

    private final Map<String, Xxx> store = new ConcurrentHashMap<>();
    private final Set<String> idempotencyKeys = Collections.synchronizedSet(new HashSet<>());

    @Override
    public Xxx byId(String id) { return store.get(id); }

    @Override
    public void save(Xxx entity) { store.put(entity.getId(), entity); }

    @Override
    public boolean existsByIdempotencyKey(String key) {
        return !idempotencyKeys.add(key);
    }

    @Override
    public PageData<Xxx> queryPage(XxxQuery query) {
        List<Xxx> list = store.values().stream()
                .filter(e -> query.getStatus() == null || query.getStatus().equals(e.getStatus().code()))
                .filter(e -> query.getBizNo() == null || e.getBizNo().contains(query.getBizNo()))
                .toList();
        int from = (query.getPageNum() - 1) * query.getPageSize();
        int to = Math.min(from + query.getPageSize(), list.size());
        return PageData.of(list.subList(Math.min(from, list.size()), to),
                list.size(), query.getPageNum(), query.getPageSize());
    }
}
```

---

## 11. MyBatisImpl Repository（生产实现）

> **【强制】这是唯一允许出现 Mapper 和 PO 的地方。**  
> AppService / Action 中严禁注入 Mapper；Controller 中严禁注入 Mapper 或 Repository。  
> PO→Domain 的重建（restore）在此层完成，保证领域对象不被持久化细节污染。  
> **单表条件用 `LambdaQueryWrapper`（lambda 方法引用，禁止字符串字段名），多表查询调用 Mapper XML 方法。**

```java
package cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.repository;

import cn.org.lengfenghl.laowang.{domain}.core.domain.model.Xxx;
import cn.org.lengfenghl.laowang.{domain}.core.domain.model.query.XxxQuery;
import cn.org.lengfenghl.laowang.{domain}.core.domain.repository.XxxRepository;
import cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.mapper.XxxMapper;
import cn.org.lengfenghl.laowang.{domain}.core.infrastructure.persistence.po.XxxPO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lengfeng.platform.kernel.web.response.PageData;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.util.StringUtils;
import org.springframework.stereotype.Repository;

import java.util.List;

@Primary
@Repository("xxxRepositoryMybatisImpl")
@RequiredArgsConstructor
public class XxxRepositoryMybatisImpl implements XxxRepository {

    private final XxxMapper xxxMapper;

    @Override
    public Xxx byId(String id) {
        XxxPO po = xxxMapper.selectById(id);
        if (po == null) return null;
        return toDomain(po);
    }

    @Override
    public void save(Xxx entity) {
        XxxPO existing = xxxMapper.selectById(entity.getId());
        if (existing == null) {
            xxxMapper.insert(toPO(entity));
        } else {
            xxxMapper.updateById(toPO(entity));
        }
    }

    @Override
    public boolean existsByIdempotencyKey(String key) {
        return xxxMapper.selectCount(Wrappers.<XxxPO>lambdaQuery()
                .eq(XxxPO::getIdempotencyKey, key)
                .eq(XxxPO::getDeleted, 0)) > 0;
    }

    @Override
    public PageData<Xxx> queryPage(XxxQuery query) {
        // 单表分页：selectPage + LambdaQueryWrapper，分页插件自动处理 COUNT + LIMIT
        LambdaQueryWrapper<XxxPO> wrapper = Wrappers.<XxxPO>lambdaQuery()
                .eq(XxxPO::getDeleted, 0)
                .eq(StringUtils.hasText(query.getStatus()), XxxPO::getStatus, query.getStatus())
                .like(StringUtils.hasText(query.getBizNo()), XxxPO::getBizNo, query.getBizNo())
                .orderByDesc(XxxPO::getCreatedAt);
        Page<XxxPO> page = xxxMapper.selectPage(
                new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Xxx> list = page.getRecords().stream().map(this::toDomain).toList();
        return PageData.of(list, page.getTotal(), query.getPageNum(), query.getPageSize());
    }

    // ── 私有转换方法：PO ↔ Domain，只在本类使用 ──

    private Xxx toDomain(XxxPO po) {
        return Xxx.restore(po.getId(), po.getBizNo(), po.getStatus());
    }

    private XxxPO toPO(Xxx entity) {
        XxxPO po = new XxxPO();
        po.setId(entity.getId());
        po.setBizNo(entity.getBizNo());
        po.setStatus(entity.getStatus().code());
        return po;
    }
}
```

---

## 11. TradeAction（写操作原子单元）

```java
package cn.org.lengfenghl.laowang.{domain}.core.application.action;

import cn.org.lengfenghl.laowang.{domain}.core.domain.model.Xxx;
import cn.org.lengfenghl.laowang.{domain}.core.domain.repository.XxxRepository;
import com.lengfeng.platform.kernel.action.ActionContext;
import com.lengfeng.platform.kernel.action.ActionResult;
import com.lengfeng.platform.kernel.action.TradeAction;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class CreateXxxAction implements TradeAction {

    private final XxxRepository xxxRepository;

    @Override
    public String code() { return "xxx.create"; }   // 命名：资源.动作

    @Override
    public ActionResult execute(ActionContext ctx) {
        String bizNo = (String) ctx.getParam("bizNo");

        Xxx entity = Xxx.create(bizNo);
        xxxRepository.save(entity);

        return ActionResult.ok(Map.of("entityId", entity.getId()));
    }
}
```

---

## 12. AppService（应用服务）

> **【强制】AppService 只能注入领域 Repository 接口、ActionExecutor、OutboxPublisher 及其他 AppService/领域服务。**  
> **禁止** 注入任何 MyBatis Mapper 或直接操作 PO。将 DTO/RequestParam 转为 `XxxQuery` 后传给 Repository。

```java
package cn.org.lengfenghl.laowang.{domain}.core.application.service;

import cn.org.lengfenghl.laowang.{domain}.core.api.dto.XxxResponseDTO;
import cn.org.lengfenghl.laowang.{domain}.core.application.command.CreateXxxCommand;
import cn.org.lengfenghl.laowang.{domain}.core.domain.model.Xxx;
import cn.org.lengfenghl.laowang.{domain}.core.domain.model.query.XxxQuery;
import cn.org.lengfenghl.laowang.{domain}.core.domain.repository.XxxRepository;
import cn.org.lengfenghl.laowang.common.dto.PageRequest;
import com.lengfeng.platform.kernel.action.ActionContext;
import com.lengfeng.platform.kernel.action.ActionExecutor;
import com.lengfeng.platform.kernel.action.ActionResult;
import com.lengfeng.platform.kernel.audit.Audited;
import com.lengfeng.platform.kernel.outbox.OutboxPublisher;
import com.lengfeng.platform.kernel.routing.model.BizContext;
import com.lengfeng.platform.kernel.web.response.PageData;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class XxxAppService {

    private final XxxRepository xxxRepository;
    private final ActionExecutor actionExecutor;
    private final ObjectProvider<OutboxPublisher> publisherProvider;

    /**
     * 创建——幂等 + 审计由 ActionExecutor 自动处理。
     * Service 层审计记录业务参数，Controller 层审计记录 HTTP 上下文，两层形成完整链路。
     */
    @Audited(action = "xxx.create", resource = "xxx", logParams = true)
    public String create(CreateXxxCommand cmd) {
        BizContext bizCtx = new BizContext();
        bizCtx.setBizDocId(cmd.getBizNo());

        ActionContext ctx = ActionContext.builder()
                .bizContext(bizCtx)
                .idempotencyKey(cmd.getIdempotencyKey())
                .operator(cmd.getOperatorId())
                .param("bizNo", cmd.getBizNo())
                .build();

        ActionResult result = actionExecutor.execute("xxx.create", ctx);
        if (!result.isSuccess()) throw new IllegalStateException(result.getMessage());

        String id = (String) result.getData().get("entityId");

        OutboxPublisher pub = publisherProvider.getIfAvailable();
        if (pub != null) {
            pub.publish("xxx", id, "xxx.created",
                    String.format("{\"id\":\"%s\",\"bizNo\":\"%s\"}", id, cmd.getBizNo()));
        }
        return id;
    }

    public PageData<XxxResponseDTO> queryPage(PageRequest req, String status) {
        // DTO/RequestParam → XxxQuery（领域层查询对象），此处是唯一的转换点
        XxxQuery query = XxxQuery.builder()
                .pageNum(req.getPageNum())
                .pageSize(req.getPageSize())
                .status(status)
                .build();
        PageData<Xxx> pageData = xxxRepository.queryPage(query);
        return PageData.of(
                pageData.getList().stream()
                        .map(e -> new XxxResponseDTO(e.getId(), e.getStatus().code()))
                        .toList(),
                pageData.getTotal(), pageData.getPageNum(), pageData.getPageSize());
    }

    @Audited(action = "xxx.cancel", resource = "xxx")
    public void cancel(String id) {
        Xxx entity = xxxRepository.byId(id);
        if (entity == null) throw BizException.notFound("xxx", id);
        entity.cancel();
        xxxRepository.save(entity);

        OutboxPublisher pub = publisherProvider.getIfAvailable();
        if (pub != null) pub.publish("xxx", id, "xxx.cancelled",
                String.format("{\"id\":\"%s\"}", id));
    }
}
```

---

## 13. Controller

> **【强制】HTTP 方法只允许 GET 和 POST，禁止使用 PUT / DELETE / PATCH。**  
> **【强制】禁止使用 `@PathVariable`，GET 用 `@RequestParam`，POST 用 `@RequestBody`。**  
> **【强制】Controller 只能注入 AppService 和 Assembler，禁止注入任何 Mapper / Repository / PO。**  
> Controller 内部不得出现 `LambdaQueryWrapper`、`deleted = 0`、`selectById`、PO→DTO 转换等持久化逻辑，违者视为三层短路。  
> URL 约定：`/list`（分页）、`/all`（全量）、`/detail`（详情）、`/{scene}/list`（个性化列表）、`/create`、`/update`、`/delete`。  
> **【强制】鉴权用 `@RequiresCapability`**（无参 = 按原子 → 接口配置鉴权；`@RequiresPermission` 已废弃）；`@Audited` 只审计不鉴权。C 端接口改用 `@ConsumerApi`。  
> **【强制】`@Operation(summary)` 以 `[PC]` / `[APP]` / `[H5]` 标注调用端**，多端共用写 `[PC + APP]` 并说明差异。

```java
package cn.org.lengfenghl.laowang.{domain}.core.api.controller;

import cn.org.lengfenghl.laowang.{domain}.core.api.dto.*;
import cn.org.lengfenghl.laowang.{domain}.core.application.assembler.XxxAssembler;
import cn.org.lengfenghl.laowang.{domain}.core.application.service.XxxAppService;
import cn.org.lengfenghl.laowang.common.dto.PageRequest;
import com.lengfeng.platform.kernel.audit.Audited;
import com.lengfeng.platform.kernel.authz.RequiresCapability;
import com.lengfeng.platform.kernel.web.response.PageData;
import com.lengfeng.platform.kernel.web.response.R;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Xxx 管理（PC 管理后台）")
@RestController
@RequestMapping("/{module-name}/xxx")
@RequiredArgsConstructor
public class XxxController {

    private final XxxAppService xxxAppService;
    private final XxxAssembler xxxAssembler;

    /** 分页查询：GET /{module}/xxx/list */
    @Operation(summary = "[PC] Xxx 分页查询")
    @RequiresCapability
    @GetMapping("/list")
    public R<PageData<XxxResponseDTO>> list(PageRequest req,
                                            @RequestParam(required = false) String status) {
        return R.ok(xxxAppService.queryPage(req, status));
    }

    /** 全量查询：GET /{module}/xxx/all */
    @Operation(summary = "[PC] Xxx 全量查询")
    @GetMapping("/all")
    public R<List<XxxResponseDTO>> all() {
        return R.ok(xxxAppService.queryAll());
    }

    /** 详情：GET /{module}/xxx/detail?id=xxx */
    @Operation(summary = "[PC] Xxx 详情")
    @GetMapping("/detail")
    public R<XxxResponseDTO> detail(@RequestParam String id) {
        return R.ok(xxxAppService.getById(id));
    }

    /** 新增：POST /{module}/xxx/create */
    @Operation(summary = "[PC] 新增 Xxx")
    @Audited(action = "xxx.create", resource = "xxx")
    @RequiresCapability
    @PostMapping("/create")
    public R<String> create(@Valid @RequestBody CreateXxxDTO dto) {
        return R.ok(xxxAppService.create(xxxAssembler.toCommand(dto)));
    }

    /** 修改：POST /{module}/xxx/update（body 中含 id） */
    @Operation(summary = "[PC] 修改 Xxx")
    @Audited(action = "xxx.update", resource = "xxx")
    @RequiresCapability
    @PostMapping("/update")
    public R<Void> update(@Valid @RequestBody UpdateXxxDTO dto) {
        xxxAppService.update(xxxAssembler.toUpdateCommand(dto));
        return R.ok();
    }

    /** 删除：POST /{module}/xxx/delete（body 中含 id） */
    @Operation(summary = "[PC] 删除 Xxx")
    @Audited(action = "xxx.delete", resource = "xxx")
    @RequiresCapability
    @PostMapping("/delete")
    public R<Void> delete(@Valid @RequestBody DeleteXxxDTO dto) {
        xxxAppService.delete(dto.getId());
        return R.ok();
    }

    /**
     * 个性化列表示例：GET /{module}/xxx/tree/list
     * 当同一资源需要多种展示形态（如树形、下拉等）时，在 /list 前加场景词。
     */
    @Operation(summary = "[PC] Xxx 树形列表")
    @GetMapping("/tree/list")
    public R<List<XxxTreeDTO>> treeList() {
        return R.ok(xxxAppService.queryTree());
    }
}
```

### 删除请求 DTO 示例

```java
@Data
public class DeleteXxxDTO {
    @NotBlank(message = "id 不能为空")
    private String id;

    @NotBlank(message = "幂等键不能为空")
    private String idempotencyKey;
}
```

---

## 14. Outbox 基础设施实现（infrastructure/outbox/）

```java
// OutboxEventPublisher.java（实现 OutboxPublisher，当前用日志模拟）
@Component
@RequiredArgsConstructor
public class OutboxEventPublisher implements OutboxPublisher {
    private static final Logger log = LoggerFactory.getLogger(OutboxEventPublisher.class);

    @Override
    public void publish(String aggregateType, String aggregateId, String eventType, String payload) {
        // TODO: 接入 OutboxRepository 持久化到 event_outbox 表
        log.info("[Outbox] aggregate={}/{} event={} payload={}", aggregateType, aggregateId, eventType, payload);
    }
}

// KafkaOutboxEventSender.java（实现 OutboxEventSender）
@Component
@RequiredArgsConstructor
public class KafkaOutboxEventSender implements OutboxEventSender {
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Override
    public void send(OutboxEvent event) throws Exception {
        kafkaTemplate.send(event.getEventType(), event.getAggregateId(), event.getPayload()).get();
    }
}
```

---

## 15. 认证 Controller（AuthController 模板）

```java
@Tag(name = "认证")
@RestController
@RequestMapping("/{module-name}/auth")
public class AuthController {

    @Operation(summary = "登录")
    @Audited(action = "user.login", resource = "user", logParams = false) // 不记录密码
    @PostMapping("/login")
    public R<Map<String, Object>> login(@RequestBody LoginRequestDTO dto) {
        if (dto.getLoginId() == null || dto.getLoginId().isEmpty()) {
            throw new IllegalArgumentException("loginId is required");
        }
        StpUtil.login(dto.getLoginId());
        return R.ok(Map.of(
                "loginId", dto.getLoginId(),
                "tokenName", StpUtil.getTokenName(),
                "tokenValue", StpUtil.getTokenValue()
        ));
    }

    @Operation(summary = "登出")
    @Audited(action = "user.logout", resource = "user", logParams = false)
    @PostMapping("/logout")
    public R<Void> logout() {
        StpUtil.logout();
        return R.ok();
    }
}
```
