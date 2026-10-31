---
name: store-register-h5-dev
description: storeRegisterH5 前端 H5 开发规范。用于 uni-app Vue2 页面、组件、样式、配置修改及后端接口联调。
license: Proprietary
metadata:
  author: storeRegisterH5
  version: "1.0"
---

# storeRegisterH5 前端 H5 开发规范

## 触发条件

当用户要求开发本项目任何前端功能时使用此 skill，包括但不限于：

- H5 页面新增、改版、修复
- uni-app Vue2 页面、组件、样式调整
- `pages.json`、`manifest.json`、`App.vue`、`main.js`、`uni.scss` 修改
- `colorui/` 组件复用或导航样式调整
- 与后端接口、字段映射、登录态、提交流程相关的联调处理

---

## 一、项目概述

- **项目名称**：`storeRegisterH5`
- **项目定位**：仅前端 H5 项目，技术栈为 `uni-app + Vue 2`
- **后端边界**：后端代码不在本仓库；凡涉及服务端能力、接口字段、状态流转、鉴权规则，统一按**联调事项**处理，不在本仓库直接实现后端代码

### 当前仓库结构

```text
.
├── App.vue
├── main.js
├── pages.json
├── manifest.json
├── uni.scss
├── pages/
│   └── index/index.vue
├── colorui/
│   ├── main.css
│   ├── icon.css
│   └── components/cu-custom.vue
├── static/
│   └── logo.png
└── ui/
    ├── pencil-new.pen
    ├── qKEmY.png
    └── F7kXtu.png
```

### 技术约定

| 模块 | 技术栈 | 说明 |
|---|---|---|
| 页面层 | UniApp + Vue 2 | 仅前端 H5 |
| 样式层 | SCSS + ColorUI | 已存在 `colorui/` 资源 |
| 全局配置 | `pages.json`、`manifest.json`、`uni.scss` | 页面注册、平台配置、样式变量 |
| 设计参考 | `ui/pencil-new.pen` + `ui/*.png` | 页面还原以设计稿为准 |

---

## 二、开发任务管理流程

### 长任务沟通约定

1. **长任务默认完成后统一汇报**
   - 汇报至少包含：完成项、关键改动、验证结果、风险点、待确认项
2. **执行过程中默认不频繁阶段性播报**
   - 仅在阻塞、方案分叉、接口不明确、存在高风险改动时同步
3. **用户要求优先**
   - 若用户要求边做边汇报，以用户要求为准

### 需求 / Bug 类型识别

1. **需求类**
   - 关键词：新增、改成、调整流程、重做页面、补一个功能、接入新接口
2. **Bug 类**
   - 关键词：报错、不生效、样式错乱、字段不对、联调失败、页面白屏、接口异常

### 需求类固定流程

1. 先阅读相关页面、配置、设计稿与现有代码
2. 在项目根目录 `docs/` 下新增分析文档
   - 文件名建议：`<功能名称>分析.md` 或 `<功能名称>方案.md`
3. 分析文档至少包含：
   - 需求背景
   - 当前现状
   - 目标方案
   - 涉及页面/文件
   - 接口联调点
   - 风险与待确认项
4. **等待用户确认分析文档后**
   - 再在 `dev-plan/` 下创建开发计划并开始编码
5. 开发时逐项完成、逐项勾选，不允许批量标记完成

### Bug 类固定流程

1. 先阅读相关页面、配置、样式和接口调用代码
2. 分析完成后直接修复并验证
3. 默认不等待二次确认，不先写分析文档
4. 若修复过程中确认它本质上是需求变更，立即切回**需求类流程**

### 计划文件格式

```markdown
# <功能名称> 开发计划

## 需求概述
<简要描述>

## 任务列表
- [ ] 1. 任务描述
  - 涉及文件：`pages/...`
  - 说明：需要完成的内容

## 完成记录
| 任务 | 完成时间 | 备注 |
|---|---|---|
```

---

## 三、设计稿与页面还原规则

### 设计稿优先级

1. 优先参考 `ui/pencil-new.pen`
2. 如当前环境无法直接读取 `.pen`，以 `ui/qKEmY.png`、`ui/F7kXtu.png` 等导出图作为视觉依据
3. 未看设计稿前，禁止凭想象大幅改 UI

### 页面开发原则

- 页面使用 `pages/<模块>/<页面名>.vue`
- 所有新页面都必须在 `pages.json` 中注册
- 页面标题必须在 `pages.json` 中显式配置，不保留默认 `uni-app`
- 设计稿中的视觉尺寸、间距、色彩、圆角需尽量统一，不要每页各写一套
- `ui/` 仅作为设计参考，运行时代码不得直接引用该目录素材

### 导航栏规则

**默认使用系统导航栏。只有在页面确实需要自定义导航头时，才使用 `colorui/components/cu-custom.vue`。**

| 模式 | 触发条件 | `pages.json` 配置 | 页面实现 |
|---|---|---|---|
| 系统导航栏 | 默认方案 | 仅配置 `navigationBarTitleText` | 页面内不渲染 `cu-custom` |
| 自定义导航栏 | 设计稿明确要求特殊头部 | `navigationStyle: "custom"` | 页面内使用 `cu-custom` |

关键约束：

- 不允许系统导航栏和 `cu-custom` 混用
- 设了 `custom` 却不渲染 `cu-custom`，页面会缺头部
- 未设 `custom` 却渲染 `cu-custom`，页面会出现双导航

---

## 四、前端代码规范

### Vue / UniApp 规范

- **统一使用 Vue 2 Options API**
- 优先使用 UniApp 组件：`view`、`text`、`image`、`scroll-view`、`input` 等
- 页面样式统一使用 `<style lang="scss" scoped>`
- 页面逻辑放在 `data`、`computed`、`watch`、`methods` 中，避免无序堆叠在模板里
- 能用计算属性表达的展示状态，不要在模板里写复杂表达式

### 样式规范

- 优先复用 `uni.scss` 中已有变量
- 若项目需要新的品牌色、间距、圆角变量，先补到 `uni.scss` 再使用
- 避免在多个页面硬编码相同颜色、字号、间距
- H5 页面优先使用 `rpx` 作为设计还原单位，必要时结合 `%`、`flex` 提升适配性
- 样式以移动端优先，避免依赖桌面端宽屏布局

### ColorUI 使用规范

- 仓库已存在 `colorui/`，有合适现成样式时优先复用
- `cu-custom` 主要用于自定义导航栏，不要把它当通用布局容器滥用
- 没有明显复用价值时，不要为了“组件化”强行拆很碎

### 组件与目录规范

- 同一结构在 2 个及以上页面重复出现，再考虑抽成 `components/`
- 页面级请求、页面级状态不要塞进全局组件
- 未来若新增公共模块，推荐目录：

```text
api/          # 接口模块
components/   # 可复用组件
utils/        # request、storage、format 等工具
```

---

## 五、接口联调规范

### 联调边界

- 本仓库只处理**前端请求、展示、提交流程、异常反馈**
- 后端能力缺失、字段不匹配、返回结构不稳定时，需明确记录为“后端待配合事项”
- 禁止在前端代码里臆造后端已存在的字段、状态或枚举

### 请求层规范

1. 页面中**不要直接散写 `uni.request`**
2. 首次接接口时，优先补齐统一请求封装，例如：
   - `utils/request.js`
   - `api/<module>.js`
3. 页面只调用 `api` 方法，不直接拼 URL
4. token、基础地址、超时、错误提示、登录失效处理，统一放在请求层

### 字段一致性

- 前端字段名必须与后端返回字段保持一致
- 无后端确认时，不要先起一个“看起来顺手”的别名
- 枚举值、状态文案、是否可点击等逻辑，必须基于接口合同或联调结果

### 联调时的最小交付要求

每个新增接口至少要明确：

- 请求地址
- 请求方法
- 入参字段
- 返回字段
- 空态/错误态处理
- 后端待配合项

### 后端未就绪时的处理方式

- 可先用 mock 数据推进页面开发
- 但 mock 字段必须贴近最终接口，不允许后期大面积重命名
- 页面中需要显式保留加载态、空态、报错态，避免只做“静态好看”

---

## 六、页面开发模板

### 页面模板

```vue
<template>
  <view class="page">
    <view class="page__body">
      <text class="page__title">{{ title }}</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      title: ''
    }
  },
  onLoad(options) {
    this.initPage(options)
  },
  methods: {
    initPage(options) {
      console.log(options)
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
}
</style>
```

### 接口模块模板

```javascript
import request from '@/utils/request'

export function getExampleList(data) {
  return request({
    url: '/example/list',
    method: 'POST',
    data
  })
}
```

---

## 七、实现后复核清单

### 前端必查

- [ ] 新页面是否已注册到 `pages.json`
- [ ] 页面标题是否已改为真实业务标题
- [ ] 自定义导航栏是否正确配置 `navigationStyle: "custom"`
- [ ] 模板中是否引用了不存在的字段
- [ ] 样式是否尽量复用了公共变量，而非重复硬编码
- [ ] H5 视口下是否存在明显溢出、遮挡、错位
- [ ] 图片、图标、静态资源路径是否有效

### 联调必查

- [ ] 页面是否通过统一请求层发起接口调用
- [ ] 入参/返回字段是否与接口合同一致
- [ ] 是否处理了 loading、空态、错误态、重复提交
- [ ] 是否标注了后端待配合事项

### 收尾必查

- [ ] 若为验证临时启动过本地预览/调试服务，验证后应关闭
- [ ] 若新增了分析文档/计划文档，内容是否与最终实现同步
- [ ] 若用户要求提交 commit，提交信息默认使用中文

---

## 八、关键原则

- **需求类先分析，确认后开发**
- **Bug 类分析后直接修复**
- **只做前端 H5，本仓库不实现后端代码**
- **接口联调必须写清字段和边界**
- **页面、配置、导航、样式要一起核对，不只盯着模板**

