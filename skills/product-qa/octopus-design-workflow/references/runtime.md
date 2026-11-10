# 直接运行工程组件的 HTML 原型

选择组件和组合方法见 [组合与应用](composition.md)：按 R1 列表、R2 只读详情或 R3 编辑表单找到真实入口与状态检查。

用户要求复用已有 Element / Vab 时优先走此入口。原型本身就是组装、展示和评审入口，不再引入 Storybook、第二份组件实现或要求全库盘点完成后才生成页面。

有 Admin checkout：读取 `prototype-runtime/README.md`，从现有源码构建。只有 Skill：把 `assets/prototype-runtime/` 整目录复制到目标原型目录，使用其中已构建的 JS/CSS；先读 `provenance.json` 识别版本和 WIP，不把包内快照声称为当前线上版本。

## 实际编辑的文件

- `index.html`：组件与插槽组合，仍是产品可编辑的 HTML。
- `page.js`：列/字段配置、页面交互、组件调用。
- `fixtures.js`：虚构样本和显式模拟服务；模拟保存只影响本页内存。
- `runtime.js` / `runtime.css`：工程编译产物，不手工编辑，也不让 AI 再仿写组件。
- `theme.css`：已有主题运行快照；主题更新从权威源重新生成/复制，不在各页面维护尺寸和颜色。

最小调用：

```js
const { ref } = OctopusPrototype.Vue
OctopusPrototype.mount({ setup() { /* 返回页面配置与事件 */ } }, '#app', {
  services: { /* 根据所用业务组件显式提供 mock 服务 */ },
  warehouse: { warehouseId: 'demo', warehouseCode: 'DEMO', warehouseName: '演示仓库' },
  permissions: [],
  layoutDensity: 'default'
})
```

当前包支持实际 SchemaTable、SchemaForm、SchemaFormDialog、VabDialog、DocNoLink、BizNo，以及原有 WaveDetailDialog、WaveTemplateEdit。尚不包含上传等全库能力；缺失能力回到已有工程选实现并构建，不在 HTML 假冒组件。`services` 的键必须对应运行适配中的调用名；缺服务会报错，不连接正式 SDK 或默认返回成功。

## HTML 特有约束

浏览器会将属性名转为小写：组件/props 用 kebab-case；camelCase 命名插槽用 `v-slot:[slots.waveno]`，JS 将该值设为 `'cell-waveNo'`。不要直接写 `#cell-waveNo`，它会失效。控件状态通过真实 props / slot 使用，不改内部 DOM 或给 `.el-*` 添加页面修补。

列表用 `request` 接样本查询；`data` 是静态明细模式，会跳过查询与分页。`daterange-group` 当前不消费 `search.defaultValue`，不要声称已恢复默认日期，也不要通过不可见参数制造界面与查询不一致。确需默认范围时修复原组件并验证后重新构建。

## 两个入口

生成前：读取产品逻辑及设计来源，选择已存在组件和真实用法，组装 HTML 与 mock，验证。

生成后：读取原型，按权威来源确定字段/事件映射，用现有组件替换对应区域，重新绑定交互并验证。它是有语义的替换，不是对任意 HTML 加一份 CSS 就保证一致。

用订单、波次明细、波次模板选择最接近的真实用例即可，不强制使用全部三个案例。样例是可运行的用法，不另立业务事实来源。设计变化先落实原组件或页面组合，Figma 记录意图和确认结果，Markdown 引用同一实现及版本。

## 验收

先检查默认、交互和受影响状态；检查命名插槽是否真正渲染链接/Tag，选择框半选/全选，按钮密度，复杂表单联动和模拟保存回读。原型 CSP 应保持禁止业务网络；mock 不可宣称真实权限或业务 UAT。记录运行源摘要、样本范围、差异和未覆盖项。新组件资源与页面必须重新打包摘要，不能只更新 Markdown 或 Figma 就宣称运行页面已更新。
