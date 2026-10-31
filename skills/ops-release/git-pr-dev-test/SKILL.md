---
name: git-pr-dev-test
description: |
  提交代码并创建 Gitee PR。普通业务改动一律只进 dev；test 是长期 UAT 投影分支，只接受 release PR，
  不接受普通 feature/hotfix 直投。适用于用户要求提 PR、创建合并请求、提交到 dev、处理 UAT 修复或生产 hotfix 时。
metadata:
  last-updated: '2026-08-28'
  design-doc: docs/superpowers/specs/2026-08-31-cross-iteration-release-branch-scheme.md
---

# PR 工作流（受控发布拓扑版）

> 本 skill 依据 [`2026-08-26 dev/test/master 受控发布拓扑设计`](../../../docs/superpowers/specs/2026-08-26-cloud-dev-test-release-topology-design.md)。
> 该设计 §12 已定稿，不是待推断的建议。**2026-08-28 起旧的「分别从 dev/test 开两份相同业务分支」规则作废。**

## 何时启用

用户提到：提 PR、创建 PR、创建合并请求、提交到 dev、代码合并、UAT 修复、hotfix 等。

## 0. 先判断这是哪一类改动（决定走哪条流程）

| 改动类型 | 目标 | 流程 |
|---|---|---|
| 常规功能 / 修复 | **只进 `dev`** | §2 |
| UAT 阶段发现的问题（版本已在 release 上） | `release/vX.Y.Z` + forward-port `dev` | §3 |
| 生产紧急问题（Hotfix） | 从 master 切 `release/<补丁版本>`，`fix/*` 进该 release | §4 |
| 把 dev 的变更装进某个版本 | 走 `test-merge-by-release` skill，不在本 skill 内 | — |
| CI / `.drone.yml` / `scripts/ci` 改动 | **当前最低的活跃 `release/*`**（已有该 release 的 PR 就追加进去） | 随 release → test → dev 前传 |
| 服务环境变量 / secretKeyRef | **octopus-deploy** 仓库 `charts/<服务>/values*.yaml`，PR base=`main` | octopus-cloud 的 `deploy/charts/` 是拆仓遗留，改了不生效 |

判断不了就问用户，**不要默认走多目标 PR**。

**「dev 也要」「test 也要」的意思是「这个改动要在那些环境生效」，不是「往那个分支再开一个 PR」**。
2026-10-23 CI 跳测改动在 release/1.7.0 上提完后，又单独往 dev 开了一个 PR，被用户追问「为什么不提到 1.7.0 分支」——
往 dev 直提会和后续 release → dev 的合并形成双 SHA 和冲突。

## 1. 硬约束（违反即错）

1. **普通业务 PR 不以 `test` 或 `master` 为目标。** `test` 是长期 UAT 投影分支，业务源码树必须等于当前活动 release，只接受 `release/vX.Y.Z -> test` 的 PR。CI 的 UAT 写回（`charts/*/values-uat.yaml`、`release/records/<version>.json`）自 2026-09-03 起进独立仓库 octopus-deploy 的 main，test 上不再有 CI 提交。
2. **不从 `test` 拉分支做业务开发**，也不从 `test HEAD` 开生产分支。`test` 上有 UAT values 和 release-record，会把环境状态混进源码晋级。
3. **禁止长期分支互相回灌**：`test -> dev`、`test -> master`、`master -> test`、`dev -> test`（整条）都不允许。
4. **禁止 reset / force-push / 改写** `dev`、`test`、`master` 历史。
5. **版本间同步统一走单向 merge（`release/* → dev`），禁止 cherry-pick 跨版本搬运单个提交。** 判断某 release 是否已同步进 dev：`git log --oneline origin/dev..origin/release/x.y.z` 为空即已同步。
6. commit message 用中文；commit 后必须 push，除非用户明确说不推。
7. **不要在 PR body 里 @ 人**：Gitee 会把中文名匹配成账号，容易匹配到无关用户。
8. 创建 PR **优先用 `mcp__gitee__create_pull`**，不要手写 `curl + access_token`（MCP 配一次全组共用）。MCP 连不上时才退回 §6 的 curl 方式。

### 为什么删掉「从 test 拉一条分支双向提 PR」

旧规则要求 hotfix 从 `test` 拉分支、分别提 PR 到 `test` 和 `dev`。实测该做法是当前 `dev`/`test` 分叉的直接来源之一：

- 同一修复分别进入两条长期分支，产生 patch 等价但 SHA 不同的提交（2026-08-26 实测 `test` 44 个独有提交中有 23 个属于此类）；
- 用 SHA ancestry 判断「修复是否已进另一分支」会误报；
- 两份分支各自解决冲突，会产生解决漂移和测试证据分裂。

新拓扑用 **release 分支** 承载「本次发布范围」，`test` 只做投影，从源头消除双份维护。

## 2. 常规功能 / 修复 → 只进 dev

```bash
git fetch origin dev
git checkout -b feature/<描述> origin/dev   # 或 fix/<描述>
# 改动、提交
git add <相关文件>
git commit -m "中文说明"
git push -u origin HEAD
```

分支命名按功能或问题命名，**禁止用人名**；不再加 `-dev` / `-test` 后缀（不存在多目标了）。

PR：`base = dev`。

这些改动进入 UAT 的方式是**被下一个 release 按禅道范围挑走**（`test-merge-by-release` skill），不是自己提 PR 到 test。

## 3. UAT 修复（版本已在 release 上）

```text
fix 分支 from release/vX.Y.Z
    ├─> PR -> release/vX.Y.Z         （修复本体）
    ├─> PR: release/vX.Y.Z -> test    （发布流程做：合完在 test 上打 rc tag，CI 构建并回写 record）
    └─> PR: release/vX.Y.Z -> dev     （版本同步，单向 merge，防止下个版本重新引入同一问题）
```

```bash
git fetch origin release/vX.Y.Z dev
git checkout -b fix/<描述> origin/release/vX.Y.Z
# 改动、提交、推送 → PR base = release/vX.Y.Z

# 同步进 dev：整分支单向 merge，不用 cherry-pick
git checkout -b chore/merge-release-vX.Y.Z-into-dev origin/dev
git merge origin/release/vX.Y.Z
# 解冲突 → 推送 → PR base = dev；无冲突时可直接开 release/vX.Y.Z -> dev 的 PR
```

**不直接在 `test` 上提交业务修复**（test 是 UAT 投影，业务代码经 `release/* -> test` 的 PR 进入）。
**`dev -> release/*` 永久禁止**——会把未验收代码灌进即将发布的版本。
同步必须在生产发布前完成，核对：`git log --oneline origin/dev..origin/release/vX.Y.Z` 为空。

## 4. 生产补丁 / 紧急 Hotfix（不再有 hotfix/* 分支）

> 2026-08-31 起**废除 `hotfix/*`、`maintenance/*` 分支类型**。Hotfix 是发布类型和优先级（禅道发布类型 + PR 标签标识），不是 Git 分支类型。

```text
master → release/<补丁版本>（如 release/1.3.1）
              ├── fix/<问题>  → PR base = 该 release
              └── RC → test（UAT）→ master
                         └─> 单向 merge 同步：当前活动 release + dev（整分支 merge，不得积压到发版前）
```

- 每周两次的普通 Bugfix 窗口：一个补丁 release 可含多个已确认生产 bug，不夹带新需求。
- 紧急 Hotfix：原则上只含一个紧急问题（恢复服务必需的关联改动可随行），不等窗口，可临时抢占 UAT。

Hotfix **仍必须经过 test/UAT**，不允许直接进 master。每个目标分支的合并授权分别生效——创建 PR、UAT 通过、生产准备完成都不自动授权合并下一环。

## 5. PR 标题规范（强制）

```
【禅道版本号】禅道标题
```

- 版本号取自禅道**发布任务**，不是 commit message，也不是 PR 分支名。
- 禅道版本线与 Gitee tag 不是一套（禅道 1.0.1 可能对应 Gitee v1.3.2.2），按版本号字面匹配会全错——查禅道发布任务确认。
- 不确定版本号时先查禅道，**不要臆造**。

PR body 建议结构：背景 → 变更内容 → 验证方式 → 风险与遗留。写清楚**验证了什么**（跑了哪些测试、实测了什么），不要只写「已测试」。

## 6. 创建 PR

优先：

```
mcp__gitee__create_pull(
  owner: "lengfeng_2", repo: "octopus-cloud",
  title: "【禅道版本号】标题", head: "feat/<分支名>", base: "dev", body: "..."
)
```

MCP 不可用时（`.mcp.json` 没配 `gitee` server）先按下面配一次，配好后全组共用：

1. `go install gitee.com/oschina/mcp-gitee@latest`（需 Go 1.23+）
2. 仓库根 `.mcp.json` 增加：
   ```json
   "gitee": {
     "command": "<$(go env GOPATH)/bin/mcp-gitee 绝对路径>",
     "env": {
       "GITEE_ACCESS_TOKEN": "<Gitee 个人访问令牌>",
       "GITEE_API_BASE": "https://gitee.com/api/v5"
     }
   }
   ```
3. 提醒用户重启 Claude Code 生效。

**只有 MCP 确实连不上时**才退回 curl，不要用写死的默认值兜底（容易过期）。token 依次尝试：
用户本次对话给的 → `~/.config/gitee-token` → `printf "protocol=https\nhost=gitee.com\n" | git credential fill` 的 `password=`
（钥匙串里的 git 凭证可以直接当 `access_token` 用）→ 都 401 就向用户要。`GITEE_TOKEN` 环境变量和 MCP 里的 token 经常已过期。token 不回显、不落文件。

访问 gitee.com（git fetch/push、curl、API）一律绕过本机代理，否则报 `SSL_ERROR_SYSCALL` 或卡死：
`unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy`，git 加 `-c http.proxy= -c https.proxy=`，并关闭 sandbox。

template-scaffold 的默认分支 `main` 已废弃（远远落后 dev），给它建 PR 时 base 必须手动写 `dev`。

```bash
curl --noproxy '*' -s -X POST \
  "https://gitee.com/api/v5/repos/lengfeng_2/octopus-cloud/pulls?access_token=<TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "...", "head": "feat/<分支名>", "base": "dev", "body": "..."}'
```

## 7. 提交前自检

- `git status --short` 确认只提交本次任务相关文件，**不提交** `.env`、密钥、个人配置、他人在途改动；
- 主工作目录常年有用户在途改动，需要干净基底时用路径限定 `git add`，**禁止** `git add -A` / `git reset --hard`；
- 改了产线代码必须同步更新对应测试，不留测试编译失败的状态；
- **octopus-cloud push 前本地跑 `.drone.yml` 里的门禁脚本**（不要接 `| tail`，会吞掉退出码）：
  `scripts/check-migration-seed-separation.sh`、`scripts/ci/check-fast-test-excludes.sh`、`scripts/check-migration-expand-only.sh`、
  `scripts/check-no-test-skip.sh`、`scripts/check-knowledge-index.sh`。常见红点：V 迁移里写了字典/菜单/角色菜单/casbin 数据（必须改成 `db/seed/common/R__*.sql`）；
  新增引入 testcontainers 的测试没按字母序登记到 `scripts/ci/surefire-fast-excludes.txt`。（2026-10-22 把 sys_role_menu 写进 V 迁移，release 部署被门禁拦下，补了一个 PR。）
- 加了门禁豁免标记（如 expand-only 豁免）再 push，auto 模式会判为绕过 CI 而拦截——先向用户说明并拿到明确授权；
- 跨长期分支提 PR 前查双 SHA（前端 `pnpm check:dual-sha <base> <head>`），报警就先收口重复提交；
- push 后立即查 PR 状态（本仓库 PR 常在几分钟内被合并），追加 commit 前先确认 PR 还开着；增量改动一律新分支新 PR。
  **说「PR 还没合并、在原分支追加就行」之前，必须先查**：`git fetch origin dev && git log origin/dev --oneline | grep "<PR 标题>"`，或调 Gitee API 看 `state`。
  Gitee 合并会以新 SHA 进 dev，本地分支的旧 SHA 不在 dev 上，`branch --contains` 看不出来（2026-10-17 凭本地分支判断「还没合」，其实当天已经合了）。
  已合并就从最新 origin/dev 新开分支、新开 PR。

## 8. 输出结果

向用户报告：PR 链接、base 分支、功能分支、commit hash、**实际执行过的验证**（哪些命令、结果如何）。

任何一层完成都不自动证明下一层完成——创建 PR ≠ 合并，合并 ≠ 部署，部署 ≠ 验收。

## 相关 skill

| 场景 | skill |
|---|---|
| 按禅道发布任务组装版本、合入 test、发 UAT rc | `test-merge-by-release` |
| 把过了 UAT 的版本晋级生产 | `prod-release` |
| 分支/commit 基本操作规范 | `git-branch-commit` |
