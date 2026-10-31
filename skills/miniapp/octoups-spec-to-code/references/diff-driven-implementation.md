# Diff-driven Implementation

当 formal component 已确认，要落真实代码时，不要直接开写。先列 diff。

## 1. 先找三个来源

- formal component：`octoups-user-spec.lib.pen`
- 结果页：`octoups-user-results.pen`
- 当前代码：`miniprogram/components/*`、`miniprogram/pages/*`

## 2. 先列差异，再动代码

每次至少列这 5 项：

### 结构差异

- 有没有缺失业务组件
- 组件内部容器层级是否不同
- 页面是否内联了本该抽组件的结构

### props 差异

- 组件名是否正确
- props 是否过少 / 过多
- 默认值是否和结果稿一致

这里的“默认值”只指 formal component / 结果稿里的 demo 初始展示，不代表真实接口
数据可以在运行时用 `??`、`||`、默认图、默认文案去兜底。只要进入真实数据链路，
继续遵守 `../../octoups-miniapp-standards/references/error-exposure.md` 的错误暴露原则。

### 样式差异

- token 是否一致
- 圆角、边框、间距、字号、数字字体是否一致
- 选中 / 激活 / 弱态样式是否一致
- 适老化是不是走了页面根节点 `{{mode}}` + 全局 token，而不是额外复制一套组件
- 固定底栏 / 弹层 / 吸底按钮是不是还在带 `{{mode}}` 的根节点内部
- 是否把本应跟随模式变化的尺寸写死成了常量

### 状态差异

- 默认态
- 选中态
- 禁用态
- 缺货态
- 支付 / 积分 / 优惠态

### 交互差异

- 点击行为
- 弹层开关
- tab / switch / checkbox
- 底部操作栏文案和禁用逻辑

## 3. 如果细节不对，先改 spec

如果 diff 发现的是 formal component 本身不对：

1. 先改 `octoups-user-spec.lib.pen`
2. 再改 `octoups-user-results.pen`
3. 最后才改代码

这条规则优先级高于“尽快把页面写出来”。

## 4. 再改代码

推荐修改顺序：

1. 业务组件目录
2. 组件 props 和默认态
3. 组件内部 TDesign 映射
4. 页面装配
5. 页面事件和数据

## 5. 交付时要说清楚

最终说明里至少回答：

- 哪些 formal component 被映射成了真实组件
- 哪些细节是先修 `lib.pen` 再改代码
- 哪些页面只做装配，没有继续内联业务结构
- 适老化最终是走全局 token 还是显式 `mode`，以及为什么
