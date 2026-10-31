---
name: pr-conflict-analysis
description: 诊断 PR 冲突的成因并给出解法。触发词："这个 PR 为什么冲突"、"PR 老分叉"、"合不进去"、"冲突怎么解"、"两个版本线打架"。核心：先定性冲突类型（双 SHA / CI 产物 / 版本线并行 / 真语义冲突），再决定解法；禁止上来就手工解冲突。
---

# PR 冲突分析

**冲突是症状，不是问题。** 上来就解冲突 = 治标；这个 skill 要求先定性再动手，
因为四类冲突的解法完全不同，用错解法会让下次冲突更大。

> 沉淀自 2026-08-29/30：PR #2994（test → dev）反复冲突，解完一轮 v1.2.7 发布后立刻复发。
> 根因不是"没合干净"，是发布产物写在 test + UAT 修复双向提 PR，每发一版必然新增一次分叉。

## 0. 红线

- **禁止**在没定性之前手工解冲突。
- **禁止**用 `git checkout --ours/--theirs` 批量解业务代码，除非已证明一侧是另一侧的严格超集。
- **禁止**把 `--stat` 的 "+N 行" 当作"对面没有这行"的证据（union merge driver 会骗你，见 §5）。
- **禁止**在长期分支之间整条 merge 传播业务代码（`test → dev`、`release/1.3.0 → dev`）。
- 遵守 CLAUDE.md：不 `reset --hard`、不 force-push 共享分支、不 `git add -A` 清场。

## 1. 取证（必做，不可跳过）

```bash
env -u http_proxy -u https_proxy -u all_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY \
  git fetch origin --prune

BASE=origin/dev      # PR 的 base
HEAD=origin/test     # PR 的 head

git rev-parse --short $BASE $HEAD
git merge-base $BASE $HEAD | xargs git log --oneline -1     # 分叉点
git rev-list --left-right --count $BASE...$HEAD             # 左=base独有 右=head独有
git log --oneline $BASE..$HEAD                              # head 独有的 commit
```

> 出网必须 `--noproxy` / `env -u *_proxy`，否则本机 10808 代理会回假响应。

**关键一步：查 head 独有的 commit 在 base 上有没有等价物。**

```bash
git cherry $BASE $HEAD | grep '^+'    # + 开头 = base 上确实没有（按 patch 比，不看 SHA）
```

再用标题交叉验证（cherry-pick 后改过内容时 patch 比对会失效）：

```bash
for c in $(git log --format=%h $BASE..$HEAD); do
  s=$(git log -1 --format=%s $c)
  printf '%s [base同名=%s] %s\n' "$c" "$(git log --oneline $BASE --since=2026-01-01 --format=%s | grep -cFx "$s")" "$s"
done
```

## 2. 定性：四类冲突

| 类型 | 特征 | 解法 |
|---|---|---|
| ① 双 SHA | head 的 commit 在 base 有同名/等价物 | 取内容更新的一侧；根治是改单向流 |
| ② CI 产物 | 只涉及 `values-*.yaml`、`release/records`、`release/manifests` | 取本分支侧；根治是不回流 |
| ③ 版本线并行 | 两条长期 `release/x.y.z` 都改了同一文件 | 定上线顺序，后发的吸收先发的 |
| ④ 真语义冲突 | 两侧独立开发同一逻辑，都不是对方超集 | 人工合成并集，必须跑测试 |

绝大多数"老分叉"是 ①+②，不是 ④。**先排除 ①②，剩下的才值得费脑子。**

**特例：手工编号的 R__ 种子文件冲突（属于 ③，但不能「取一侧」）。** `R__permission_atom_compat.sql`、`R__dict_*.sql` 这类种子按主键 id 做
`ON DUPLICATE KEY UPDATE`。两条并行 release 都「接着最大号往下排」时会撞号：两侧文本看起来各加了几行、没有真冲突，
部署后却是后发的一侧把先发的映射覆盖掉（UAT/生产静默覆盖，dev 则可能唯一键冲突 CrashLoop，2026-10-23/10-28 都发生过）。
解法：**逐行比 id**，把所有活跃分支（origin/dev + 每个 origin/release/*）里的 id 汇总查重；重复的那一侧改到全局最大 id +1 之后，
必要时在 INSERT 前定向 DELETE 被撞的 id；字典类新行改用秒级时间戳 id。改完在真 MySQL 上按 upsert 语义跑一遍验证零冲突。

## 3. 分类解法

### ① 双 SHA（同一改动两个 commit）

成因：UAT bugfix 从 test 和 dev 各拉一条分支、双向各提一个 PR。Git 认不出是同一改动。

判断哪侧更新：看冲突块。若一侧是另一侧的严格子集（少 import、少参数、少字段），取超集侧。

```bash
git checkout --ours -- <file>   # 保留 base 侧（通常是持续演进的 dev）
```

**取完必须验**，不能只靠 compile：

```bash
mvn -q -T 1C -DskipTests compile
mvn -pl <module> -Dtest='<冲突文件对应的Test>' -Dsurefire.failIfNoSpecifiedTests=false test
```

根治：改单向流 —— 先合 dev，再 `cherry-pick -x` 进 test，别两边各提一次。

### ② CI 产物

```
deploy/charts/*/values-uat.yaml      ← UAT CI 写
deploy/charts/*/values-prod.yaml     ← 生产 CI 写
deploy/charts/*/values-dev.yaml      ← dev CI 写
deploy/release/manifests/*.yaml
deploy/release/records/*.json
```

`values-*.yaml` 的 image tag/digest 是**环境状态**，不是源码，一律取本分支侧：

```bash
git checkout HEAD -- deploy/charts/
```

`release/records` 和 `manifests` 是**按版本一文件的台账**，新增文件永不冲突，保留回流。

根治：给 `values-*.yaml` 配 `.gitattributes merge=ours`。

### ③ 版本线并行（1.3.0 vs 1.4.0）

先查重叠面：

```bash
MB=$(git merge-base origin/release/1.3.0 origin/release/1.4.0)
comm -12 \
  <(git diff --name-only $MB origin/release/1.3.0 | sort) \
  <(git diff --name-only $MB origin/release/1.4.0 | sort)
```

规则：
- **谁先发谁是基底。** 先发的进 master 后，后发的版本线 `merge origin/master` 单向吸收。
- **反向绝对不行** —— 把 dev/后发线的代码回灌先发线，先发线上线即炸。
- 重叠文件指定同一负责人，别两条线各改各的。
- **Flyway `V__` 脚本两条线都碰同一张表 → 设计阶段就拆开**，别指望解冲突。

### ④ 真语义冲突

- 按功能语义合成并集，不是二选一。
- 在 dev 上解**一次**，解完的结果**不回灌版本线**。
- 必跑受影响模块的测试，不能只 compile。

## 4. 净变更自检（提 PR 前必做）

```bash
git diff HEAD --stat
```

回流类 PR 的净变更应该**很小**（通常只有台账文件）。若冒出大量业务代码改动，说明定性错了 —— 回到 §2 重新分类。

## 4.5 拆仓之后（2026-09-03 起）

部署状态已迁到独立仓库 octopus-deploy（单 main 分支），CI 不再往 dev/test/master 回写。
**拆仓完成后，octopus-cloud 跨分支 PR 里不应再出现 `deploy/` 或 `scripts/release/` 的差异**；若出现，是有人往残留的 `deploy/` 提交了，按 ② 取本分支侧并提醒对方改去 octopus-deploy。
② 类冲突的根治即此。

## 5. 已知陷阱

**`.gitattributes` union merge 会重复行。** `docs/knowledge/*/INDEX.md` 配了 union driver：
两边各加一行同一条目时，union 按设计把两行都留下 → `check-knowledge-index.sh` 报
`在 INDEX.md 中出现 2 行` 卡住部署。

`git diff --stat` 显示 "+1 行" **不能**证明对面没有这行 —— union 的产物就是 +1。必须数：

```bash
grep -c '<条目ID>' docs/knowledge/bug-patterns/INDEX.md   # 必须是 1
sh scripts/check-knowledge-index.sh
```

**fail-loud 测试的红色堆栈不是失败。** commerce-core 有大量故意触发异常的用例
（`redis down`、`connection refused`、`租户不一致`）。只看结论行：

```
[ERROR] Tests run: 3199, Failures: 1, Errors: 0
[ERROR] Failures:
  <这里才是真正挂的>
```

**别把别人的 bug 算到合并头上。** 判断一个测试失败是否由合并引入，直接看那个 commit 自身：

```bash
git show <commit>:<产线文件> | grep <关键字符串>
git show <commit>:<测试文件> | grep <断言>
```

同一 commit 内两者就对不上 → 与合并无关，是那个 PR 改产线没同步改测试。

## 6. 交付格式

诊断结论必须包含：

1. **定性**：四类中的哪一类，附取证命令输出
2. **逐文件口径**：每个冲突文件取哪侧、为什么
3. **净变更**：`git diff HEAD --stat` 结果
4. **验证**：compile + 受影响测试的实际输出
5. **根治建议**：这类冲突下次怎么不再发生（双 SHA → 一个改动只落一条分支、提 PR 前跑 `pnpm check:dual-sha`；种子撞号 → 追加前跨分支取最大 id）

## 7. 相关

- `test-merge-by-release` — UAT 阶段合并范围
- `prod-release` — 生产晋级
- `git-pr-dev-test` — 提 PR 的分支基底算法
