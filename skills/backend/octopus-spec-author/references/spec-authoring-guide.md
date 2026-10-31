# Spec Authoring Guide

> 本文是产出领域 spec 的**唯一操作手册**。适用于任何采用双层 spec（领域契约 + 施工清单）工作流的后端项目；首个落地项目是 octopus-cloud，其他项目复用同一流程。
>
> 所有工具入口（Claude Code skill / Cursor rule / OpenSpec AGENTS）的执行内容都引用本文。
>
> 项目专属数据（领域不变量、扩展点白名单、默问清单、Base 配置）由**当前项目**的 `docs/superpowers/domain-index.yaml` 与 `docs/superpowers/confirm-base.yaml` 提供，格式规约见同目录 `domain-index-schema.md` / `confirm-sync-protocol.md`。

---

## 0. 适用场景

✅ **使用本流程的情况**
- 接到产品原型 / PRD，需要拆解为后端实现 spec
- 既有功能要做较大领域行为变更（新增状态、新事件、新跨域调用）
- 引入新扩展点、新 starter、新 domain event

❌ **不适用本流程（命中即退出：AI 必须拒绝生成 spec，直接告诉用户本 skill 不适合，绝不继续步骤 1-10）**
- 纯 bug 修复 / 文案变更 / 配置调整
- 单纯的代码重构（无领域行为变化）
- 一次性脚本 / 数据修复
- 纯技术优化：性能、日志、注释、命名、依赖升级
- 既有接口参数微调但业务语义不变

**判定口径**：如果需求**不引入**新业务规则 / 新状态 / 新事件 / 新跨域交互，而只是让既有代码跑得更好、修复既有行为、或补齐数据 → 不适用本流程。

不适用时的处理：简短答复"本 skill 只处理领域行为变更 spec；你的需求是 <bug 修复 / 重构 / 数据回填 / ...>，不走 spec 流程，直接按 git-branch-commit + springboot3-backend 规范实现即可"并结束，**禁止**继续步骤 0 之后的任何流程、**禁止**落盘 spec 草稿。

---

## 1. 输入：开发需要提供什么

只需要两样东西，**不要凭空回答业务问题**：

### 1.1 业务诉求
- 产品原型截图 / 链接 / PRD 原文。能粘多少粘多少，**不要二次概括**。

### 1.2 入口锚点（必填，至少 1 个）
锚点是开发"我准备改这里"的具体定位。三种合法形式：

| 类型 | 格式 | 示例 |
|---|---|---|
| 类方法 | `全限定类名#方法名` | `cn.org.lengfenghl.laowang.commerce.core.v1.payment.application.PaymentAppService#createOrder` |
| HTTP 接口 | `<METHOD> <path>` | `POST /agreement/submit` |
| 前端入口 | `页面 → 区块 → 按钮` | `门店管理 → 门店详情 → 绑定 BD` |

**锚点不准确，整个 spec 草稿就会偏**。开发不确定锚点时，先问 PM"这个功能将出现在哪个页面？"或问 lead"这个动作大概落到哪个 service？"——再开始 spec。

---

## 2. 流程：AI 工具该怎么做

> 本节是 AI 工具（Claude Code / Cursor / OpenSpec）执行 spec 草稿生成时的步骤指令。

### 步骤 0 — 拉取并读取知识库（生成前必须完成，禁止跳过）

知识库源仓库：`https://gitee.com/lengfeng_2/template-scaffold.git`，分支 `dev`，本地路径 `~/IdeaProjects/template-scaffold`。

**0.1 拉取最新内容**

```bash
git -C ~/IdeaProjects/template-scaffold pull origin dev
```

**0.2 必读文档（每次 spec 都要读，不因主题而省略）**

| 文档 | 路径 | 用途 |
|---|---|---|
| 数据库边界基线 | `docs/database-boundary-baseline.md` | 5 库分库约束，数据库变更必须遵守 |
| 领域事件设计 | `docs/domain-event-design.md` | 事件发布规范，`§4 事件契约`必须对齐 |
| 多流程架构基线 | `docs/multi-flow-architecture-baseline.md` | 跨域事件拓扑与里程碑枚举 |

**0.3 按域选读（根据初步判断的 `domains_touched` 匹配）**

| 域关键词 | 建议读取 |
|---|---|
| order / oms | `docs/order-model-guide.md`、`docs/order-contract-plan.md` |
| org / store / bd | `docs/org-model-guide.md`、`docs/store-territory-protection.md` |
| product / sku / spu | `docs/product-model-guide.md`、`docs/channel-product-design.md` |
| fulfillment / shipment / wms | `docs/fulfillment-model-guide.md`、`docs/fulfillment-gap-analysis.md` |
| marketing / coupon / points | `docs/marketing-core-design.md` |
| distribution / commission | `docs/distribution-design.md` |
| agreement | `docs/agreement-architecture.md` |
| authz / permission / rbac | `docs/resource-scope-permission-guide.md`、`docs/permission-runtime-governance.md` |
| identity / member / user | `docs/identity-governance-baseline.md` |
| notification / message | `docs/domain-event-design.md`、`docs/notification-system-design.md` |

如果需求主题对应上表之外的域，在 `~/IdeaProjects/template-scaffold/docs/` 下按关键词 grep 文档标题后自行判断是否需要读取。

**0.4 记录约束**

阅读完成后，提炼以下信息备用（在 spec 草稿生成中严格遵守）：
- 本次 spec 涉及的表属于哪个数据库（来自数据库边界基线）
- 本次事件契约已有哪些已定义的事件类型（来自领域事件设计）
- 各 touched 域已有哪些 baseline 决策不可推翻

如发现草稿设计与知识库约定冲突，必须在「6. 风险与确认项」标 `@架构确认`，注明冲突内容。

### 步骤 1 — 加载领域索引
- 读取 `docs/superpowers/domain-index.yaml`，记住所有已注册域、各域的 `app_services` / `domain_events` / `extension_points` / `common_invariants` / `confirm_prompts` / `baselines`。

### 步骤 2 — 锚点解析
对每个锚点，确定**主域**：
- **类方法锚点**：根据包路径匹配 domain-index 中域的 `app_services` 前缀。
- **HTTP 锚点**：grep 当前项目的 gateway / BFF / API / 各 core 模块的 `@RequestMapping` / `@PostMapping` 找到 controller，再追到 AppService → 主域。
- **前端入口锚点**：让开发补充对应的后端接口路径或类名（不许猜）。如开发也不知道 → 标 `@架构确认`。

### 步骤 3 — 影响面爬取
从锚点入口出发，**只读不写**地爬代码。**以 `origin/dev` 为基线**：本地工作区常签出在落后 dev 上百提交的分支，读代码用 `git show origin/dev:<path>`（或先 `git diff HEAD origin/dev -- <file>` 确认工作区不落后），spec frontmatter / 正文注明基线 commit。
1. 调用链：被锚点直接调用的下游 AppService / DomainService / Repository。
2. 事件：方法体内 `publish` / `eventPublisher` 的 domain event。
3. 跨域调用：调用链中触达的其他模块的 AppService → 加入 `domains_touched`。
4. 扩展点：方法体内 SPI / 策略接口调用 → 列入「9. 挂载扩展点」候选。

爬取深度：**首层全爬，二层爬遇到的跨域调用一层**，再深就标 `@架构确认 跨域影响是否需要进一步追溯：<具体调用>`。

### 步骤 4 — 不变量注入
对 `domains_touched` 中每个域，把其 `common_invariants` **逐条**写入「2. 涉及域与不变量」的 checklist。**不允许删除**；如果开发认为某条不适用，必须改为：
```
- [ ] <invariant> — 不适用：<理由>，已与 @架构确认 #N 对齐
```
并相应增加一条 `@架构确认`。

### 步骤 5 — 默问清单
对 `domains_touched` 中每个域，把其 `confirm_prompts` 逐条加入「6. 风险与确认项」，归为 `@PM确认`（业务问题）或 `@架构确认`（架构问题）。

**分类守则（必须严格执行）**

标签分错 = at 错人 = 非责任方被迫答权威之外的问题 → 决策不可信。作者生成每条 `@确认` 时**必须逐条自查**归类是否合理。

| 问题本质 | 归为 | 典型句式 |
|---|---|---|
| 业务口径 / 用户体感 / 权衡取舍 / 是否要做 | `@PM确认` | "用户在 X 场景下应该看到 Y 还是 Z？"、"是否需要支持 A 行为？"、"退款按比例还是全额？"、"是否保留已离职 BD 的历史关系？" |
| 数据结构 / 接口抽象 / 扩展点 / 技术选型 / 表设计 | `@架构确认` | "是拆表还是单表加 type 字段？"、"用 enum 还是 SPI？"、"是否需要新增扩展点？"、"表怎么关联？"、"用 SingleLink 还是文本外键？"、"加字段还是加表？" |

**红线词检测**：如果问题里出现以下关键词，**默认应该是 `@架构确认`**，除非你能明确论证它本质是业务问题：

- 表 / 字段 / 列 / 枚举 / enum / SPI / 扩展点 / 抽象 / 抽象层
- 拆 / 合 / 关联 / 外键 / 继承 / 策略类 / 工厂 / 接口
- 性能 / 索引 / 事务 / 幂等 / 分布式 / 异步 / MQ
- 架构 / 分层 / 调用链 / 模块边界

**反例**（这种分错类不允许出现）：

> "券 / 满减 / 折扣三者在新统一模型里用 type 字段区分，还是拆三张子表？" — **错！** 这是架构决策（数据结构选型），应归 `@架构确认`，不能 @ PM。

> "pay_refund_flow 独立建表还是复用 pay_flow？" — **错！** 这是表设计，归 `@架构确认`。

**正例**：

> "部分退款时，积分按比例退还还是全额退？" — 对，`@PM确认`，业务口径。
> "历史分销关系回填时，遇到已离职 BD 的订单关系还要保留吗？" — 对，`@PM确认`，业务取舍。

**特殊情况**：少数问题既有业务面又有架构面（例如"用券能不能叠加折扣？"——表面是业务但牵涉数据模型）。此时**拆成两条**：一条 `@PM确认` 问业务规则，一条 `@架构确认` 问模型承载。不允许用一条"混合"的 `@PM+架构确认`。

**@PM确认 行文要求（强制）**

PM 是产品侧读者，不懂也不该懂代码。任何 `@PM确认` 条目必须满足：

1. **零代码符号**：不得出现类名、方法名、字段名、表名、接口名、包路径、enum 常量、注解等任何技术标识；全都翻译成产品话术或业务对象（"用户 / 订单 / 优惠券 / 门店 / 销售 / 履约单 / 状态"等）
2. **尽量用中文**：英文仅保留产品侧通用缩写（SKU、SPU、VIP、APP、PV、UV 等）；SPI / AppService / Repository / DTO / FQCN 等技术英文**禁止**出现；看到就改写
3. **站在业务视角提问**：问"用户 / 订单 / 优惠券的行为与体感"，不问"某方法 / 某字段 / 某 enum 如何设置"
4. **自我裁剪**：如果一条问题离开代码语境就没法讲清楚，说明它**本质是架构问题**，改标 `@架构确认`；不要用"把代码名翻译成中文"硬塞给 PM

**反例**（@PM确认 里混入代码/英文，违规）：

> @PM确认：`PaymentAppService#createOrder` 在 `PaymentStatus = PAID` 后是否允许 `cancel`？
> @PM确认：新增的 `CouponChannel` SPI 是否需要支持叠加？
> @PM确认：`order_refund_flow` 表的 `status` 字段取值范围？

**改写后**（业务视角、中文）：

> @PM确认：用户已支付的订单是否允许自助取消？若允许，是否自动原路退款？
> @PM确认：同一笔订单能否同时使用店铺券和平台券？
> @PM确认：退款流程要区分几种状态？各状态下用户分别能看到什么？

### 步骤 5.5 — 确认项收敛（强制，不得跳过）

步骤 5 结束后，清点当前「6. 风险与确认项」中 `@PM确认` + `@架构确认` 合计条数：

- **合计 ≤ 10 条**：放行，进入步骤 6
- **合计 > 10 条**：**立刻停下收敛**，按以下流程操作，**禁止用 grep / Grep 凑答案**——grep 只定位字符串，判断不了"这条问题是否已在架构 baseline 里有明确答复"

**收敛流程**：

1. **整篇重读**（不依赖记忆、不用 grep）：
   - 再读一次步骤 0 读过的全部知识库文档（必读 + 按域选读的每一份）
   - 再读一次当前项目的 `docs/superpowers/domain-index.yaml`（尤其 touched 域的 `common_invariants` / `baselines` / `confirm_prompts`）
   - 挑 `baselines` 里引用到的 1-2 份核心基线文档从头到尾看完；大文件用 Read 而不是 Grep
2. **逐条审视每条 @确认**，按以下归类处理：
   - **能在文档 / domain-index / baseline 里直接查到定论** → 删除该条，改写成正文中的一句陈述并标注来源（例如"按 `domain-event-design.md §4.2`，事件字段结构沿用 BaseEventEnvelope"）
   - **能从已有不变量或现有设计推导出答案** → 删除，在正文对应章节写出推导链
   - **多条问题指向同一个决策或同一份设计点** → 合并为一条
   - **同一条既含业务面又含架构面** → 拆分时若业务面已在需求里有明确描述，只保留架构面
   - **确实文档里没定论、也推不出来** → 保留
3. **收敛后重新清点**：
   - 仍 > 10 → 再走一轮合并/归并
   - 连续两轮仍 > 10 → 接受，但必须在「@确认清单」开头写一行「范围说明：本 spec 涉及 <N> 个子域 / 新引入 <M> 项规则，保留 <K> 条确认，分组为 A/B/C…」，向 reviewer 解释为什么不能再减

**背后原因（让你判断边界用）**：> 10 条通常不是问题多，而是作者没吃透现有文档——看到几处疑点就 grep 一下当成独立问题列出来。整篇重读能把"这条其实已有答案"和"这条是真空白"分开；grep 做不到这件事。

收敛完毕再进入步骤 6。

### 步骤 6 — 施工清单生成
- 「7. 影响模块」：根据爬取结果勾选。
- 「8. 改动文件清单」：列出锚点所在文件 + 爬取中识别出**确定要改**的文件；不确定要改的不列。
- 「9. 挂载扩展点」：**只能从主域 `extension_points` 白名单选**；选不到 = 加 `@架构确认 是否需要新增扩展点`，且 frontmatter `new_extension_point` 改为 true。
- 「10. AppService 方法」：列出新增方法签名（输入输出 DTO 用占位符即可，由开发补全）。
- 「10.1 接口契约」：每个接口必须填「调用端」（PC / APP / H5，多端写 `PC + APP` 并说明差异）；动到存量接口只能是"追加可选字段 / 枚举值"，需要换接口或删字段 / 状态值的，改写为在现有接口背后实现，实在不行标 `@架构确认`。
- 界面元素（按钮、跳转、文案、通知）只写有来源的（用户原话 / PRD / 原型），AI 自己补的单列「建议（待产品确认）」。
- **用户正在改 spec 时不要先行编码**，也不要按「旧 spec + 对话口头决策」脑补新口径；等 spec 落定后再进入 plan / 实现，实现与新 spec 有差异要先指出。
- 「11. 数据库变更」：从锚点的 Repository 反推涉及的表；DDL 留空给开发填。
- 「12. 测试要点」：每个新方法至少 3 条边界用例占位。

### 步骤 7 — frontmatter 自评派生
- `domains_touched` = 步骤 3 + 4 的并集
- `new_invariant` = 步骤 4 中是否有"本 spec 新引入的不变量"段落非空
- `new_extension_point` = 步骤 6「9. 挂载扩展点」中是否出现"新增"
- `cross_domain_combo_seen_before` = 在**当前项目的** `docs/superpowers/specs/` 下 grep `domains_touched` 同集合的历史 spec，找到 ≥ 1 份 = true，否则 false
- `spec_color` = 任一红线触发（new_invariant / new_extension_point / cross_domain_combo_seen_before=false）则 `red`，否则 `green`

### 步骤 8 — `@确认清单` 汇总
扫描全文所有 `@PM确认` / `@架构确认` 标签，去重后列入文末「@确认清单」。

### 步骤 8.5 — 知识库自检（lint 前必须完成）

草稿已生成，用知识库当前状态（非记忆）对草稿做二次核验。

**8.5.1 重新读取知识库文档**

重新读取步骤 0 中读过的所有知识库文档（`~/IdeaProjects/template-scaffold/docs/` 下对应文件），不依赖记忆。

**8.5.2 逐项核验**

| 核验项 | 检查方法 | 不通过处理 |
|---|---|---|
| 数据库归属 | 对照 `database-boundary-baseline.md`，确认「11. 数据库变更」中每张表属于正确的库 | 修正表归属，或标 `@架构确认 #N` 说明冲突 |
| 事件契约格式 | 对照 `domain-event-design.md`，确认「4. 事件契约」中的事件命名、字段结构符合规范 | 修正格式，或标 `@架构确认 #N` |
| 跨域调用合法性 | 对照 touched 域的 model guide，确认调用链不违反分层约定（如不允许 AppService 直接调用另一域的 Repository）| 修正调用链，或标 `@架构确认 #N` |
| 不变量不矛盾 | 确认草稿的设计决策不推翻 baselines 中已有的不变量 | 修正草稿，或标 `@架构确认 #N` 说明是否需要更新 baseline |

**8.5.3 重新读取 `docs/superpowers/domain-index.yaml`（最新状态）**

- 域白名单：`domains_touched` 中每个条目存在于当前 domain-index 的 `domains.*`
- 不变量完整性：touched 每个域的 `common_invariants` 全部出现在「2. 涉及域与不变量」checklist
- 扩展点白名单：「9. 挂载扩展点」中每个扩展点在当前 domain-index 的 `extension_points` 白名单内

**8.5.4 结论**

任一项不通过 → 修正草稿 → 重跑 8.5，直至全部通过，再进入步骤 9 Lint。

### 步骤 9 — Lint
按同目录 `spec-lint.md` 的规则自查。任一规则不通过 = 不允许提交，迭代到通过。

### 步骤 10 — 落盘
草稿写入**当前项目仓库**：
```
docs/superpowers/specs/YYYY-MM-DD-<topic-kebab>-design.md
```
Commit message：`docs(superpowers): <topic> spec draft`。

---

## 3. Review 流程

### 3.1 绿色 spec（`spec_color: green`）
- 走**同级开发互审**：1 名同等级或以上的开发 +1 即可合并到 `dev`。
- 互审重点：施工清单是否完整、@PM确认 是否已闭环、测试用例是否充分。
- **不进架构师队列**。

### 3.2 红色 spec（`spec_color: red`）
- **必须**分配给架构师。
- 架构师 review 重点：
  - `new_invariant` → 该不变量是否合理？是否要写入 scaffold baseline？
  - `new_extension_point` → 是否真的需要新扩展点？现有扩展点能否满足？
  - `cross_domain_combo_seen_before=false` → 这个新跨域组合的副作用是否考虑全？
- Review 通过后，架构师**必须**将本次确立的新规则同步进 `domain-index.yaml` 对应域，让未来同类 spec 自动绿色化。

### 3.3 状态推进
- `draft` → 草稿写完 + lint 通过
- `reviewing` → 已分配 reviewer
- `approved` → 所有 `@确认` 标签闭环 + reviewer +1

### 3.4 `@确认` 回填流程

`@确认` 标签的答复需要回填到 spec 文件本身，否则 spec 永远停在 draft，知识无法沉淀。**两种回填方式都支持**，团队负责人指定默认，作者也可按 spec 重要性自行选择：

#### 方式 A · 直接回填（轻量）

适用：**绿色 spec** / 答复简单 / 答复者就是作者本人

流程：
1. 答复者通过飞书 / 口头 / 当面给出答复
2. 作者直接编辑 spec 文件
3. §6 标签处 `[ ]` → `[x]`，「@确认清单」对应项写明：答复内容 + 答复人 + 日期
4. 所有标签闭环后，作者把 frontmatter `status` 推进到 `approved`，开 PR `docs(superpowers): <spec-name> approved`

优：零基建，几分钟完成
劣：答复来源不可溯源（飞书消息会过期）

#### 方式 B · 关联 issue/PR 评论（可溯源）

适用：**红色 spec** / 答复涉及多人讨论 / 决策可能影响未来

流程：
1. 作者在 §6 处给每条 `@确认` 加 `[关联](<issue/PR url>)` 链接
   - 可以为整个 spec 开一个 Gitee issue，每条 `@确认` 是该 issue 下的一条评论
   - 也可以挂在已有相关 PR 的评论里
2. 答复者在 issue/PR 评论里回答
3. 作者收到通知后开回填 PR：
   - §6 处保留链接
   - 「@确认清单」勾 `[x]` + 摘录答复关键内容 + 保留链接（让未来 review 者能点过去看完整讨论）
   - frontmatter `status` 推进到 `approved`
4. PR 标题：`docs(superpowers): <spec-name> approve confirms`

优：答复轨迹永久保存在 Gitee；一年后回看仍能溯源
劣：每个 spec 多开 issue，前期开销稍高

#### 方式 C · 飞书 Base 回填表（可溯源 + 主动通知 + 反乒乓）

适用：**跨职能讨论**（PM 不在 Gitee，或答复涉及多轮"反乒乓"来回澄清）

核心机制：用一张共享飞书 Base 承载所有 spec 的 @确认 问答。主表一行对应一条 @确认，子表一行对应一轮答复，双向 link 关联；子表新增触发 workflow，自动把主表状态推"已回复"并给通知人发飞书消息。

**Base 配置来源**：每个项目在**项目本地** `docs/superpowers/confirm-base.yaml` 维护自己的 Base 配置（`base_token` / 主表 table_id / 子表 table_id / workflow_id / 字段映射）。格式规约见配套 skill `octopus-confirm-sync` 的 `references/confirm-sync-protocol.md`。

skill 执行时读项目本地的 `confirm-base.yaml`，不从本文件取 id。新项目采用本机制前须先搭 Base 并填好 yaml。

**流程**：

1. 作者写完 spec 草稿后，把每条 `@确认` 通过 lark-cli 写入主表（`base_token` / `table_id` / 字段映射读自项目本地 `confirm-base.yaml`）：
   - 必填：`spec_id` / `确认编号` / `类型` / `问题` / `通知人` / `状态=待回复`
   - 写入时 skill 自动在 spec §6 处给每条 `@确认` 挂 `[关联](<主表该行 URL>)`
2. 作者把主表对应行的 URL 发给答复者（PM / 架构师）
3. 答复者打开主表那行 → 点「答复历史」→「+」新建答复 → 填：
   - 答复内容 / 答复人姓名 / 答复日期 / 轮次 / **确认项**（link，从下拉选当前主表行）
   - **spec_id 和 确认编号 formula 字段自动从 link 带出，无需手填**
4. 子表提交即触发 workflow（workflow_id 读自 `confirm-base.yaml`）：
   - 主表「状态」自动置为「已回复」
   - 通知人收到飞书消息：`<spec_id> · <编号> 第 N 轮：<答复内容>`
5. 作者收到通知 → 如不满意追问：直接在子表同一 link 下新增第 2 轮答复（反乒乓，每轮独立留痕不覆盖）
6. 所有答复结束后，作者在主表填「最终答复摘要」（凝练结论，一句话）
7. 回填 spec §6 —— 两档可选：

   **档 1 · 人工回填**（零基建）：
   - 作者手动打开主表、复制「最终答复摘要」到 spec §6 的 `[x]` 行
   - 保留主表行 URL 作为 `[关联](...)`
   - frontmatter `status` 推进到 `approved`

   **档 2 · 自动回填**（推荐，需作者端有 lark-cli）：
   - 每条 `@确认` 在 spec §6 处已挂 `[关联](<主表行 URL>)`（skill 第 1 步写入主表时顺手挂上）
   - 作者跑 `octopus-confirm-sync` skill（配套技能，见其 `SKILL.md`）
   - skill 自动：
     - 解析 spec 里所有 `[关联](...)` 提取 `record_id`
     - 按 record_id 读主表"最终答复摘要"+ 子表所有答复历史
     - 改写 spec §6：勾 `[x]` + 写摘要 + 保留链接；未闭环的报警不推进
     - 若所有条目均已闭环，frontmatter `status` 推进到 `approved`

8. PR 标题：`docs(superpowers): <spec-name> approve confirms`

**反乒乓机制**（方式 C 独有）：

- 子表每轮答复是独立一行记录，`轮次=1/2/3...`，永不覆盖
- 作者回填 spec §6 时，可选择只写最终摘要（简洁版），或把全部轮次按时间线渲染进 spec（完整版）
- 主表记录的 URL 就是讨论全历史的入口，点进去能看到每轮答复

优：
- 答复永久保存在 Base；每轮答复都有独立时间戳和答复人
- PM 无需登 Gitee；只要能打开飞书 Base
- workflow 主动通知到人，作者不用 polling
- 反乒乓场景天然支持

劣：
- 依赖团队有人维护 Base 和 workflow（配置登记在项目本地 `confirm-base.yaml`）
- 作者端需要装 lark-cli 才能自动写入主表；否则需要手工进 UI 建行
- PM 端需要能打开飞书 Base（内部成员默认可）

#### 选哪种？

- 团队默认未指定时：**绿色用 A，红色且跨职能用 C，红色且内部架构讨论用 B**
- 作者可以混用：同一 spec 里部分 `@PM确认` 用 C（PM 不在 Gitee），部分 `@架构确认` 用 B（架构决策走 PR 评论）
- lint L14（软提醒）：approved 状态下 `@确认` 缺少答复来源（无答复人/日期/链接任一项）会打印警告

---

## 4. 维护：domain-index 怎么演进

domain-index.yaml 是**活文档**。维护时机：

| 事件 | 谁更新 | 更新内容 |
|---|---|---|
| 新增域 / 拆分域 | 架构师 | 新增 `domains.<name>` 节点，至少填 `baselines` + `common_invariants` |
| 新增 AppService / 扩展点 / domain event | 实现该改动的 spec 作者（PR 一起改） | 对应数组追加 |
| Review 红色 spec 时确立新规则 | 架构师 review 时 | `common_invariants` / `confirm_prompts` 追加，并把对应 baseline 文档路径加入 `baselines` |
| baseline 文档移动 / 改名 | 移动者 | `baselines` 路径同步 |

---

## 5. 工具入口适配

本流程由 `docs-hub/skills/octopus-spec-author/` skill 统一承载，通过 `npx skills add` 分发到：

- Claude Code → `.claude/skills/octopus-spec-author/SKILL.md`
- Cursor → `.cursor/skills/octopus-spec-author/SKILL.md`
- Codex / 其它 agent → 各自对应目录

入口 `SKILL.md` **只做触发条件 + 边界说明**，**不写流程内容**。所有流程描述都在本文中。

如果发现入口文件里出现了实质流程描述 = 必须立即抽回本文。
