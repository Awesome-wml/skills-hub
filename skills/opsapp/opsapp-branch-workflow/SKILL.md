---
name: opsapp-branch-workflow
description: >-
  管理 OpsApp 的需求分支、联调、UAT 与生产发布。基于生产切迭代分支，按需推进 dev → test → master。
  用户提及新建分支、分支管理、迭代、联调、UAT、test、发布、热修、生产 Bug、打 Tag、RC Tag 或禅道发布计划时使用。
---

# OpsApp 分支与发布

基于生产做迭代。新需求从 `master` 拉分支，用**迭代名称**命名。push 后按需 PR：`dev`（联调）→ `test`（UAT）→ `master`（生产）。联调哪个合哪个、测哪个合哪个、上哪个合哪个。

旧规范（从 `dev` 拉 `feature/*`、用 beta/rc Tag 代替环境分支、热修直合 `master` 再回合并）已废止，不要再按那套执行。

涉及 **RC/正式 Tag、禅道 Build/Release、发布追溯** 时，先读并遵守  
`docs/agent-workflows/opsapp-release-tag-zentao-governance.md`（自下一正式版本起；历史 `v1.0.x` 不回填）。

## 固定分支

| 分支 | 环境 | 用途 |
| --- | --- | --- |
| `master` | 生产（prod 就是 master，不另建 `prod`） | 已上线代码。final Tag、生产包只从这里打 |
| `dev` | 联调 | 随时可合。开发在这里联调，通过后再按需合 `test` |
| `test` | UAT | 提测集成分支。RC Tag 钉 UAT 打包 SHA；测试通过后再按需合 `master` |

禁止直接在 `master` / `dev` / `test` 改业务代码。所有改动先落在迭代分支。

`test` 若不存在：从最新 `master` 创建并推远端，只做这一次初始化，不要从落后的 `dev` 拉。

## 新需求

1. 工作区有未提交改动时先提醒用户，不能默默带进新分支。
2. 更新 `master`：`git pull --ff-only`。
3. 从 `master` 创建分支，名称用迭代名称，例如 `1.2.0迭代`、`仓储1.2`。同一迭代共用一条分支。
4. push 后按当前要做的事合入对应环境，不要一次合进三条线。

```text
master ──切──► <迭代名称> ──PR──► dev     联调
                              ──PR──► test    联调通过、提测
                              ──PR──► master  测试通过、上线
```

- 只联调这个迭代：合 `dev`
- 只提测这个迭代：合 `test`
- 只上这个迭代：合 `master`
- 不要把未提测的迭代从 `dev` 整支带进 `test`，也不要把未验收的 `test` 整支带进 `master`

## 生产热修

路径：**master → 热修分支 → dev → test → master**。禁止热修直合 `master` 跳过联调和 UAT。

1. 从最新 `master` 拉分支，名称用本次热修对应的迭代名或缺陷迭代名。
2. 先合 `dev` 联调。
3. 联调通过后合 `test` 做 UAT。
4. UAT 通过后再合 `master` 上线。

热修合进 `master` 后，若 `dev` / `test` 还没有这批提交，按需把 `master` 同步回去，避免环境分叉。同步时保留各环境自己的 `CURRENT_ENV`，不要把生产环境地址带回 `dev` / `test`。

## 打包环境

HBuilderX 读磁盘。打哪套包，先改磁盘上的 `CURRENT_ENV`，打完不要把环境切换提交进迭代分支。

| 打哪种包 | `CURRENT_ENV` |
| --- | --- |
| 联调 / 连开发后台 | `dev` |
| `test` 上的 UAT 包 | `uat` |
| `master` 生产包 | `prod` |

生产包步骤见 `docs/20260822-三端生产打包手册.md`。

## Tag（自下一正式版本起）

- 命名空间：`release/fyb/app/…`
- UAT：`release/fyb/app/v<version>-rc.<n>`，钉实际 UAT 打包 SHA（通常在 `test`），`CURRENT_ENV=uat`
- 生产：`release/fyb/app/v<version>`，钉 `master` 生产打包 SHA，`CURRENT_ENV=prod`
- 只建 annotated Tag；钉显式 SHA；禁止 `-f` / 删远端重建 / `git push --tags`
- **不要**再用裸 `v<version>` 打新 Tag；历史 `v1.0.16`～`v1.0.23` 只读保留
- **不要**用 RC Tag 代替 `test` 分支；RC 只钉候选源码，环境分支仍是 `dev` / `test` / `master`
- Tag 注释、禅道 Build/Release、发布顺序见治理文档；写禅道前须登录回读，参考发布列表 [project=1](https://pm.lengfenghl.org.cn/index.php?m=projectrelease&f=browse&project=1) 与发布 **#58**

## 执行约束

- 更新基线只用 `git pull --ff-only`，不改写历史、不强推。
- 合并 `dev` / `test` / `master`、打 RC/正式 Tag、推 Tag、写禅道 Build/Release、删远端分支都是共享状态操作，执行前须得到用户明确指令。
- 用户没说清要合哪条线时，只问：联调 `dev`、提测 `test`，还是上线 `master`。
- 用户只提普通 Bug、未要求打包/Tag/发布时，不要主动跑完整发布治理。
