---
name: test-merge-by-release
description: 按禅道发布任务合并 PR 到 test 分支并发 UAT rc。触发词："把 x.y.z 合到 test"、"合并 test 的 PR"、"发 UAT"、"打 rc"、"这个版本要发的 PR 都合了"。禁止凭 PR 标题/commit 数自行圈定范围，范围只认禅道发布任务。
---

> **⚠️ 拓扑迁移中（2026-08-26 设计已定稿，CI 尚未改造）**
>
> 分支模型现行权威：[`2026-08-31 交叉迭代与发布分支方案`](../../../docs/superpowers/specs/2026-08-31-cross-iteration-release-branch-scheme.md)（已拍板：release 从 dev 切线 / 补丁版从 master 切 release/* / 废除 hotfix/* 分支类型 / 修复逐项前传）。
> [`受控发布拓扑设计`](../../../docs/superpowers/specs/2026-08-26-cloud-dev-test-release-topology-design.md)
> §6.5 要求本 skill 最终改为「从 master 组装 release/vX.Y.Z，仅由 release 合入 test」。但该改造依赖 CI 侧尚未落地的能力
> （`scripts/release/verify-test-projection.sh` 未创建、`.drone.yml` 无 release 来源/allowlist 门禁），
> 迁移处于阶段 1（规则止血）。
>
> **在 CI 改造完成前，本 skill 的操作步骤仍按现流程执行**，照新拓扑走会因脚本不支持而失败。
> 已生效的部分只有 `git-pr-dev-test`：普通业务 PR 只进 `dev`，不再从 `test` 拉分支双向提 PR。

# 按发布任务合并 test

合并到 `test` 的唯一合法范围来源是**禅道发布任务**。不在发布任务里的 PR，无论标题写了哪个版本号、看起来多干净，一律不合。

> 本 skill 由 2026-08-12 的事故沉淀：当晚按「PR 标题带 1.0.6 + commit 数少」合了 6 个 PR，
> 事后对禅道 release#10 发现只有 2 个在发布范围内，且其中一个（#2248）自身编译不过，
> 连累 `v1.3.7-rc.1` 报废、需 revert。三条教训全部写进下面的红线。

## 红线

1. **范围只认禅道发布任务**——不看 PR 标题里的版本号（禅道版本号 ≠ Gitee tag，也 ≠ PR 标题自称）。
2. **commit 数只是提示，不是通过条件**——真正的门槛是"本地检出 PR 分支能编译过"。
3. **`can_merge_check: true` 只代表无文本冲突**，不代表能编译：跨 PR 的语义依赖（A 分支引用了 B 分支才有的类/字段）git 完全看不出来。
4. 打 rc tag 前，**在 tag 指向的那个 commit 上跑一次编译**。tag 打错要重打，成本远高于编译一次。
5. **UAT tag 只从 `test` 打，绝不从 `dev` 打**——从 dev 打等于把没晋级的代码直接上 UAT（v1.0.0 犯过）。ArgoCD 的 UAT 盯 test，生产盯 master。
6. **一个改动只落一条分支**。同一个修复禁止从 `test` 和 `release/x.y.z` 各拉一条分支、各提一个 PR——内容相同但 SHA 不同（双 SHA），下次合并必冲突，手工解完下一版照样复发（2026-08-29 后端、2026-09-17 前端都发生过）。其余线靠 release/x → test → dev 整分支单向前传，不 cherry-pick（规则见 git-pr-dev-test §1）。
   跨长期分支的 PR 合并前先查双 SHA：前端 `git fetch origin --prune && pnpm check:dual-sha <base> <head>`；后端用 `git log --cherry-pick --right-only --no-merges <base>...<head>` 对比同标题提交。报警就先收口重复提交，再合。

## 步骤

### 1. 取发布任务清单（必做第一步）

禅道 MCP 拉大列表经常超时（120s+），直接 curl 直连更快（约 7s）：先 `source ~/.claude/zentao.env`，
`POST /api.php/v1/tokens` 换 token，再带 `Token:` 头 GET；unset 代理变量、加 `--noproxy '*'`、关 sandbox。脚本里不要打印凭据。
发布任务页面要登录，WebFetch 拿不到；API 也取不到时让用户把清单贴过来，**不要凭 `test..dev` 的 diff 自己圈范围**。

```bash
# releaseID 从用户给的链接 index.php?m=projectrelease&f=view&releaseID=NN 里取
curl -s --noproxy '*' "https://pm.lengfenghl.org.cn/api.php/v1/releases/NN" -H "Token: $TOK"
```

关注 `name`（版本号）、`stories`、`bugs`、`status`。逐个取标题：

```bash
curl -s --noproxy '*' "https://pm.lengfenghl.org.cn/api.php/v1/stories/106" -H "Token: $TOK"
curl -s --noproxy '*' "https://pm.lengfenghl.org.cn/api.php/v1/bugs/197"   -H "Token: $TOK"
```

产出一张 **story/bug id → 标题** 的清单，这是本轮合并的全集。

### 2. 列 open PR 并做双向对账

```
mcp__gitee__list_repo_pulls(owner=lengfeng_2, repo=octopus-cloud, base=test, state=open, per_page=100)
```

Gitee MCP 的 token 常过期（401）。那就直连 v5 REST API（token 来源和绕代理写法见 prod-release 的「Gitee 访问」一节）；
如果只是要看「已经进了 test 的有哪些」，用 `git log --first-parent <上个tag>..origin/test --format='%cI | %an | %s'` 重建全量——
不少后端改动是直推、不走 PR，只拉 PR 列表会漏。

对账要**双向**，两个方向都要报给用户：

- **PR → 发布任务**：每个 open PR 对应哪个 story/bug？对不上的 → 不合，列出来。
- **发布任务 → PR**：每个 story/bug 有没有对应 PR？没有的 → 报"缺 PR"，别默默略过。

PR 与禅道的对应关系从 PR 标题、分支名（常带 `bugNNN`）、PR 描述里找；找不到就直接问用户，不要猜。

### 3. 逐个 PR 验编译（合并前，不是合并后）

对每个**在发布范围内**的 PR：

```bash
git fetch origin <pr-head-branch>
git checkout --detach origin/<pr-head-branch>
mvn -o -q -pl <改动模块> -am test-compile      # 改了 common 时先 mvn install -pl common
```

编译不过 → **不合**，在 PR 下说明缺什么符号、少哪个依赖 PR，@作者返工。

前端（octopus-admin）对应 `npm run build`。

### 4. 合并

用 `mcp__gitee__merge_pull` 按 PR 号逐个合。冲突（`is_conflict: true`）的 PR 不替作者解——让作者 rebase 后重提，替别人解冲突容易把对方未完成的改动带进 UAT。

### 5. 合完先编译，再打 rc tag

```bash
git fetch origin test
git checkout --detach origin/test
mvn -o -q -pl <涉及模块> -am test-compile
```

**编译过了才打 tag**：

```bash
git tag -a vX.Y.Z-rc.N origin/test -m "UAT rc: <禅道版本号> <合入的 story/bug 列表>"
git push origin vX.Y.Z-rc.N
```

rc 版本号顺着**该仓库自己**的 tag 序列递增（`git tag --sort=-creatordate | head`）。后端 octopus-cloud 与前端 octopus-admin **各自独立编号，不要对齐**。

前端 octopus-admin 本地没有 checkout 时，用 Gitee API 打 tag：

```bash
curl -s --noproxy '*' -X POST "https://gitee.com/api/v5/repos/lengfeng_2/octopus-admin/tags?access_token=$T" \
  -d "refs=test&tag_name=vX.Y.Z-rc.N&tag_message=..."
```

### 6. 盯 CI 回写

CI 会往 **octopus-deploy 仓库 main**（不再是 test 分支）推一条 `ci(uat): image tags to ... [skip ci]`，更新 `charts/*/values-uat.yaml` 与 `release/records/<version>.json`，ArgoCD 随后同步。用 `git -C ~/IdeaProjects/octopus/octopus-deploy fetch origin main && git log --oneline -3 origin/main` 确认；没等到这条提交就说明构建挂了——去看 drone 日志。test 分支本身合并后不会再多出任何 CI 提交。

**看 CI 日志先核时间戳**：drone 页面上常停留着同分支的历史构建，`Finished at` 是 UTC。对不上 tag 的提交时间就不是这次的构建。

**构建挂在测试、但测试本身 0 失败**（典型是 Drone 机器内存不足，`errno=12` fork JVM 失败）：要不要临时跳过测试由用户决定，不要自作主张。
用户同意后的写法：只用 `-DskipTests`（不能用 `-Dmaven.test.skip`，test-compile 仍要跑），行尾加 `# allow-skip: temporary`，
`scripts/check-no-test-skip.sh` 认这个标记。改动提到**当前最低的活跃 release 分支**的 PR 里，随 release → test → dev 前传，
不要另外往 dev 开 PR。发完必须恢复，并在汇报里提醒用户。

## 汇报格式

合并结束给用户一张表，四列：PR 号 / 标题 / 对应禅道 story·bug / 结论（已合 · 不在发布范围 · 冲突待作者 · 编译不过）。外加一行「发布任务里缺 PR 的条目」。
