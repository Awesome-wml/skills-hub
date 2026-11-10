# HTML 原型复用现有工程组件

这条入口把现有 Vue / Element Plus / Vab 源码编译成浏览器资源。产品仍可编辑 HTML，工程组件负责实际渲染和交互。没有新增一套 Table、Form 或 Dialog 实现，也不依赖 Storybook。

## 使用

开发更新组件资源（在 Admin 仓库根目录，使用项目现有依赖）：

```sh
mise exec node@22.23.1 -- node prototype-runtime/build.mjs
mise exec node@22.23.1 -- node prototype-runtime/package-examples.mjs
python3 -m http.server 4390 --bind 127.0.0.1 --directory prototype-runtime/dist
```

打开 `http://127.0.0.1:4390/index.html`。将整个 `dist` 交给产品或放入 LFerp 静态目录；产品修改 `index.html`、`page.js`、`fixtures.js` 即可，不需要构建 Vue 工程。修改组件则由开发重新构建资源并更新版本。`dist` 是构建产物，例子正文在 `examples/`，不在两处手工维护。

## 三个案例

| 案例 | 验证的差异 | 复用方式 |
| --- | --- | --- |
| 零售订单 `#orders` | 组合日期、选择列、商品摘要、Tag、操作组、样本查询 | HTML 调用真正的 VabSchemaTable、DocNoLink、VabSchemaForm |
| 波次管理 `#waves` | 只读基础表单、宽明细表、数量差异高亮、空明细 | HTML 列表调用原有 WaveDetailDialog，整个业务弹窗原样编译 |
| 波次模板 `#templates` | 分组表单、三列布局、单选、禁用、流程联动、验证与保存回读 | HTML 列表调用原有 WaveTemplateEdit，整个业务表单原样编译 |

第二个波次是数量差异样本，第三个波次为空明细。波次模板可编辑并模拟保存，刷新还原。模板的“一键出库 / 摘果 / 播种”联动直接来自原组件，不在 fixtures 或 HTML 重写。

## 来源与边界

- 用户确认：开发现有组件先行；HTML 可以加载工程组件；挑选多个典型案例打通。原型本身承担展示与验收，不另建组件展示系统。
- 设计师订单稿：Figma `XKraFkdmnv4ZTSQLiIbjGO` 的 `12:564`、`4:12`、`34:927`；此前读取的材料保存在任务 artifacts 中。订单列组合沿用已核对结构；本轮展示值改为虚构样本。
- 现有 Dev：`/#/fulfillment/policy/wave-template` 列表、新增表单及流程选项；`/#/fulfillment/outbound/wave` 列表、单号详情和商品明细。本轮已实际打开。仅打开、读取、取消，没有提交业务数据。
- 源码：`library/components/VabSchemaTable`、`VabSchemaForm`、`VabSchemaFormDialog`、`VabDialog`；`src/views/fulfillment/outbound/wave/vabAutoComponents/WaveDetailDialog.vue`；`src/views/fulfillment/policy/wave-template/vabAutoComponents/WaveTemplateEdit.vue`。实际文件摘要和 WIP 见构建产物 `provenance.json`。
- 没有仓储设计师新稿；仓储案例按现有系统与其实现复用，不自行重排业务。
- 组件代码直接 import，不复制到原型维护。环境适配是必要技术约束：替换依赖登录的 Store、接口、权限和偏好入口；显式注入模拟服务，未提供服务时报错。
- 主题使用已有运行样本覆盖值；其与本地主题默认值存在已记录差异。`theme.css` 为构建时复制的快照，原型页面没有组件内部 CSS 覆盖。
- HTML 原型字段仅是样本契约，不能反向充当正式 SDK。权限、后端过滤、分配库存、生成波次、分配记录、订单售后与清分导出不在本轮业务实现范围；相关入口明确提示未执行。订单详情仅为样本摘要。
- 本轮列表是为组件通路保留的典型子集，未声称完整迁移三个正式页面的全部查询、列偏好、审计、导入导出和状态。

## 维护一个源

组件和交互源在现有工程；Markdown 只引用组件、配置和验收，不再抄写组件实现。Figma 保存设计意图、修改点和确认节点。设计有变化，先判断是页面组合还是组件能力：组合改 HTML / 页面配置；组件能力改原组件，构建一次，所有原型共同使用这份资源。每次交付包含 `provenance.json` 和 `case-manifest.json`，不会自动追随未评审的 WIP。

HTML 的组件标签/属性使用 kebab-case。包含 camelCase 的命名插槽必须用动态参数，例：`v-slot:[slots.waveno]`，JS 中 `slots.waveno = 'cell-waveNo'`；直接写 `#cell-waveNo` 会被浏览器转为小写，导致链接或状态组件丢失。脚本/样式从本地加载；HTML CSP 禁止业务网络请求。

## 已知组件差异

这是本地源码构建，不能等同已部署代码。现有 SchemaTable 的组合查询采用“下拉标签＋值控件”；与之前运行截图的盒装前缀存在差异，未用原型 CSS 掩盖。组合日期的 `search.defaultValue` 未被当前组件初始化逻辑消费；案例使用空范围，不伪造已有默认日期恢复能力。已有 DocNoLink 的布尔 underline 触发 Element Plus 弃用提示，未修改生产组件。完整视觉定稿和跨设备安装仍需独立验收。
