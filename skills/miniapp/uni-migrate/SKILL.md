---
name: uni-migrate
description: 把冷丰生鲜微信小程序(octopus-user/miniprogram)渐进式迁移到 uni-app 多端工程(octopus-user/apps/uni-client)。用于「转某个页面到 uni」「看迁移进度/报告」「锁定已验证页」「查/改迁移配置」等。命令驱动、AI 无关:照着 migrate CLI 跑即可,换任何 AI 或纯手工都一致。触发词:迁移 uni / 转 uni / 小程序转 uni-app / migrate convert / 迁移进度 / 迁移报告。
---

# uni-migrate —— 小程序 → uni-app 渐进式迁移

> **【强制】禁止手改 uni 产物**：修 `apps/uni-client` 页面/组件/业务代码时，必须先改 `miniprogram/**` 再 `migrate convert`。详见 skill `octoups-uni-migrate-discipline` 与规则 `.cursor/rules/uni-migrate-no-hand-edit.mdc`。

## 这是什么

把 `octopus-user/miniprogram`(原生微信小程序,TS + glass-easel + TDesign)**逐页**迁移成
`octopus-user/apps/uni-client`(uni-app Vue3 + Options API,多端:微信小程序 + App)。

核心工具是 **`packages/migrate` 里的 codemod + CLI**。**所有价值在 CLI 命令和文档里,不依赖具体哪个 AI** ——
你(或任何 AI / 纯人工)照着命令跑、照 runbook 走即可。**不要手写转换器、不要让 AI「自由发挥」转页面。**

## 终局与原则(必读)

- 终局:`apps/uni-client` 是**唯一真源**,uni 全部转完后统一发版。**不做双向同步。**
- 过渡期:老 `miniprogram` 仍可独立发版修 bug。未迁移的页 legacy 怎么改都不管(以后 convert 从当前源转,自动含 fix)。
- **以原文件为主**:`migrate convert <page>` 总是从 legacy 源重转、覆盖目标。只有 `migrate lock` 锁定的页/组件,再被别的页拉作依赖时才跳过(保护手改)。
- 直播 `pkg-live/live-room` 走**混编**:微信端保留原生插件,App 端 `#ifdef` 降级,build 必须全绿。

## 路径速查

| 东西 | 路径 |
|---|---|
| 工具 + CLI | `octopus-user/packages/migrate/`(命令 `node src/cli.mjs <cmd>`) |
| codemod 规则 | `packages/migrate/src/transform/*.mjs` |
| 目标 uni 工程 | `octopus-user/apps/uni-client/`(`pnpm build:mp-weixin` / `build:app` / `dev:h5`) |
| 跨端适配器 | `apps/uni-client/src/adapters/{ui,navigation,storage,device,system,request}.ts` |
| 迁移台账 | `packages/migrate/migrate-manifest.json`(locked / blocked / lockedSha) |
| 迁移配置 | `packages/migrate/migrate.config.json`(`migrate config init` 生成) |
| 自动报告 | `packages/migrate/MIGRATION_REPORT.md`(`migrate report` 生成) |
| 方案/计划 | `octopus-user/docs/superpowers/`(spec + 首页迁移 plan) |

## 命令清单(这是工具的全部入口)

`cd octopus-user/packages/migrate` 后:

```bash
node src/cli.mjs                          # 看用法
node src/cli.mjs list                     # 终端速览进度台账
node src/cli.mjs report                   # 生成 MIGRATION_REPORT.md(进度+全页清单+codemod能力+已知缺口)
node src/cli.mjs convert <page> --dry-run # 只看「会转哪些/跳哪些/几个 TODO」,不写盘
node src/cli.mjs convert <page>           # 真转:写 .vue/.ts 到 apps/uni-client
node src/cli.mjs lock <page>              # 双端验收通过后锁定(记 lock-time sha,防 re-convert 覆盖)
node src/cli.mjs config                   # 看当前迁移配置
node src/cli.mjs config init              # 落盘默认配置到 migrate.config.json
```

`<page>` 形如 `pages/index/index` 或 `pkg-user/verify-code/index`(不含扩展名,相对 `miniprogram/`)。

uni-app x 初始快照使用 `--target uni-x`:页面/组件输出 `.uvue`,脚本输出 `.uts`,并写到 `apps/uni-x-client/src`。该 target 会把已覆盖的 TDesign `t-*` 标签改写为本地 `ox-*` 兼容组件,非 dry-run 转换时自动补齐 `components/ox-*/ox-*.uvue`;未知 `t-*` 仍保留 blocker。

## 标准工作流：转一个页面(逐页照做)

1. **看计划**:`node src/cli.mjs convert <page> --dry-run`
   - 看闭包多大、几个 `MIGRATE-TODO`、哪些 wx-only / blocked。
2. **真转**:`node src/cli.mjs convert <page>`
   - codemod 自动转页面 + 其依赖闭包(services/utils/组件);`locked` 的依赖跳过。
3. **build 验证**:`cd ../../apps/uni-client && pnpm build:mp-weixin && pnpm build:app`
   - 两端都要 EXIT=0。报错按下方「出错怎么办」处理。
4. **跑起来看**:`pnpm dev:h5`(浏览器最快)或 `pnpm dev:mp-weixin`(微信开发者工具导入 `dist/dev/mp-weixin`)。
   - **必须真跑一遍交互**(进页面/点按钮/切 tab),只看 build 绿不够 —— 运行错(setData/事件/wx API)只有跑起来才暴露。
5. **注册页面**:把新页加进 `apps/uni-client/src/pages.json`(主包 `pages` 或对应 `subPackages`;tab 页还要加 `tabBar`)。
6. **验收通过后锁定**:`node src/cli.mjs lock <page>` —— 之后别的页 re-convert 不会覆盖它。
7. **更新报告**:`node src/cli.mjs report`,提交。

## 出错怎么办（关键纪律）

**运行错/转换不对,优先改 codemod,不要手改产物。**(手改会被下次 re-convert 覆盖;改 codemod 是幂等的、对所有页生效。)

- 改 codemod 走 TDD:在 `packages/migrate/test/*.test.mjs` 加失败用例 → 改 `src/transform/*.mjs` → `node_modules/.bin/vitest run` 绿 → re-convert 受影响页。
- 真改不动(页面特有、codemod 无法通用)才手改产物,**改完立刻 `migrate lock` 该页**防覆盖,并在 commit 注明。
- 常见错与定位:
  - `xxx is not defined`(sysInfo/__nav 等)→ navbar 作用域 bug,见 `transform/navbar-metrics.mjs`。
  - `this.setData is not a function` → 有 setData 没转成赋值,见 `transform/page-to-options.mjs` 的 setData 处理。
  - `triggerEvent is not a function` / `e.detail` undefined → 事件 emit 形状,见 page-to-options 的 triggerEvent→$emit。
  - `Unexpected token ?`(真机预览)→ `?? / ?.` 未降级,确认 `vite.config.ts` 有 `build.target:'es2015'`。
  - `wx.X is not a function`(H5/App)→ 该 wx API 没进批量规则:能同名跨端的加到 `DIRECT_UNI`,有差异的加 adapter,微信独有的保留 TODO/#ifdef。
  - 组件未注册 / `t-xxx` 不显示 → 确认 `@tdesign/uniapp` 装了 + `pages.json` 有 easycom 规则。
  - uni-x 下 `t-xxx` blocker → 已知组件在 `src/transform/tdesign-to-uni-x.mjs` 加映射,并在 `src/compat/uni-x-components.mjs` 补 `ox-*` 模板;未知组件需人工降级或补兼容层。

## 改配置而非改源码

`migrate config init` 生成 `migrate.config.json`,可改:
- `wxApiAdapterMap`:`wx.* → 哪个 adapter`(加新 API 映射)
- `wxOnlyTodo`:微信独有、标 TODO 不自动改的 API(如 login/requestPayment)
- `blocked`:暂不迁移的页(report 标 blocked)
- `easycom` / `buildTarget`:组件自动注册规则 / JS 降级目标

## 全局速查:进度与缺口

- 当前进度、每页风险、codemod 能力、已知缺口 → **`migrate report` 生成的 `MIGRATION_REPORT.md`**。
- 已知大缺口(report 里也有):wx.login/requestPayment 需人工 #ifdef;直播 D 阶段降级未做;无自动回归(转完要人工跑);selectComponent 需改 ref。

## 不要做的事

- ❌ 不要让 AI「凭感觉」转页面 —— 一律走 `migrate convert`。
- ❌ 不要手改产物后不 lock(会被覆盖)。
- ❌ 不要把工具误当成原生微信「多端框架(project.miniapp.json)」—— 那是另一条废弃路线,我们走 uni-app。
- ❌ 不要只信 build 绿就算完 —— 必须真机/H5 跑交互。
