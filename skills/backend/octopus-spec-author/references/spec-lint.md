# Spec Lint Rules (v1)

> Lint 在 spec 草稿写完后**强制执行**，未通过不得提交。当前由 AI 工具按本文档执行；后续可脚本化进 pre-commit。
>
> 执行入口：同目录 `spec-authoring-guide.md` 步骤 9。

---

## L1. Frontmatter 完整性

**必填字段**（缺一不通过）：
- `date`、`owner`、`status`、`anchors`（≥ 1 项）
- `domains_touched`（≥ 1 项）
- `new_invariant`、`new_extension_point`、`cross_domain_combo_seen_before`、`spec_color`

**字段值约束**：
- `status` ∈ {draft, reviewing, approved}
- `spec_color` ∈ {green, red}
- 三个布尔字段必须是显式 `true` / `false`，不允许省略

---

## L2. 域白名单

- `domains_touched` 中的每个值必须存在于**当前项目** `docs/superpowers/domain-index.yaml` 的 `domains.*` 列表中
- 出现未注册域 = 不通过；正确做法是先发起 domain-index PR 注册新域，再写 spec

---

## L3. 强制段落

文档必须包含以下章节（一级标题或二级标题层级，标题文本必须严格匹配）：

**上层**：
- `## 上层 · 领域契约`
- `### 1. 业务背景`
- `### 2. 涉及域与不变量`
- `### 3. 状态机变更`
- `### 4. 事件契约`
- `### 5. 数据边界`
- `### 6. 风险与确认项`

**下层**：
- `## 下层 · 施工清单`
- `### 7. 影响模块`
- `### 8. 改动文件清单`
- `### 9. 挂载扩展点`
- `### 10. 新增 / 修改 AppService`
- `### 11. 数据库变更`
- `### 12. 测试要点`

**汇总**：
- `## @确认清单（自动汇总）`

任一段落缺失 = 不通过。**段落允许内容为"无"或"不适用 + 理由"，但段落标题必须存在**。

---

## L4. 不变量注入完整性

「2. 涉及域与不变量」中的不变量列表必须满足：

```
列表 ⊇ ⋃ (domain-index.yaml.domains[d].common_invariants for d in domains_touched)
```

即：所有 `domains_touched` 域的 `common_invariants` 并集必须**全部出现**在不变量 checklist 中。

允许的偏差：
- 某条不变量被标注为"不适用：<理由>" 时，必须同时存在对应的 `@架构确认 #N`
- 缺条 = 不通过

---

## L5. 扩展点白名单

「9. 挂载扩展点」中列出的每个扩展点名称必须满足：

```
扩展点 ∈ ⋃ (domain-index.yaml.domains[d].extension_points for d in domains_touched)
```

不在白名单中的扩展点 = 必须同时满足：
- 标注 `（新增）`
- frontmatter `new_extension_point: true`
- 对应有一条 `@架构确认 是否需要新增此扩展点：<名称>`

三者缺一 = 不通过。

---

## L6. `@确认` 标签闭环

- 文中所有出现 `@PM确认 #N` / `@架构确认 #N` 的标签，必须在文末「@确认清单」中**逐一出现**（按编号匹配）
- 「@确认清单」中的每一项不能凭空出现，必须能在正文中找到来源
- `status: approved` 时，所有标签前的 checkbox 必须为 `[x]`

---

## L7. 自评单调性

frontmatter 修订时：
- 允许从 `green` 改为 `red`（开发主动升级 review 等级）
- **不允许**从 `red` 改为 `green`，除非满足以下全部：
  - PR 描述中显式说明降级理由
  - reviewer 显式同意降级（在 PR 评论中确认）

工具执行 lint 时无法验证 PR 评论，但发现 `git log` 中本文件历史出现 `red → green` 翻转 = 必须打印警告，要求人工核对。

---

## L8. 红色 spec 路由

- frontmatter `spec_color: red` 时，PR 必须把架构师列为 reviewer
- frontmatter `spec_color: green` 时，可以走同级互审

工具执行 lint 时如能访问 PR 元数据，校验 reviewer；不能访问时，打印提醒。

---

## L9. 关联引用真实性

- frontmatter `related_specs` 中列出的所有路径必须在仓库中真实存在
- `domain-index.yaml.domains[d].baselines` 中的所有路径必须真实存在（这是对 index 的 lint，不是对 spec 的 lint，但 spec 写作时如果引用了某 baseline，要顺便核验）

---

## L14. `@确认` 回填来源（软规则，仅警告）

`status: approved` 时，每条 `@确认` 在「@确认清单」中应当包含**答复来源信息之一**：
- 答复人姓名 + 日期（方式 A）
- 关联 issue / PR 评论链接（方式 B）
- 主表 record 链接（方式 C，由 `octopus-confirm-sync` 自动回填）

任一不缺 = 通过。全部缺 = 打印警告（不阻塞 commit），提示作者补全溯源信息。

> 这是软规则，不强制，因为团队默认回填方式由团队负责人决定（详见 spec-authoring-guide §3.4）。

---

## L15. `@PM确认` 行文纯度

`@PM确认` 的每条问题正文（不含标签本身）必须满足：

1. **零代码符号**：不得包含类名、方法名、字段名、表名、接口名、enum 常量、注解、包路径等代码标识。检测启发式：
   - 含 `#` 表明方法名（如 `XxxService#method`） = 违规
   - 含纯大写蛇形或驼峰大写开头连词（如 `PaymentStatus`、`CREATE_ORDER`、`CouponChannel`） = 违规
   - 含反引号包裹的标识符（如 `` `order_refund_flow` ``、`` `status` ``） = 违规
   - 含 SQL / Java 关键字片段（`SELECT`、`@Transactional`、`extends`、`implements`） = 违规
2. **英文最小化**：除产品通用缩写白名单（`SKU` / `SPU` / `VIP` / `APP` / `PV` / `UV` / `ID` / `URL` / `OCR` / `AI` / `H5`）外，不得出现英文单词
3. 若一条问题确实离不开代码/英文才能表达 → **本质是架构问题**，应改标 `@架构确认`

违反 = 不通过。修复方式：改写为业务话术，或把该条重新归类为 `@架构确认`。

---

## L16. 确认项上限（软规则，警告）

`@PM确认` + `@架构确认` 合计条数：

- ≤ 10 条：通过
- > 10 条 且 「@确认清单」开头**有**「范围说明」段（作者已按 guide 步骤 5.5 走完两轮收敛仍需保留）：通过，打印警告
- > 10 条 且 无「范围说明」：**不通过**，提示作者跑 guide 步骤 5.5 整篇重读知识库收敛，禁止用 grep 代替

---

## L10. 锚点真实性

`anchors` 中的每个锚点：
- 类方法形式：类全限定名必须在**当前项目代码库**下能 grep 到 `class <ClassName>` 定义
- HTTP 形式：能在 controller 中 grep 到对应 `@RequestMapping` / `@PostMapping` 路径
- 前端入口形式：仅作为辅助说明，不强制校验，但必须同时配套至少 1 个类方法或 HTTP 锚点

---

## L17. 接口契约调用端（软规则，警告）

- 「10.1 接口契约」每行「调用端」非空，取值 PC / APP / H5 或其组合；多端组合时「说明」列写明差异。
- 「新增 / 追加字段」列出现删除、改名、换路径字样 → 警告（违反向后兼容，需改写或转 `@架构确认`）。
- 正文出现无来源标注的按钮 / 跳转 / 通知文案 → 警告，移入「建议（待产品确认）」。

## 不通过的处理

任一规则不通过 = AI 工具**不得**将 spec 推进到 commit。正确做法：
1. 列出未通过的规则编号（L1 / L2 / ...）和具体缺漏
2. 把问题反馈给开发，让其补全
3. 补全后重跑 lint，直至全部通过
