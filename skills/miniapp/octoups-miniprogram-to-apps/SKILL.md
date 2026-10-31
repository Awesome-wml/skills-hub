---
name: octoups-miniprogram-to-apps
description: >-
  把 octoups-user 小程序 miniprogram 的改动同步到 apps/uni-client（uni-app）。
  用 migrate sync-changed / convert 批量 re-convert，禁止手改 uni 产物。
  触发词：把我小程序的修改转成 apps、新写的代码转成 apps、同步到 uni、
  小程序改动转 uni、miniprogram 转 apps、sync uni-client、转 apps。
---

# 小程序改动 → apps/uni-client

## 【强制】开工前

1. 读 [octoups-uni-migrate-discipline](../octoups-uni-migrate-discipline/SKILL.md)
2. 读 [uni-migrate](../uni-migrate/SKILL.md) 的「禁止手改 / 出错怎么办」

**真源是 `miniprogram/**`**。用户已在小程序侧改完代码时，本 skill 负责 **re-convert 到 `apps/uni-client`**，不是反过来手改 `.vue`。

## 用户意图 → 走哪条命令

| 用户说法 | 动作 |
|---|---|
| 「把我小程序的修改 / 新代码转成 apps」（未指定页） | `sync-changed`（按 git 变更自动算受影响页） |
| 「只转某页 / 这几页」 | 对每页 `convert <page>` |
| 「从某 commit / 分支以来改了什么要同步」 | `sync-changed --since <ref>` |
| 「新写的页面还没进 uni」 | `convert <page>` + 补 `pages.json`（见下文） |

默认 target 是 **uni-app** → `apps/uni-client`。只有用户明确说 uni-x / uni-app x 时才加 `--target uni-x`。

## 标准流程（增量同步，最常见）

```bash
cd packages/migrate

# 1. 先看计划
node src/cli.mjs sync-changed --dry-run

# 2. 真同步
node src/cli.mjs sync-changed

# 3. 可选：双端 build
node src/cli.mjs sync-changed --build
```

`sync-changed` 会扫描 git 里 `miniprogram/**` 变更（含工作区），re-convert **已有 uni 产物**的受影响页，并复制变更的 `miniprogram/sdk/**`。

### 指定 git 范围

```bash
node src/cli.mjs sync-changed --since main --dry-run
```

## 单页 / 新页

`sync-changed` **不会**转 uni 里尚不存在的页：

```bash
node src/cli.mjs convert <page> --dry-run
node src/cli.mjs convert <page>
```

新页 convert 后补 `apps/uni-client/src/pages.json`（白名单内可手改）。

## 执行后必须汇报

1. 检测到哪些 `miniprogram/` 变更（或指定页）
2. re-convert 了哪些页；locked / blocked / 未覆盖项
3. SDK 是否复制
4. `MIGRATE-TODO` 摘要
5. build 结果（若跑了 `--build`）

## 出错时

先改 codemod → re-convert；修不动才手改 uni 并 `lock`。详见 `uni-migrate` skill。

## 相关

- [octoups-uni-migrate-discipline](../octoups-uni-migrate-discipline/SKILL.md)
- [uni-migrate](../uni-migrate/SKILL.md)
