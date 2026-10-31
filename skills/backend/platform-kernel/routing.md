# Channel Routing (kernel-routing-starter)

routing-starter 定义多渠道、多平台业务路由的**接口契约**（不含业务实现）。

---

## 组件清单

| 组件 | 路径 | 职责 |
|------|------|------|
| `SalesChannel` | `routing/enums/SalesChannel.java` | 销售渠道枚举：LIVE_ROOM / OFFLINE_STORE / TOC_MALL / AGENCY |
| `PlatformCode` | `routing/enums/PlatformCode.java` | 平台编码枚举：WECHAT_LIVE / DOUYIN_LIVE / SELF_MALL / POS / ERP_IMPORT |
| `BizContext` | `routing/model/BizContext.java` | 统一业务上下文：bizDocId, salesChannel, platformCode, bizScene, attrs |
| `ChannelAdapter<RQ,CTX>` | `routing/adapter/ChannelAdapter.java` | 请求适配接口，将外部请求转为 BizContext |
| `FlowBindingService` | `routing/flow/FlowBindingService.java` | 流程绑定接口，根据路由组合解析 LiteFlow chainId |
| `TraceConstants` | `routing/trace/TraceConstants.java` | MDC 常量：`traceId` / `spanId` |

---

## 核心接口

### ChannelAdapter<RQ, CTX>

```java
public interface ChannelAdapter<RQ, CTX> {
    SalesChannel supportChannel();
    PlatformCode supportPlatform();
    String supportBizScene();
    CTX adapt(RQ request);
}
```

### FlowBindingService

```java
public interface FlowBindingService {
    String resolveChainId(SalesChannel channel, PlatformCode platform, String bizScene);
}
```

---

## 使用模式

### 新增渠道适配器

```java
@Component
public class DouyinLiveAdapter implements ChannelAdapter<DouyinOrderRequest, BizContext> {
    @Override public SalesChannel supportChannel() { return SalesChannel.LIVE_ROOM; }
    @Override public PlatformCode supportPlatform() { return PlatformCode.DOUYIN_LIVE; }
    @Override public String supportBizScene() { return "standard"; }
    @Override public BizContext adapt(DouyinOrderRequest request) {
        BizContext ctx = new BizContext();
        ctx.setBizDocId(request.getOrderNo());
        ctx.setSalesChannel(SalesChannel.LIVE_ROOM);
        ctx.setPlatformCode(PlatformCode.DOUYIN_LIVE);
        return ctx;
    }
}
```

### 流程绑定

```java
@Component
public class OutboundFlowBinding implements FlowBindingService {
    @Override
    public String resolveChainId(SalesChannel channel, PlatformCode platform, String bizScene) {
        if (channel == SalesChannel.LIVE_ROOM) return "live_outbound_chain";
        return "standard_outbound_chain";
    }
}
```

---

## 扩展新渠道/平台

1. 在 `SalesChannel` / `PlatformCode` 枚举新增值
2. 实现对应的 `ChannelAdapter`
3. 在 `FlowBindingService` 实现中补充路由规则

---

## 注意事项

- 纯契约模块，无 auto-configuration，无 Spring Bean
- 路由优先级：Sales Channel 优先，Platform 其次
- `BizContext` 同时被 action-starter 的 `ActionContext` 引用
- `TraceConstants` MDC key 与 OTel Agent 自动注入对齐，自定义 X-Trace-Id header 已废弃
