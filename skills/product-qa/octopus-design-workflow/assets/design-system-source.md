---
spec_id: octopus-design-system
status: draft
final_revision: null
previous_final: null
---

# Octopus 设计系统与双输出规范

**产品生成原型先读 [组件使用规范](prototype-authoring.md)**。该规范整理当前已有规则，指导逻辑描述如何落到字段、列、操作和状态；本文继续保存组件职责目录与待提取项。零售订单实例见 [页面契约与变化](examples/retail-order-prototype.md)。本文的 draft 指候选组件抽取与设计定稿状态，不意味着现行组件使用规则需要重新批准才能使用。

本文件是本轮设计系统的共同 Markdown 源。当前为本地工作稿，尚未共享或定稿；现行 `docs/standards/`、工程规则及真实接口约束继续生效。此稿中的候选组件名不是已实现的 Vue 组件或已确认的公开 API。

当前分工以 [组合说明中的四项确认](../../plugins/octopus-design-workflow/skills/octopus-design-workflow/references/composition.md#已确认的分工2026-10-29) 为准；LFerp 已确认业务材料直接引用，不重复编写 Spec。下方历史记录保留来源，不能覆盖最新分工。

## 已确认的工作方式

- 以 Octopus 当前运行环境为基线，从 Token 和实际组件建立规范。
- 从列表与详情里的展示、交互职责抽出 atom、业务组件和页面组合，优先复用已有实现。
- 按 Token → 组件 → Icon → 设计草稿 → 差异评审 → 合并定稿推进；下一次修改从实际定稿基线开始，只回到受影响的阶段。
- 同一 Markdown 契约由 Skill、规则、Figma 设计、LFerp 原型和 Octopus Admin 实现引用；本轮的 Admin 指管理端应用，不自动包含用户端、移动 App 或其他项目。
- LFerp 演示适配与 Admin 真实接口适配分开，共用规范条目和交互预期。实际 SDK/接口是字段、类型与提交语义的核验材料，不由原型数据代替。

## 材料与版本

| 材料 | 当前定位 | 作用与边界 |
| --- | --- | --- |
| 运行基线 | Octopus Dev，`/#/bargain/order_management/retailOrder/list` 及其真实详情抽屉 | 已观察列表与详情默认内容；完整交互和全部密度尚未验证 |
| Token | `docs/standards/design-tokens.md`、`library/styles/var.scss` 及运行计算样式 | 颜色、间距、字号、圆角和状态色引用语义 Token，不在此复制取值 |
| 当前源码 | 提取时本地 HEAD `85467a2ca6b810c0abd5e77ccb41b32eed37338d` | 当前工作区含 WIP，不代表已部署提交；角色清单只记录所读到的实现 |
| 设计师修改稿 | Figma `XKraFkdmnv4ZTSQLiIbjGO`，Page `0:1` | 已读八个画面与三个浮层；按用户确认负责订单页面结构与信息组合，未覆盖非订单页面；06 图标库源稿矢量亦取自本文件 |
| 规范执行版（唯一设计源） | Figma `izYwAFHoZnkV6AxgkhYgyC`（冷丰ERP·UI规范与组件库，封面 v2.2 · 2026-10-30，01 Token 页头 v2.5 · 2026-10-31） | 2026-11-09 登记为本 Skill 的 Token/组件/页面/图标规范权威源。7 页：00 封面与使用说明（`0:1`，含五条硬规则与 Octopus 全平台规范/使用指南）、01 Token（`1:86` 权威，六节工程变量映射与冲突裁决、七节工程组件映射与四场景指令）、02 基础组件（`1:87`，20 组源稿取值，Button 至 AppShell/GroupedForm）、03 业务组件（`1:88`，28 项状态挂色矩阵、ATOM-01~06 与 BIZ-001~006 目录、v1.1 新增组合）、04 页面模板（`1:89`，列表页 1920 与表单抽屉 656）、05 变更记录（`1:90`，已登记 v1.0–v1.3）、06 图标库（`19:2`，源稿矢量 `lf-icon-*` 与侧栏 50 图标）。封面声明“本 Figma 文件为唯一执行版”；与 Octopus 规范冲突一律以 01 Token 页为准，工程现状色差按「工程跟进」处理，不改规范 |
| 规范工作文件 | Figma `1XfBEflYG4rZ5KlXdvU4tP` | Token/组件/页面规范已由执行版 `izYwAFHoZnkV6AxgkhYgyC` 承接；本文件保留 53-3 视觉板与 06 组合与应用（R1/R2/R3）等组合教学节点，未发布库 |
| LFerp | `MDM/mdm_order_retail.html` 及相关详情行为 | 承载已确认页面、流程、字段和交互；视觉由已有系统＋设计师稿规范，未确认内容与冲突单列核对 |

现行规范定位：`docs/standards/list-page.md`、`table.md`、`form-page.md`、`status-dictionary.md`、`data-format.md`；工程定位：`types/schemaTable.ts`、`types/schemaForm.ts`、`types/detailPage.ts`。正文发生变化需记录实际内容摘要；没有提交或发布时不填写虚构的远端版本。

## 跨模块目录入口

基础控件全集与跨页面模板以 [跨模块组件规范](component-catalog.md) 为入口。该目录覆盖商品、门店、配置以及售后源码，区分运行已见、代码已读和待验；下文 ATOM/BIZ 是先前订单样本的语义职责，不能作为全系统组件清单。

## 按使用职责抽组件

“角色”指组件在界面中的职责。抽取先记录出现位置、展示内容、交互、状态、数据/事件输入及来源，不从文件名相似或页面截图直接推导公共 API。

### 基础与语义 atom

按钮、输入框、选择框、勾选框等基础控件复用现有 Element Plus 与项目封装；以下是列表、详情共用的语义职责。一个职责需要独立交互或复用边界才抽 atom，不把每个 span 都变成组件。

| 稳定 ID | 职责 | 列表 / 详情用法 | 当前定位与提取状态 |
| --- | --- | --- | --- |
| ATOM-001 | 导航单号 | 列表打开详情；详情内相关单据也可导航 | 已有 `src/components/DocNoLink/index.vue`；`value`、`href`、`open`；划选不误触，已访问状态保留 |
| ATOM-002 | 展示与复制编号/电话 | 非导航编号、详情标题与联系方式 | 已有 `src/components/BizNo/index.vue`、`src/utils/docNo.ts`；空值及含掩码值不复制；`disabled` 为只读外观，复制仍可用，不改成一般禁用按钮语义 |
| ATOM-003 | 日期时间值 | 列表时间列、详情收款时间/记录 | 已有 `library/components/VabDateTime/index.vue`；`value`、`mode`、`seconds`、`fallback`；时区/格式复用现有日期工具 |
| ATOM-004 | 金额值 | 列表金额单元格、详情明细及金额小票 | 当前共用 `_shared/formatters` 与 `is-money`；尚无已核验的独立金额展示组件。候选仅封装格式/对齐，不计算账务、不把空值变成金额 |
| ATOM-005 | 字典/状态展示 | 状态列、履约/营销标签、详情字段 | 当前为 `el-tag` 或 Label 文本片段。候选只接收展示 Label 与已决定的表现；不在 atom 内新增状态映射、业务迁移或权限判断 |
| ATOM-006 | 字段名和值 | 详情描述项、业务摘要的字段行 | 当前为 `el-descriptions-item` 与页面片段；候选接收展示内容/slot，不自动猜字段或加载接口 |

### 业务组合

以下业务名为待抽取的职责名称；清单建立不表示 Vue 组件已拆出。列表与详情的数据形状不同，先明确适配，不强制合并成有大量 `mode` 分支的巨型组件。

| 稳定 ID | 职责 / 候选名称 | 列表角色 | 详情角色 | 当前来源与边界 |
| --- | --- | --- | --- | --- |
| BIZ-001 | 商品摘要 / ProductSummary | 首商品图文、多 SKU 提示及明细浮层入口 | 商品行的名称、规格、图片、已有售后标签 | 列表 `#cell-goodsInfo`、详情 `.goods-cell`；`firstProductTitle` 与 `productTitle` 等需分别映射，加载明细和售后决策仍由调用层承担 |
| BIZ-002 | 客户摘要 / CustomerSummary | 昵称与买家相关字段 | 客户信息区的昵称、手机、用户 ID | 运行列表观察为买家信息组合，本地列定义仍分别消费相关字段，完整展示映射待核验；消费者与收货人不混为同一身份 |
| BIZ-003 | 收货信息 / ReceiverSummary | 收货人姓名、电话 | 配送、收货人、电话、地址、自提相关字段 | 列表 `receiverAddress.shipping` 展示与详情“收货 / 自提信息”；保留不同数据契约，不猜值，不新增脱敏/必填规则 |
| BIZ-004 | 金额明细 / AmountBreakdown | 单项金额、优惠、实付 | 商品金额、优惠、运费、实付、实收及退款展示组合 | 详情 `.rcpt` 与列表金额列；公式、符号和真实字段语义先核验，不把现有显示片段自动确认为账务口径 |
| BIZ-005 | 物流包裹 / LogisticsPackageCard | 可有相关入口，当前不要求增加列表卡片 | 包裹、关联商品、物流单号、公司、配送状态、跟踪入口 | 详情 `.package-card`；复制可复用 atom，修改/删除/上传/跟踪为调用层已允许的事件，不在展示组件内暗藏写请求 |
| BIZ-006 | 订单进度 / OrderProgress | 状态列保持独立职责 | 已有进度步骤、时间及空态 | 详情“订单进度”与 `el-steps`；接收已决定的步骤，不从展示组件推导新订单状态机 |

共同源码入口：`src/views/bargain/order_management/retailOrder/list/index.vue`、`retailOrder/list/DetailDrawer.vue`、`_shared/OrderDetailPage.vue`。以上字段只记录当前消费位置；后续公共 props、类型、Label 与事件需要对照真实 SDK/接口定稿。

### 页面组合与容器

| 稳定 ID | 角色 | 已有基础 | 不能混入的职责 |
| --- | --- | --- | --- |
| PATTERN-001 | 查询 + 操作区 + 结果 + 分页 | `VabSchemaTable` 的 schema/slot/个人视图 | 不复制一套查询和分页引擎，不因抽组件删减既有操作 |
| PATTERN-002 | 详情加载、失败重试、容器生命周期 | `VabDetailPage`、`VabDetailPageDrawer/Dialog` | 不是业务身份/状态判断组件 |
| PATTERN-003 | 详情标题、区块、分栏、标签页 | `VabDetailPageHeader`、`VabDetailSection` 及现有页面组合 | 不把整个详情页改名当作 atom |
| PATTERN-004 | 业务操作组 | 列表 `#actions` 与现有可见操作集合 | 展示主/次/更多；权限、可操作条件与执行逻辑由业务调用层决定 |

## Icon 契约

先按组件职责登记语义 ID，再映射当前真实资产。组件阶段可先引用 ID，Icon 阶段补足图形、尺寸、描边/填充、颜色、状态、可访问名称与 Figma 节点。顺序不意味着组件要先临时画一套图标。

| ID | 用途 | 已读代码来源 | 图形匹配状态 |
| --- | --- | --- | --- |
| ICON-SEARCH | 查询 | `VabSchemaTable` → Element Plus `Search` | 代码已定位，设计师图形待匹配 |
| ICON-RESET | 重置/刷新 | `VabSchemaTable` → `Refresh` | 同上 |
| ICON-EXPAND | 展开/维度选择 | `VabSchemaTable` → `ArrowDown` | 同上；记录方向/旋转规则 |
| ICON-COPY | 复制值 | `BizNo` → `CopyDocument` | 同上 |
| ICON-COPIED | 已复制反馈 | `BizNo` → `Check` | 同上 |
| ICON-EXPORT | 导出 | 零售列表 → `Download` | 同上 |
| ICON-BACK | 返回 | `VabDetailPageHeader` → `ArrowLeft` | 同上 |
| ICON-SECTION | 区块展开/收起 | `VabDetailSection` → `ArrowRight` | 同上 |
| ICON-ORDER-NAV | 订单导航 | `VabIcon`、`src/config/aliIconfont.ts` → `ali:icon-dingdanguanli` | 图标源已定位，发布资源与设计师图形待匹配 |

`VabIcon` 已支持 Ali symbol 与 legacy/custom SVG 路径，Element Plus 图标也已存在。保留真实来源及长宽比，不未经确认把它们全部换成一个新库或用字符替代最终图标。相似图形不等于同一资产。

## 逐步推进与定稿

| 阶段 | 产出 | 进入下一阶段的证据 |
| --- | --- | --- |
| 0 基线与职责 | 规范入口、材料范围、当前版本、角色清单、差异 | 材料已读；事实/候选/未知已分开 |
| 1 Token | 语义名称、运行值来源、主题/密度、Figma/CSS 映射 | 受影响值已回读，不只看截图 |
| 2 组件 | atom → 业务组合 → 页面组合；真实 props/slot/状态与缺口 | 已有/待抽取/新增候选分开；来源与使用位置可追溯 |
| 3 Icon | 语义 ID → 真实资产 → 消费组件 | 图形、比例、颜色与状态匹配；缺项不伪称已完成 |
| 4 设计草稿与双输出 | 同一契约关联 Figma、LFerp 与 Admin 的受影响草稿 | 实际产物及文件/节点定位；各端缺失单独说明 |
| 5 差异评审 | 需求、视觉、组件、交互、接口与实际结果差异 | 已执行与未执行分开；只处理受影响范围 |
| 6 合并定稿 | 实际决定、最终 Markdown 版本/摘要、关联资产与输出版本 | 在授权范围内执行定稿，记录真实确认；不从沉默推断批准 |
| 7 下一轮修改 | 从实际定稿基线建立变更集，重走受影响阶段 | 保留上一版本、稳定 ID 和可追溯差异，不每次重建全部 |

设计定稿、Figma 库发布、Git 合并和部署是不同动作。定稿不会自动授权后面三个动作；已有具体授权不重复询问。除非团队已有明确要求，不额外制造三个人逐项审批的关卡。

## 同一 Markdown，两种输出

### LFerp 原型

读取实际 LFerp 仓库规则与相关页面，用当前 HTML/CSS/JS 结构和演示数据能力实现受影响的原型。保留本规范的条目 ID、Token 和组件职责。示例数据与状态切换明确为演示，不当作真实接口或账务事实。生成后实际打开相关页面与状态验读。

### Octopus Admin 应用

读取同一规范条目，适配当前 Vue/Element Plus、VabSchemaTable/Form/Detail 与实际 SDK。已有组件用 props/slot/schema 复用；候选提取在获得相应实现授权后拆分，不由本稿自动改生产代码。缺少接口字段或存在未决业务差异时，暂停依赖部分，不输出伪造的可联调实现。生成后完成适用的构建/测试与实际 UI 检查。

两者共同核对字段含义、动作、状态、样式和结果；数据来源、页面技术结构和环境配置分别适配。平台差异必须显式列出，不能暗中让两端走不同口径。只生成原型、交接或骨架时明确产出范围，不宣称 Admin 应用已实现。

## 反复生成与规则引用

每轮记录：本 Markdown 的实际版本/摘要、采用的设计/组件/接口基线、变更条目 ID、受影响 Token/组件/Icon/页面、允许写入的文件与节点、实际产物和验收结果。

- 输入和依赖未变：复用已有产物与仍有效证据，避免重复创建节点或改写文件。
- 输入变化：先比较差异和引用关系，再更新受影响输出；保留用户 WIP、手工实现和其他独立改动。
- 来源漂移：单独记录，不静默用旧规范覆盖新接口，也不用新代码反向篡改已定稿业务。
- 未定稿草稿不覆盖上一份有效规范。规则引用本文件时先核验 status 与实际定稿版本；当前 status 为 draft，因此只作本轮工作稿，不替代现行标准。
- 定稿后，规则、Skill、Figma 说明、LFerp/Admin 产物都记录同一最终 Markdown 定位和摘要。Markdown 变化不会天然编译或后台同步到各端，由 Skill 显式读取、生成/更新并回读验证。

本轮当前阶段：已整理产品生成原型的现行组件使用规则，并生成零售订单本地评审稿与变化清单。Figma 已按用途分页，说明关联同一 Markdown。2026-11-09 起视觉规范权威源迁移到 Figma 规范执行版（见材料与版本表）。业务组件公共代码提取、完整 Icon/操作收纳、Admin 实现及设计定稿仍未完成；不是已发布的全量设计系统。

## 规范执行版登记（2026-11-09）

用户提供链接后实际读取 `izYwAFHoZnkV6AxgkhYgyC` 全部 7 页元数据（经 figma MCP 通道，get_metadata 逐页读取），登记为视觉规范唯一执行版。本次仅做来源登记与引用更新，未复制 Token 数值到 Markdown，未修改 Figma 文件本身。

执行版内已声明的裁决规则（引用，不另立口径）：封面五条硬规则——颜色只用 `color/*` 变量、字号只取文字样式档、间距只取 9 档、业务状态只用 StatusTag＋28 项挂色、新增组件须建变体并在 05 页登记；01 Token 页六节——与 Octopus 规范冲突一律以该页为准，工程现状色差按「工程跟进」处理，不改规范；03 页声明 ATOM-01~06 与 BIZ-001~006 “前端与 Figma 共用同一套定义”，与本文职责目录互为对应。

登记时发现的执行版内部待确认项（单列，不擅自裁决）：

1. 版本标识不一致：封面写 v2.2 · 2026-10-30，01 Token 页头写 v2.5 · 2026-10-31。
2. 05 变更记录表仅登记 v1.0–v1.3，与其自身“每次改动必须新增一行”规则相比缺 v1.4–v2.2 的行；按其封面规则，前端靠该表锁定变更范围，建议补齐。
3. 行高取值不一致：封面硬规则与 02 页 Table 写“行高 67”，01 Token 五节写“表格行高 64（多行 88~121）”。
4. 字号档数不一致：封面 bullet 写“13 档字号”，硬规则二与 01 Token 三节写 14 档。
5. 封面宣称 04 页含三个模板（列表页/详情页/表单抽屉），实际 04 页只有模板 01 列表页与模板 03 表单抽屉，无详情页模板。
6. 02 页 Button 说明主按钮三档底色（v2.1 增按下态 #FA843A），但组件集仅含默认/悬浮/禁用，按下态变体待补。

## 历史权威分工修正（2026-10-28；当前分工见上方）

用户确认唯一依据为设计师样稿与已有系统：设计师稿确定页面结构和信息组合；已有系统确定组件样式、状态和业务操作。LFerp 是待纠正原型与输出，旧原型和 agent 写成的 Markdown 都不能自证正确。旧 22 列与保留原 JS 的验收路线失效；当前页面契约见 examples/retail-order-prototype.md。

## 首批可复用原型组合（2026-10-28）

已按 [组件契约](prototype-components.md) 抽出 `OctoQueryGroup` 与 `OctoTableActions`，连同共享 Token 置于 Skill `assets/prototype-ui/`。先验证独立样例，再让订单时间、买家信息及操作列消费同一实现。基础 Button / Checkbox / Tag 等直接使用 Element Plus。此项只完成原型适配层，Admin 公共组件、完整业务组件库及 Figma 组件定稿仍未完成。
