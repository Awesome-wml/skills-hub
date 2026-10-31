# domain-index.yaml 格式规约

`domain-index.yaml` 是**每个项目本地**的领域索引，spec authoring 流程读取本文件自动注入领域不变量、扩展点白名单、默问清单。

本文件只定义**格式/schema**；具体值由各项目维护，位于当前项目仓库的 `docs/superpowers/domain-index.yaml`。首个实现样本见 `octopus-cloud/docs/superpowers/domain-index.yaml`。

---

## 顶层结构

```yaml
version: 2                              # schema 版本，当前为 2
last_updated: YYYY-MM-DD                # 最近维护日期
infrastructure_facts:                   # 顶层横切事实（可选）
  references: [...]
  facts: [...]
  global_invariants: [...]
domains:                                # 业务域字典（必填，至少 1 个域）
  <domain-name>:
    ...
```

## `infrastructure_facts`（可选）

横切基础设施事实，不属于任何业务域。spec authoring 时按 `applies_when` 条件按需注入。

```yaml
infrastructure_facts:
  references:                           # 相关基线文档路径列表（相对项目根）
    - <path>
  facts:
    - id: <kebab-case-id>               # 事实唯一 id
      summary: |                        # 事实内容（多行）
        <描述>
      applies_when: <触发条件>          # 何时注入到 spec（一句话描述）
  global_invariants:                    # 全局不变量（所有 spec 都必须遵守）
    - "<一条不变量>"
```

## `domains.<domain-name>`

每个业务域一个顶层 key。`<domain-name>` 使用 kebab-case 或单词，被 spec frontmatter 的 `domains_touched` 引用。

```yaml
domains:
  <domain-name>:
    summary: |                          # [必填] 域职责描述（多行）
      <一段话说明本域做什么、核心组件>
    baselines:                          # [必填] 基线文档路径列表
      - <path>                          # 可以是项目内路径，也可以是 ../scaffold/... 等相对路径
    app_services:                       # [建议] 本域 AppService 类全限定名列表
      - <FQCN>
    controllers:                        # [可选] 本域 Controller 类全限定名
      - <FQCN>
    repositories:                       # [可选] 本域 Repository 类全限定名
      - <FQCN>
    domain_events:                      # [建议] 本域发布的 domain event 名列表
      - <EventName>
    extension_points:                   # [建议] 本域可挂载的扩展点（SPI）名列表
      - <SpiName>
    extension_point_implementations:    # [可选] 已有扩展点实现映射
      <SpiName>:
        - <实现类 FQCN>
    common_invariants:                  # [必填] 本域必须遵守的不变量清单
      - "<一条不变量>"                  # spec lint L4 会校验：spec 必须逐条出现这些不变量
    confirm_prompts:                    # [建议] 本域默问清单
      - "@PM确认 <业务问题>"
      - "@架构确认 <架构问题>"
```

### 字段必填性总结

| 字段 | 必填 | 说明 |
|---|---|---|
| `summary` | ✅ | 域的职责描述 |
| `baselines` | ✅ | 至少 1 份基线文档路径 |
| `common_invariants` | ✅ | 至少 1 条；spec lint L4 强校验 |
| `app_services` | 建议 | spec 步骤 2 锚点匹配用 |
| `domain_events` | 建议 | spec §4 事件契约参考 |
| `extension_points` | 建议 | spec lint L5 白名单校验 |
| `confirm_prompts` | 建议 | spec 步骤 5 默问注入 |
| `controllers` / `repositories` / `extension_point_implementations` | 可选 | 便于影响面爬取 |

---

## 不变量分类约定

`common_invariants` 每条应当是**一句陈述句**，表达"必须 / 禁止 / 只有在 X 情况下才能 Y"。典型形态：

- **状态机约束**：`"<状态A> 状态不允许转回 <状态B>"`
- **两阶段约束**：`"<操作> 必须两阶段：acquire 阶段 X，confirm 阶段 Y"`
- **幂等约束**：`"<回调/事件> 必须幂等：重复触发 = 无副作用"`
- **复用约束**：`"退款链路必须复用 <SPI>.refund(...)，禁止绕过 kernel"`
- **数据边界约束**：`"<表> 必须在 <时刻> 前落库，<操作> 时按 <key> 精确匹配"`
- **依赖约束**：`"修改 <SPI> 签名时必须同步检查所有 implementations"`

**不要写成**："设计应该考虑 X" / "建议 Y" —— 这不是不变量，是建议，放 baseline 文档里。

---

## 扩展点语法

`extension_points` 列出的每个名字必须满足：

1. 是一个真实的 SPI 接口或策略接口类名（短名即可）
2. 在 `extension_point_implementations.<SpiName>` 下可选列出已有实现 FQCN
3. spec 中「9. 挂载扩展点」只能从本字段白名单中选；白名单外 = 新增扩展点，必须走 `@架构确认`

---

## 版本演进

本 schema 当前为 v2。未来新增字段遵循：

- **新增可选字段** → version 不升（向后兼容）
- **新增必填字段 / 重命名字段** → version +1，各项目需迁移

schema 修订历史记录在 skill README 或本文件末尾。

---

## 维护时机（对应 guide §4）

| 事件 | 更新内容 |
|---|---|
| 新增域 / 拆分域 | 新增 `domains.<name>` 节点，至少填 `baselines` + `common_invariants` |
| 新增 AppService / 扩展点 / domain event | 对应数组追加 |
| Review 红色 spec 确立新规则 | `common_invariants` / `confirm_prompts` 追加，并把对应 baseline 文档路径加入 `baselines` |
| baseline 文档移动 / 改名 | `baselines` 路径同步 |
