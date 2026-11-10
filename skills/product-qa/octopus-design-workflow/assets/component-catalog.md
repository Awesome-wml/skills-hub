---
spec_id: octopus-component-catalog
status: draft
scope: admin-cross-module
verified_on: 2026-10-28
---

# Octopus 跨模块组件规范

订单列表是验证页面之一，不是基础组件库的边界。本目录覆盖列表、详情、编辑、配置与反馈，供产品生成原型、设计制作样例和开发选组件共同引用。

本稿是来源可追溯的使用契约与补齐清单，**不表示全部组件已抽取、状态已验证或已进入 Figma**。Token 语义见 [design-tokens.md](design-tokens.md)，组件实现状态与版本以本轮证据记录为准。

## 1. 权威、分层与编号

- 用户已确认：设计师稿负责页面结构和信息组合；现有系统负责组件样式、状态与业务操作。当前设计师材料只覆盖已读取的订单相关画面，不能推定商品、门店等页面也已由设计师确认。
- LFerp 是输出与待纠正对象。Markdown 记录来源，Figma 展示规范及设计，Skill 执行读取与生成；三者均不能把未经核验的样例变成业务事实。
- `BASE-*`：不依赖订单、商品、门店等业务对象的基础控件。优先复用 Element Plus 或已存在的项目封装。
- `ATOM-*`：已有编号保持不变，表示单号、日期、金额、字段值等语义展示职责，见 [design-system.md](design-system.md)。它们不等于基础控件全集。
- `PATTERN-*`：列表、表单、详情等通用组合与容器。`PATTERN-001/query-group` 是列表组合中的筛选子组件，不把整个 `PATTERN-001` 改名为时间控件。
- `BIZ-*`：含明确业务对象与字段含义的组合。候选名称不是已经存在的 Vue API。

## 2. 已读材料及证据等级

`运行已见`仅表示实际打开对应状态；`代码已读`仅表示当前工作区实现存在。运行版本与本地 WIP 不自动等同。交互未执行、失败状态未触发时保持待验，不从默认截图推断。

| 来源 ID | 本轮实际读取 | 证据及边界 |
| --- | --- | --- |
| LIVE-PRODUCT | Dev `/#/product/list` 默认列表及“添加商品”抽屉 | 已见查询、分类、标签、Radio、Checkbox 组、禁用编码、上传入口、规格区、富文本、底部动作；未提交、未上传，未验保存结果 |
| LIVE-STORE | Dev `/#/store/list` 默认列表及门店名称打开的详情抽屉 | 已见筛选、标签、标题动作、详情页签、可折叠信息区、区块导航及图片入口；未编辑、未进件 |
| LIVE-CONFIG | Dev `/#/config/feature-flags` | 已见功能开关及“重新读取”；未切换开关。当前 checkout 未定位到同名路由页面源码，禁止推定实现一致 |
| LIVE-ORDER | 本轮订单列表、组合筛选及操作组已验证记录 | 只支持订单样本，不能证明全部基础控件及全局动作收纳策略 |
| CODE-PRODUCT | `src/views/product/add/index.vue`、`product/add/vabAutoComponents/ProductDetailEditor.vue`、`SpecManageDialog.vue` | 商品抽屉、树选择、图片/视频、规格、富文本；含旧尺寸和手写布局，不能照抄为新规范 |
| CODE-BRAND | `src/views/product/brand/vabAutoComponents/BrandFormDialog.vue` | Schema 弹窗、文本、上传、textarea、Switch 的已有消费者；本轮未打开品牌弹窗 |
| CODE-STORE | `src/views/store/list/index.vue`、`store/list/vabAutoComponents/StoreDetailDrawer.vue`、`store/detail/index.vue` | 列表、抽屉详情与独立路由详情分别存在，不把两种容器的页签集合合并 |
| CODE-AFTERSALE | `src/views/sales/salesManagement/aferSales/index.vue` | Tooltip、Tag、时间值、范围查询、远程选择和操作组；本轮未重新操作售后页面 |
| CODE-CORE | `types/schemaForm.ts`、`library/components/VabSchemaForm/index.vue`、`VabSchemaTable/index.vue`、`VabDetailPage/index.vue` | 控件能力、Schema 消费点、空态、加载与重试；并非所有状态均已运行验证 |
| CODE-MEDIA | `library/components/VabUploadImage/index.vue`、`VabUploadImageList/index.vue` | 单图、多媒体、预览、加载与失败占位；未执行真实上传 |
| RULES | `page-overview.mdc`、`form-page.md`、`buttons-status-feedback.md`、`table.md`、`data-format.md` | 现行工程及产品规范；与当前页面不一致时记录差异，不将旧页面问题升级为规范 |

本轮源码摘要与运行读取范围见 `docs/verification/component-catalog-2026-10-28.json`。记录结构和控件，不复制业务记录、联系方式、证照或真实订单数据到样例。

## 3. Token 与密度契约

| 维度 | 规范引用 | 消费方式 |
| --- | --- | --- |
| 主色与语义色 | `--el-color-primary/success/warning/danger/info` | Button、Tag、反馈各按自身语义使用，不以颜色创造新业务状态 |
| 文字与占位 | `--el-text-color-*`、`--el-font-size-*` | 标签、输入、辅助说明分别引用；同组动作不单独改变字号 |
| 背景、边框、圆角 | `--el-fill-color-*`、`--el-border-color-*`、`--el-border-radius-*` | 组件状态统一，组合连接处由组合组件控制 |
| 间距 | `--spacing-1` 至 `--spacing-6` | 图标文字、组件组、字段、区块分别使用现行语义档位 |
| 密度 | `.cursor/rules/page-overview.mdc`、`src/utils/layoutDensity.ts` | Admin 使用 slot 的 `elSize` 或密度工具；不能全站固定 default |
| 运行快照 | Skill `assets/runtime-baseline.json` 与 `assets/prototype-ui/tokens.css` | 当前原型主题样本，不替代全部环境和全部密度的主题定义 |

订单原型组合目前只验过 default 密度；向其他页面或密度复用前补相应状态样例。局部原型不能反向要求 Admin 写死尺寸。

## 4. 基础组件目录与使用契约

下表“需覆盖状态”是组件样例的验收范围，不代表本轮已经全部验证。业务限制、选项、必填、默认值和权限由材料及调用方给出。

| ID / 组件 | 真实实现与来源 | 使用契约 | 需覆盖状态 |
| --- | --- | --- | --- |
| BASE-001 Button | `el-button`；商品、门店、订单 | 主/次/文字/危险分层；表格动作使用 text，尺寸跟随密度。执行动作与导航链接分开 | 默认、hover、focus、disabled、loading；图标+文字 |
| BASE-002 Link | `el-link`、`DocNoLink`；门店名、单号 | 导航到对象；复制编号使用 `BizNo`，不把全部可点击文字都做按钮 | 默认、已访问（支持时）、长文本、键盘触发 |
| BASE-003 Input / Textarea | Schema `input/textarea`；商品名、品牌描述 | Label、placeholder、辅助说明和错误分层；maxlength 取字段契约 | 空、已填、focus、clear、readonly、disabled、error、长文本 |
| BASE-004 数值输入 | Schema `inputnumber`；范围查询 | 精度、单位、上下限取业务字段；编号/电话不是可运算数值，不能误用步进器 | 空、零、负数（允许时）、边界、禁用 |
| BASE-005 Select | `el-select`、Schema `select`；商品品牌、门店筛选 | 编辑值是 code/value，展示 Label；是否清空、搜索、多选由字段定义 | 空、选中、打开、搜索无结果、清空、禁用 |
| BASE-006 多选 Select | 商品 `saleTagIds` | 保存数组值；折叠标签与 Tooltip 使用现有能力，不把文本逗号拼接当值 | 单项、多项、折叠、移除、禁用 |
| BASE-007 RemoteSelect | `VabRemoteSelect`；Schema remoteConfig | 请求、分页、搜索字段和回显对象遵从真实契约；父级条件持续约束搜索/加载更多 | 初始、加载、有值回显、搜索、无结果、加载更多、失败待核验 |
| BASE-008 TreeSelect / Cascader | 商品 `el-tree-select`；分类 `CategoryEditPanel` | 层级选择记录 node key、选中范围和叶子限制；本轮读到的是 TreeSelect，不能声称 Cascader 已验 | 收起、展开、父/子节点、清空、禁用；Cascader 待来源 |
| BASE-009 Radio | 商品类型、来源、是否计重；Schema `radio` | 单选值与标签分开；不从单选组自动推导字段必填 | 未选（允许时）、选中、禁用项、禁用组 |
| BASE-010 Checkbox | 商品销售渠道；表格选择 | 表单组选多个值；表头半选代表部分行选择。两种用途不可共用业务处理器 | 未选、已选、半选（表格）、禁用、键盘 |
| BASE-011 Switch | 功能开关运行页；品牌/分类源码 | 布尔或枚举值按调用方映射；是否即刻保存不能由 Switch 决定；列表启停仍按项目操作列规则 | 开、关、禁用、提交中/失败回退（实际调用支持时） |
| BASE-012 Date / DateTime / Range | Schema 日期族、订单时间 | 日期与时间精度、序列化、默认范围、快捷项均来自字段契约；维度前缀属于组合层 | 空、有值、日历、范围选择、清空（允许时）、禁用 |
| BASE-013 Tag | `el-tag`；门店状态、售后状态 | Label、语义色与业务映射分开；普通状态 Tag 不承担标签编辑行为 | 各已确认语义、长标签、空值；可关闭只限已有用途 |
| BASE-014 Icon | `VabIcon`、Element Plus icons | 使用真实资产与原比例，记录语义、尺寸 Token、是否装饰；不以 Unicode 字符代替 | 随文字、独立按钮、禁用、旋转/加载（适用时） |
| BASE-015 Image / Preview | 上传组件、商品与门店图片入口 | 缩略图、预览图和持久化标识分开；禁止假数据补图 | 已加载、加载中、缺图、失败、预览、关闭 |
| BASE-016 Upload | `VabUploadImage/List`；商品、品牌 | `objectKey` 与展示 URL 分开；类型、数量、大小取当前业务配置，不把商品限制写成全局限制 | 空、上传中、完成、失败、预览、移除、禁用/只读 |
| BASE-017 Tooltip / Popover | 售后商品摘要、Schema 表头提示 | 提供辅助信息；完整业务详情不塞入 Tooltip；触发与关闭按已有组件 | 展开、收起、长内容、可用键盘路径待验 |
| BASE-018 Tabs | 商品/门店/订单页面 | 选中值是稳定 key；懒加载和保留状态依页面契约，不因视觉统一改变取数 | 默认、切换、滚动溢出、禁用（支持时） |
| BASE-019 Dropdown | 商品/门店/订单操作 | 菜单项来自已允许动作；组件只转交事件，不推断权限或执行写请求 | 打开、关闭、禁用项、键盘、危险项 |
| BASE-020 Pagination | `VabSchemaTable` | 与表格同密度；页码、总量、pageSize 与请求绑定，原型数据需明确为样本 | 首/末页、单页、空列表、页容量改变 |
| BASE-021 Loading / Empty / Result | `VabDetailPage`、`VabSchemaTable` | 加载、无数据、搜索无结果、失败各自表达；失败可重试时沿用调用方 reload | 加载、空、失败、重试恢复；不能把失败显示成空数据 |
| BASE-022 Alert / Message / Confirm | 门店/售后源码及反馈规范 | 页面持续异常用 Alert；操作结果用 Message；危险操作按项目确认规则；不伪造成功 | 信息、警告、错误、可关闭/不可关闭、确认/取消 |

## 5. 通用组合与页面模板

| ID | 职责和已有实现 | 输入/事件边界 | 样例来源与待补 |
| --- | --- | --- | --- |
| PATTERN-001 | Schema 列表：查询、工具栏、表格、分页 | columns/request/actions/slots；数据权限及接口由页面提供 | 商品、门店、订单；列配置、选择、空态不能只靠默认截图 |
| PATTERN-001/query-group | 维度选择 + 值控件；原型 `OctoQueryGroup` | dimension/options/value slot；不决定查询字段和清空策略 | 订单时间与买家已验证；其他长度/密度待验 |
| PATTERN-002 | 详情生命周期；`VabDetailPage` 及 Drawer/Dialog | request、detail slot、reload；业务编辑权限在页面 | 门店抽屉已打开；失败重试目前代码已读 |
| PATTERN-003 | 详情标题、区块、分栏、页签；Header/Section | 标题、状态、动作、区块 slot；不擅自添加页签 | 门店详情区块与页签运行已见 |
| PATTERN-004 | 行操作组；Schema actions / 原型 `OctoTableActions` | 已决定可见性的 actions + action 事件 | 订单收纳策略仅适用订单；跨模块策略见差异记录 |
| PATTERN-005 | 表单字段与分组；`VabSchemaForm` | fields/model/rules；字段及校验来自业务契约 | 品牌、分类及 Schema 核心代码已读 |
| PATTERN-006 | 编辑容器；`VabSchemaFormDialog/Drawer` | 打开、回显、提交、取消、loading；不在展示组件造提交结果 | 品牌弹窗代码已读；商品当前是手写抽屉，需保留差异 |
| PATTERN-007 | 层级管理：树/列表 + 编辑区 | 选中节点、层级字段、保存事件分开 | 分类编辑代码已读，实际页面状态待验 |
| PATTERN-008 | 配置项：名称、说明、值及操作反馈 | 是否立即保存、重读和失败处理按现有配置接口 | 功能开关运行只读已见，代码对应待定位 |

模板至少覆盖：普通列表、带页签列表、列表+详情抽屉、简单编辑弹窗、复杂编辑抽屉、独立详情、树形管理、配置页。它们是组合选择，不要求把现有复杂页面机械改写成一套大模板。

## 6. 跨业务组件职责

已有 `BIZ-001` 至 `BIZ-006` 保持其定义。新增候选先记录职责和来源，不先造公共 API。

| ID | 职责 | 来源与边界 |
| --- | --- | --- |
| BIZ-007 | 商品规格编辑 | `product/add`、`SpecManageDialog`；类型、规格值、SKU 与排序属于商品逻辑，不下沉到 Input/Table 基础组件 |
| BIZ-008 | 门店概况与地址信息 | `StoreDetailDrawer`、门店基础信息区；门店、主体、客户和收货人身份分别映射，不合成万能“用户卡片” |
| BIZ-009 | 业务标签展示与选择 | `BusinessTagList/Picker`，商品/门店/售后使用位置；场景、绑定和权限属于业务适配，不能仅用状态 Tag 代替 |
| BIZ-010 | 自定义字段面板 | `CustomFieldPanel`；对象类型、字段定义、值和权限来自实际契约；当前 WIP 不代表全端发布 |
| BIZ-011 | 富文本商品描述 | `ProductDetailEditor`；当前绑定 HTML、上传回调、禁用与内容清洗；不是基础 Textarea，也不默认开放任意 HTML |

## 7. 差异与不能直接推广的规则

1. **操作收纳阈值**：订单现有逻辑为超过两个动作进入更多；按钮规范描述同区超过三个收纳，售后代码又使用不同触发样式。保留各来源差异。`OctoTableActions` 当前实现是订单适配，不能不经核验推广到所有页面。
2. **密度**：Admin 按布局密度选 `elSize`；本轮原型只验证 default。固定默认高度不是全系统密度规范。
3. **表单技术形态**：商品新增仍有手写 `el-form`、硬编码宽度及规格表尺寸；工程要求新表单走 Schema。记录为现状差异，不复制其硬编码，不在本轮顺便迁移。
4. **TreeSelect 与 Cascader**：商品源码为 TreeSelect；运行看到层级入口不等于两种控件均已验证。
5. **校验时机**：打开商品新增时已见供应商错误提示；现行表单规范要求按字段校验时机处理。这里只记录差异，不能据此规定全局“打开就报错”。
6. **详情页签**：门店独立路由和抽屉页签不同，以各自使用入口记录，不合并为虚构的通用详情页。
7. **功能开关**：运行页已见，当前本地路径未对应；不能从可访问页面推断本地分支已包含实现。

## 8. Figma 样例与生成门槛

- Token Page 放语义变量及已核对的主题/密度映射；Basic Page 放 `BASE-*` 的真实可复用组件与状态；Business Page 放组合及业务职责；页面草稿用组件实例组成。
- 每个样例带规范 ID、来源定位、主题/密度、状态、实现位置及验证等级；用脱敏合成内容，不导入真实客户数据。
- 只完成目录的条目不得标“已建库”；只完成代码不得标“已入 Figma”；截图不得冒充可编辑组件或组件实例。
- 原型前调用 Skill：读业务字段与本目录 → 选择真实组件 → 补缺失状态样例 → 组合页面 → 验证。原型后调用：定位使用偏差 → 回到组件修正 → 重生成受影响页面。
- 本轮优先补跨页面基础控件状态，再补表单/详情模板；订单仅作回归页。只有材料中存在的行为进入正式规范，未知业务规则保持待确认。
- 发布/定稿前分别核对代码样例、Figma 实例和实际页面；包结构检查不证明视觉或业务验收。

当前交付：上述目录、使用契约、来源及差异记录。当前待交付：跨模块完整交互样例、对应 Figma 基础组件/状态实例、模板重生成与各端验收。订单现有两个原型组合继续保留，不能冒充已完成全库。
