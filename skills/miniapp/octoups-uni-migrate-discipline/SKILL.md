---
name: octoups-uni-migrate-discipline
description: >-
  Enforces uni-app migration discipline for octoups-user: never hand-edit
  apps/uni-client page/component/service outputs migrated from miniprogram.
  Use when fixing bugs, adding features, or changing UI/logic in uni-client,
  apps/uni-client, mp-weixin build, cart/mall/pages, migrate convert, or when
  the user mentions 手改、uni 产物、migrate、转 uni. Always read before touching
  apps/uni-client/src/pages, components, services, or pkg-*.
---

# octoups-uni-migrate-discipline — 禁止手改 uni 产物

## 【强制】开工前先读

涉及 `apps/uni-client` 业务代码时，**必须先读** [uni-migrate SKILL](../uni-migrate/SKILL.md)。

## 【强制】禁止手改的范围

以下路径的**页面 / 组件 / 业务逻辑**改动，**禁止**直接在 `apps/uni-client` 里改：

- `apps/uni-client/src/pages/**`
- `apps/uni-client/src/pkg-*/**`
- `apps/uni-client/src/components/**`（由 migrate 从 `miniprogram/components` 转出者）
- `apps/uni-client/src/services/**`
- `apps/uni-client/src/utils/**`（由 migrate 闭包转出者）

**原因**：`migrate convert` 会从 `miniprogram/**` 重转并覆盖产物；手改会丢、且破坏「源 → codemod → uni」单一链路。

## 唯一正确工作流（修 bug / 加功能 / 改 UI）

```text
1. 改 miniprogram 源（pages / pkg-* / components / services / utils）
2. cd packages/migrate && node src/cli.mjs convert <page> --dry-run
3. node src/cli.mjs convert <page>
4. cd apps/uni-client && pnpm build:mp-weixin && pnpm build:app
5. 真机/H5 跑交互验收
6. 验收通过 → node src/cli.mjs lock <page>（仅当该页今后不再从源重转时）
```

`<page>` 示例：`pages/cart/index`、`pkg-user/verify-code/index`（相对 `miniprogram/`，无扩展名）。

## 允许直接改 uni-client 的例外（白名单）

| 路径 | 原因 |
|------|------|
| `apps/uni-client/src/adapters/**` | 跨端基础设施，无 miniprogram 对应源 |
| `apps/uni-client/src/manifest.json` | App/H5 多端配置 |
| `apps/uni-client/src/pages.json` | uni 路由/tabBar 注册（新页 convert 后常需补） |
| `apps/uni-client/vite.config.ts`、`package.json` 等工程配置 | 构建层 |
| `packages/migrate/**` | codemod / CLI 本身 |
| 已 `migrate lock` 且用户明确要求只改 uni 并 lock 的页 | 极少数；改完必须 lock + commit 说明 |

**不在白名单 → 不要手改 uni-client。**

## 转换/运行出错时的优先级

1. **先改 codemod**（`packages/migrate/src/transform/*.mjs`）+ 测试 + re-convert  
2. 页面特有、codemod 无法通用 → 才允许手改产物，且 **立刻 `migrate lock`**  
3. **禁止**：为了省事直接改 `.vue` 而不走 convert

## 自检清单（写盘前必过）

- [ ] 我准备改的路径是否在「禁止手改」列表里？
- [ ] 若是 → 是否已改 `miniprogram/**` 并执行 `migrate convert`？
- [ ] 是否误把 `apps/uni-client` 当唯一真源？（过渡期真源是 **miniprogram**）
- [ ] 用户测的是 `dist/dev/mp-weixin` → 是否提醒 re-convert / rebuild？

## 反例（本会话教训）

❌ 用户要「购物车空态去逛逛进商城」→ 直接改 `apps/uni-client/src/pages/cart/index.vue`  
✅ 改 `miniprogram/pages/cart/index.wxml` + `index.wxss` → `node src/cli.mjs convert pages/cart/index`

## 相关资源

- 完整迁移命令与纪律：`uni-migrate/SKILL.md`
- 进度台账：`packages/migrate/migrate-manifest.json`
- 报告：`packages/migrate/MIGRATION_REPORT.md`（`node src/cli.mjs report`）
