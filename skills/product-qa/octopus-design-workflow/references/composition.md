# 组件怎么组合、怎么应用

版本：0.9.4。适用：当前包的订单、波次详情、波次模板运行案例。本文是用法正文，Figma 是其可视化说明；组件实现仍在 Admin 工程。本文及打包资源为本地工作稿，尚未共享发布或三方定稿。

规范执行版（唯一设计源）：Figma [冷丰ERP·UI规范与组件库](https://www.figma.com/design/izYwAFHoZnkV6AxgkhYgyC) `izYwAFHoZnkV6AxgkhYgyC`（2026-11-09 登记，封面 v2.2）。视觉规范的 Token/组件/页面/图标以该库为准：[01 Token](https://www.figma.com/design/izYwAFHoZnkV6AxgkhYgyC?node-id=1-86)（权威，六节冲突裁决）、[02 基础组件](https://www.figma.com/design/izYwAFHoZnkV6AxgkhYgyC?node-id=1-87)、[03 业务组件](https://www.figma.com/design/izYwAFHoZnkV6AxgkhYgyC?node-id=1-88)（28 项状态挂色矩阵、ATOM/BIZ 目录）、[04 页面模板](https://www.figma.com/design/izYwAFHoZnkV6AxgkhYgyC?node-id=1-89)、[06 图标库](https://www.figma.com/design/izYwAFHoZnkV6AxgkhYgyC?node-id=19-2)（源稿矢量 `lf-icon-*`）。该库声明与 Octopus 规范冲突一律以 01 Token 页为准，工程现状色差按「工程跟进」处理。版本与取值疑义先查其 [05 变更记录](https://www.figma.com/design/izYwAFHoZnkV6AxgkhYgyC?node-id=1-90)；读取走 figma MCP（先 create_session，get_metadata 无 nodeId 时列顶层页）。

先看 [重点样式与实际组合](https://www.figma.com/design/1XfBEflYG4rZ5KlXdvU4tP?node-id=53-3)（旧工作文件的组合教学节点，样式取值与执行版冲突时以执行版 01 Token 为准），再按 R1/R2/R3 读取用法。视觉板包含按钮普通/悬停/禁用、输入普通/聚焦/禁用/校验、五类 light Tag、checkbox 未选/选中/半选/禁用、radio 状态、日期筛选、表格与分页、只读详情差异行、编辑表单联动。主件保留在「02 基础与语义组件」，使用实例构成样例，不生成第二套 HTML 控件。

样式依据：2026-10-29 实际打开当前工程编译样例，读取 DOM 样式，并核对 `VabSchemaTable`、`WaveDetailDialog`、`WaveTemplateEdit` 与主题。样式板是局部组合示范，未展示的完整字段不能由示范反推删除。数量列右对齐；普通操作默认 primary，带 children 的“更多”默认 info；标签浅底/边框采用工程主题 light 变量，不将透明度错误渲染成实底。日期差异仍按 R1 的已知未定项处理。当前 Figma 不提供运行页的 Segoe UI / system-ui 字体，沿用 Noto Sans SC 并注明字体差异，不声称逐像素一致。

Figma 对应页：[06 组合与应用](https://www.figma.com/design/1XfBEflYG4rZ5KlXdvU4tP?node-id=45-3)。直接定位：[R1 订单](https://www.figma.com/design/1XfBEflYG4rZ5KlXdvU4tP?node-id=45-10)、[R2 波次详情](https://www.figma.com/design/1XfBEflYG4rZ5KlXdvU4tP?node-id=45-42)、[R3 波次模板](https://www.figma.com/design/1XfBEflYG4rZ5KlXdvU4tP?node-id=45-67)。这些是组合教学节点，不是发布组件或 Code Connect 自动映射。

## 已确认的分工（2026-10-29）

1. **LFerp 承载产品逻辑**：沿用已确认的页面、流程、字段和交互，读取现有材料，不重新写一遍 Spec。
2. **已有系统＋设计师稿提供视觉规范**：确定 Token、组件样式、页面结构和组合方式。
3. **Skill 负责转换和校正**：把 LFerp 中的业务表达映射到现有 Element／Vab 组件，生成规范原型。
4. **Figma 展示规范与本轮变化**：放组件状态、典型完整页面，以及确实发生变化的局部说明。

执行时沿用 LFerp 已确认的业务材料及定位；Markdown 维护组件指导、来源引用与本轮差异，不重复维护另一份业务 Spec。未确认内容或来源冲突单列核对，不因视觉校正擅改业务。NEW / CHANGED 只标本轮实际新增或修改，引用原 LFerp 内容；未变化的流程不重复描述。当前 Figma 的局部样式与教学示例不能冒充典型完整页面已经交付。

## 从场景选组合

| 需求 | 复用组合 | 页面负责 | 原组件负责 |
| --- | --- | --- | --- |
| 查询、选择、查看订单 | VabSchemaTable + DocNoLink + ElTag | columns、request、单元格 slots、actions | 筛选控件、checkbox 状态、表格密度、分页、操作按钮 |
| 单号打开只读详情 | WaveDetailDialog 整体复用 | 入口传 row.id、注入样本服务 | VabDialog + 只读 SchemaForm + 静态 SchemaTable、差异行、空明细 |
| 新增 / 编辑 / 查看配置 | WaveTemplateEdit 整体复用 | 调用模式、样本服务、保存后列表刷新 | SchemaFormDialog + 分组字段、三列布局、禁用、流程联动、校验 |

先选择最接近的案例，再按已确认材料调整字段和事件。三个案例不是全站模板，更不能把波次业务联动套用到别的表单。没有适用能力时，定位工程现有组件或明确缺口；不要从 Figma 示意图仿写一套控件。

## R1 订单列表：由列、插槽与操作组合

结构：业务 Tab → VabSchemaTable〔查询区 → toolbar-left → 选择列 / 业务列 / 操作列 → 分页〕。查询与分页由一个 Table 管理，不另叠一套手写查询表单。

1. `columns` 声明字段与列；`search` 声明筛选控件。当前订单时间使用 `control: 'daterange-group'`，组项 `createdRange`、`rangeParamKeys: ['createdStart','createdEnd']`，已核对的时间类型只有“下单时间”。不能自行添加其他类型。
2. `requestOrders` 返回 `{ list, total }`；`row-key="fixtureId"` 是样本稳定 ID，`row-selection` 开启原生选择能力。正式应用必须使用其真实稳定业务 ID，不把 fixtureId 当正式 SDK 字段。
3. 单据号 slot 放 `DocNoLink`，`@open` 绑定该行入口；订单状态和营销类型 slots 使用 `ElTag`。图片/商品摘要、买家摘要是内容组合，不重画底层表格。
4. `toolbar-left` 放已确认的批量操作；`actions` 交给组件生成“查看 / 更多”。自定义按钮与 Tag 消费 slot 的 `elSize`，不要逐个写高度补丁。
5. 真实用法在 `prototype-runtime/examples/index.html` 的订单 section 与 `page.js` 的 `orderColumns`、`orderActions`、`slots`；离线包对应 `assets/prototype-runtime/index.html`、`page.js`。

HTML 最小插槽写法（配置与事件按案例导出到 setup 返回值）：

```html
<vab-schema-table :columns="orderColumns" :request="requestOrders"
  row-key="fixtureId" row-selection :actions="orderActions">
  <template v-slot:[slots.orderno]="{row}">
    <doc-no-link :value="row.orderNo" @open="showOrder(row)"></doc-no-link>
  </template>
  <template #cell-status="{row,elSize}">
    <el-tag :size="elSize" :type="row.statusType">{{row.status}}</el-tag>
  </template>
</vab-schema-table>
```

JS 配套 `slots.orderno = 'cell-orderNo'`。浏览器将 HTML 属性名转小写，所以直接写 `#cell-orderNo` 会使插槽失效；Vue SFC 的使用方式不能不加区分地复制到 HTML。

检查：无结果→重置；单选→半选→全选→清空；单号可点击；Tag 实际渲染；同密度操作按钮等高。当前订单详情只是样本摘要，售后、取消订单等入口不执行业务操作。

已知未定项：本地组件的组合日期使用“下拉标签＋值控件”，与此前运行截图的盒装前缀有差异；当前不初始化 `search.defaultValue`。案例保持空日期范围，不用页面 CSS 或隐藏参数伪装已解决。Figma 原日期草稿不视为定稿。

## R2 波次详情：入口组合，业务弹窗整件复用

结构：列表 `DocNoLink` → `waveDetail.open(row)` → `WaveDetailDialog` → `VabDialog`〔基础信息 SchemaForm / 商品明细 SchemaTable / 关闭〕。

```html
<template v-slot:[slots.waveno]="{row}">
  <doc-no-link :value="row.waveNo" @open="waveDetail.open(row)"></doc-no-link>
</template>
<wave-detail-dialog ref="waveDetail"></wave-detail-dialog>
```

前一 template 放在列表 Table 内，弹窗放在页面根容器内；`slots.waveno = 'cell-waveNo'`。传入行必须含 `id`。保持原组件，不在 HTML 重抄其字段和详情样式。

- `outboundWave.getDetail({waveId})` → `{data}`；`getItemList({waveId})` → `{data:{list}}`，由原型运行适配注入模拟服务。
- 原组件基础字段全部只读，默认 `colSpan=8`，备注占 24；商品明细使用 `:data="details"` 静态模式。不要改成分页 request，也不额外增加查询/勾选。
- 差异行判断来自原组件：状态不为 INITIAL/CANCELED 且数量有效时，`plannedQty - canceledQty > allocatedQty` 标黄。它不是“只要两个数字不同就标黄”。
- 试用：第一个波次看正常明细，第二个看未充分分配的差异行，第三个看空明细；检查关闭与宽表滚动。分配库存、生成波次、分配记录仍未接入。

实现入口：`src/views/fulfillment/outbound/wave/vabAutoComponents/WaveDetailDialog.vue`。商品图片/规格继续复用原 `_shared` 组件。

## R3 波次模板：调用模式，保留原表单联动

结构：列表入口 → `WaveTemplateEdit` → `VabSchemaFormDialog` → `VabSchemaForm`〔基础信息 / 参数〕→ 原校验与保存 → fetch-data 刷新列表。

| 入口 | 调用 | 行为 |
| --- | --- | --- |
| 新增 | `templateEdit.showEdit()` | 默认值与当前仓库来自原组件/注入环境 |
| 编辑 | `templateEdit.showEdit(row)` | 原组件加载详情，仓库与编码不可编辑 |
| 查看 | `templateEdit.showEdit(row, true)` | 只读模式，不能借原型绕开禁用 |

```html
<wave-template-edit ref="templateEdit"
  @fetch-data="templateTable?.fetchData()"></wave-template-edit>
```

| 原组件状态 | 保留行为 |
| --- | --- |
| 一键出库 | 缺量分配、复核设为否并禁用；负库存按原选项可选 |
| 摘果 / 播种 | 负库存设为否并禁用；缺量分配、复核按原组件允许编辑 |
| 查看 | 整体只读 |
| 必填为空 | 原校验阻止保存 |

保持现有三列分组、radio、货主分组合并字段的禁用和原有默认值；这里描述当前组件行为，不重新定义仓储规则。流程判断与 payload 归一化留在原组件，fixtures 只提供选项与数据。

样本服务：`policyManagement` 提供流程/调度选项、模板详情和创建/更新；`dictManagement` 提供现有类型字典；`remoteSelectPresets.getWarehouseOptions` 提供仓库选项。具体键和响应见 `fixtures.js`。不要只返回成功而不保存数据。

检查：新增与编辑、只读、流程切换后的禁用值、空必填、模拟保存后列表回读。模拟保存只改内存，刷新还原，不等于真实权限、后端保存或业务 UAT。

实现入口：`src/views/fulfillment/policy/wave-template/vabAutoComponents/WaveTemplateEdit.vue`。

## 给人和 Skill 的同一条使用路径

产品提供 LFerp 已确认的业务材料入口，Skill 自行读取相关页面、流程、字段和交互，并按已有系统＋设计师稿的视觉规范选用 R1/R2/R3 等适用组合。Figma 展示组件状态、典型完整页面和实际变化；已有适用设计节点时一并引用。开发从同一记录定位真实组件、实现变化并重新构建资源。Figma 节点中的说明是本文的可视化索引；提供了节点链接时，Skill 应实际读取该节点及本文，不凭名称猜用法。

生成前可说：

> 使用 $octopus-design-workflow，按这个 Figma 节点和已确认业务逻辑，参考组合说明 R2 生成 HTML 原型。复用包内实际工程组件，列出配置、插槽、样本服务和需要检查的状态；缺失的能力单独列出。

生成后可说：

> 使用 $octopus-design-workflow，把这份 HTML 按组合说明 R1 校正。依据设计师稿与现有系统确认字段/操作映射，使用真实 SchemaTable、DocNoLink、Tag，验证 checkbox、日期与操作尺寸；报告变化和仍未解决的组件差异。

修改循环：确认字段/交互变化 → 判断组合还是组件能力 → 改页面配置，或改原组件后重新构建 → 检查受影响状态 → 更新本文对应条目与 Figma 变更说明 → 评审。页面问题不要靠 `.el-*` CSS 掩盖，组件变化不要只改 Figma 就声称原型同步。

## 版本和定位

- 运行方法和适配边界：[runtime.md](runtime.md)。例子源码：`prototype-runtime/examples/`；离线资源：`assets/prototype-runtime/`。
- `provenance.json` 记录真实源文件摘要、HEAD 与 WIP；`case-manifest.json` 记录样例资源摘要。使用前核对这两个文件，本文版本不代替工程版本。
- 规范执行版（唯一设计源）：`izYwAFHoZnkV6AxgkhYgyC`，权威 Token/组件/页面/图标入口见文首。组合教学 Figma：`1XfBEflYG4rZ5KlXdvU4tP`；设计师原稿只读。订单结构来自设计师稿 `XKraFkdmnv4ZTSQLiIbjGO` 的 `12:564`、`4:12`、`34:927`，组件样式/状态/操作按用户确认来自已有系统，视觉取值冲突以执行版 01 Token 为准。仓储没有新的设计师稿，按已有系统与组件复用。
- 本机预览：`http://127.0.0.1:4387/component-runtime/index.html#orders`（另有 `#waves`、`#templates`）。这不是团队共享地址；换电脑应使用整个资源包在该机器启动静态服务。
- 当前尚未发布共享 Git 版本，不能把本机路径、localhost 或尚未发布的包当成团队可访问链接。
