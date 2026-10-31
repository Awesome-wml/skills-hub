---
name: prod-release
description: 把已过 UAT 的版本晋级到生产（打 prod- tag）。触发词："发生产"、"上生产"、"晋级生产"、"打 prod tag"、"发下这个生产 vX.Y.Z"。核心红线：发布前必须先验 master 干净（有 dev 直入 master 等未过 UAT 的代码即停止发布）；代码必须先合进 master 才能打 prod- tag（合 master 一律开 PR 给人合，禁止直推），否则 CI 挂在第三步且看起来像 CI 故障；manifest PR 合并不等于上生产，打 tag 后 CI 在 octopus-deploy 自动开的 release/prod-* PR 被合并才算上线。承接 test-merge-by-release（UAT 阶段）。
---

> **⚠️ 拓扑迁移中（2026-08-26 设计已定稿，CI 尚未改造）**
>
> 分支模型现行权威：[`2026-08-31 交叉迭代与发布分支方案`](../../../docs/superpowers/specs/2026-08-31-cross-iteration-release-branch-scheme.md)（已拍板：release 从 dev 切线 / 补丁版从 master 切 release/* / 废除 hotfix/* 分支类型 / 修复逐项前传）。
> [`受控发布拓扑设计`](../../../docs/superpowers/specs/2026-08-26-cloud-dev-test-release-topology-design.md)
> §6.5 要求本 skill 最终改为「release 分支进 master、release-record 从 test 显式读取，生产代码不再基于 test HEAD」。但该改造依赖 CI 侧尚未落地的能力
> （`scripts/release/verify-test-projection.sh` 未创建、`.drone.yml` 无 release 来源/allowlist 门禁），
> 迁移处于阶段 1（规则止血）。
>
> **在 CI 改造完成前，本 skill 的操作步骤仍按现流程执行**，照新拓扑走会因脚本不支持而失败。
> 已生效的部分只有 `git-pr-dev-test`：普通业务 PR 只进 `dev`，不再从 `test` 拉分支双向提 PR。

> **⚠️ 拆仓已落地（2026-09-03 起，与上面的拓扑迁移是两件不同的事）**
>
> `deploy/` 整体从 octopus-cloud 搬进独立仓库 **[octopus-deploy](https://gitee.com/lengfeng_2/octopus-deploy)**
> （本机通常已 clone 在 `~/IdeaProjects/octopus/octopus-deploy`）。**manifest、release-record、
> values-prod.yaml、charts、三道门禁脚本，现在全部在这个仓库里，路径不再带 `deploy/` 前缀**
> （如 `release/manifests/<version>.yaml`、`scripts/release/validate-manifest.py`）。
> 默认分支是 **`main`**，不是 `master`。
>
> octopus-cloud 里原来的 `deploy/` 目录是**过渡期镜像，已停止更新**（迁移期由
> `octopus-deploy/scripts/sync-from-legacy.sh` 单向同步过去），**不要再读它判断当前生产状态**——
> 无论是找 release-record、看 values-prod.yaml 的 digest，还是跑三道门禁，一律去 octopus-deploy 仓库。
> ArgoCD 完成切换后这个目录会被删除。
>
> 本 skill 下面步骤 1-5（定范围、写 manifest、跑门禁、开 PR）现在**在 octopus-deploy 仓库里做**；
> 步骤 0/0.5（验 master 干净）和步骤 6（打 `prod-` tag）**仍在 octopus-cloud 做**——tag 打在代码仓，
> manifest PR 开在部署仓，这是两个仓库的两次动作，不要搞混。
> **CI 已切到 octopus-deploy（2026-10-08 发 v1.5.1.1.release-05 实测）**：打 `prod-<ver>` tag 后，
> CI `promote-prod` 会自动在 octopus-deploy 开 `release/prod-<ver>` PR 改 `values-prod.yaml` 的 digest；
> 前端打 tag 后同样自动开 `release/admin-prod-<ver>` PR。**manifest PR 合并 ≠ 上生产**（它合并后
> `values-prod.yaml` 不变），**CI 开出的那个 `release/prod-*` PR 被人合并才是上生产**。见步骤 6。

# 发生产（promote to prod）

承接 `test-merge-by-release`：那支 skill 管到「打 UAT tag `vX.Y.Z`」为止，本 skill 从那之后接手。

> 本 skill 由 2026-08-15 连发 v1.3.8.4 → v1.3.8.7 四个生产版本沉淀。当天踩了三个坑：
> 顺序做反导致 CI 必挂、发布分支基错 commit 导致找不到 release-record、manifest 每次必冲突。
> 下面每条红线都对应一次真实翻车。

## 红线

0. **动手前先验 master 干净。** master 上不允许存在「没走过 UAT 就进来的代码」，
   尤其是 `Merge branch 'dev' into master` 这种 dev 直入。发现即**停止发布**，先把 master 收敛回来，
   不要一边发版一边带着这坨代码上生产 —— 你的 tag 会把它一起晋级，而它从没在 UAT 上跑过。
   历史真实案例：`b62c03fa9 Merge branch 'dev' of gitee.com:lengfeng_2/octopus-cloud into master`。
1. **代码必须先合进 master，才能打 `prod-` tag。** 顺序反了 CI 一定挂，而且挂在第三步。
   **合进 master 一律开 PR（base=master）交给用户合并，禁止自己 merge 后直推 master**——
   历史上有过直推（如 `11585ec331`）不算授权。2026-10-17 v1.6.1.2 直推被用户批评。前后端都一样。
2. **发布分支基于 test HEAD，不能基于 `vX.Y.Z` tag 那个 commit。** release-record 是打完 tag 之后由 CI 回写的，tag commit 里没有。
3. **不要把自己的分支命名为 `release/prod-vX.Y.Z`。** CI 会 `git push -f` 到这个名字，覆盖你的分支。
4. **打 tag 前在 octopus-deploy 的 `main` 检出上本地跑一遍三道门禁。** 尤其第三道 `apply-manifest-to-prod.sh` —— 前两道读 record/tag 会过，只有它模拟真实写入 `values-prod.yaml`，是唯一能提前暴露"范围写错"的。
5. **contract 类迁移（DROP 任何东西）必须显式 `rollbackSafe: false`。** 这类发布回滚镜像救不了，只能向前修。
6. **manifest、release-record、values-prod.yaml 在 octopus-deploy 仓库，不在 octopus-cloud 的 `deploy/`。** 后者是拆仓过渡期的只读镜像，已停止更新——查当前生产状态、写 manifest、跑门禁，一律去 octopus-deploy。

## 为什么顺序不能反（最容易误判的坑）

`promote-prod` 三个步骤读的东西不一样（这张表描述的是 CI 侧 `open-release-pr` 流水线的机制，
拆仓后 PR 开在 octopus-deploy，但"代码要先进 master、record 才读得到"这条逻辑不变）：

| 步骤 | 读哪里 | 顺序反了会怎样 |
|------|--------|----------------|
| `verify-image-exists` | tag commit 的检出 | ✅ 过 |
| `validate-manifest` | tag commit 的检出 | ✅ 过 |
| `open-release-pr` | **先 `git checkout -B <branch> FETCH_HEAD`（切到 master）再读** | ❌ `找不到 release-record：该版本没走完 UAT` |

前两关全绿、第三关报「没走完 UAT」，非常像 CI 故障或镜像问题，实际是代码没进 master。

## 步骤

### 0. 前置确认

```bash
git fetch --tags origin test master
git log --oneline vX.Y.Z..origin/test        # 应只有 CI 回写那一条；有业务提交说明版本选错了

cd ~/IdeaProjects/octopus/octopus-deploy && git pull
cat release/records/vX.Y.Z.json              # backendTests 必须是 passed
```

record 现在在 octopus-deploy 仓库，不是 octopus-cloud 的 `deploy/`。没有 record = release-uat
没跑完或挂了，先去看 drone，别往下走。**注意 tag 名要精确匹配**：`vX.Y.Z` 和 `vX.Y.Z.release-01`
是两个不同的 tag，可能只有其中一个有 record——先 `git tag | grep <版本前缀>` 看清楚有哪些候选，
再逐个核对 record 是否存在、`backendTests` 是否 `passed`，别凭版本号"看起来对"就认定。

### 0.5 验 master 分支健康（硬门禁，不通过不许往下走）

发生产的前提是「master ≈ 上一个生产版本」。若 master 里混进了没过 UAT 的代码，
你这次打 tag 会把它顺带晋级 —— 那时才发现已经晚了。

**A. 查 dev 直入 master（最高危，必查）**

```bash
git log --oneline --merges origin/master | grep -Ei "merge branch '?dev'?|from dev|into master"
```

任何 `Merge branch 'dev' ... into master` 命中 → **立刻停止发布**并报给用户。
dev 是下一迭代的代码，整支并进 master 意味着未验证功能直通生产；这不是靠「本次只发某某服务」能规避的，
因为 manifest 只控 digest，代码已经在 master 上了，tag 一打就是它。

**B. 列 master 相对 test 多出来的代码提交，逐条定性**

```bash
git log --oneline origin/test..origin/master -- . ':(exclude)deploy/' ':(exclude)docs/'
```

排除 `deploy/`（CI 回写 digest）和 `docs/` 之后，剩下的每一条都必须能对上一个**已经发过生产的补丁版本**
（`release/*` 补丁线 → master，正常拓扑，允许）。定性方法：

```bash
git rev-list origin/test..origin/master -- . ':(exclude)deploy/' ':(exclude)docs/' | while read c; do
  tag=$(git tag --contains $c 2>/dev/null | grep '^prod-' | head -1)
  ind=$(git merge-base --is-ancestor $c origin/dev 2>/dev/null && echo IN-DEV || echo -)
  printf '%-10s prod-tag=%-20s dev=%s  %s\n' "${c:0:9}" "${tag:-无}" "$ind" "$(git log -1 --format=%s $c | cut -c1-50)"
done
```

判定：

| 结果 | 含义 | 处置 |
|------|------|------|
| 有 `prod-` tag 覆盖 | 已发过生产的补丁 | 放行 |
| 无 tag 且 `dev=IN-DEV` | **dev 代码漏进 master** | **停**，报用户 |
| 无 tag 且不在 dev | 有人直推 master / 误合 | **停**，查清来源再说 |

**C. 反向确认 test 已吸收 master**

master 上的补丁若没回流 test，本次从 test 起的发布会把它**回退掉**：

```bash
git log --oneline origin/test..origin/master -- . ':(exclude)deploy/' ':(exclude)docs/' | wc -l
```

非 0 且这些提交都还没进 test → 先做 `master → test`（或对应 `release/*` → test）的整分支合并回流，
再回来发版。别用 cherry-pick 搬。

> 三项任一不通过：**不打 tag、不提 PR、不改 manifest**，先把结论给用户，由用户决定怎么收敛 master。
> 这是唯一在「代码已经上生产」之前能拦住的位置。

### 1. 定发布范围

**先找"当前生产实际跑的是什么"作为基准，不要直接假设"上一个 prod tag"就是它。** 补丁线可能是从
master 上不同的点各自切出去的，两个 prod tag 之间不一定有祖先关系——但这不影响 diff，git diff 比
较的是两棵树的内容，不要求 commit 之间有血缘。真正的基准是 octopus-deploy 里**实际写着的
digest**：

```bash
cd ~/IdeaProjects/octopus/octopus-deploy && git pull
grep -A2 '^image:' charts/*/values-prod.yaml    # 看每个服务当前生产 tag，这才是基准，别猜
```

拿这个 tag（例如 `v1.3.1.release-02`）去 octopus-cloud 里跟本次要发的 tag 做 diff：

```bash
cd ~/IdeaProjects/octopus/octopus-cloud
for svc in gateway-bff system-core commerce-core fulfillment-core settlement-core open-api common; do
  n=$(git diff --name-only <当前生产tag> vX.Y.Z -- $svc/ | wc -l)
  [ "$n" != "0" ] && echo "$svc: $n"
done
```

**只把真正改了的服务写进 manifest**，其余服务 `values-prod.yaml` 保持原 digest 不动 —— 无谓换 digest 只是白重启。

**例外：`common/` 改了就必须六服务同批。** 六个服务都依赖 common，`DefaultCapabilityProvider` 在启动时校验能力码注册一致性；若同期还有清理未注册能力码的迁移，分批会同时踩「后发服务启动即挂」与「先发服务角色掉权限」，中间态无法靠回滚单服务收敛。

数据库迁移是否有新增，别只看文件 diff——**对比新旧 release-record 的 `flywayVersions` 字段**，两版
完全一致就说明这批没有新迁移，`dbMigrations` 可以留空。

### 2. 到 octopus-deploy 仓库切分支写 manifest

**这一步的仓库变了**——manifest 现在提到 octopus-deploy，不是 octopus-cloud：

```bash
cd ~/IdeaProjects/octopus/octopus-deploy
git checkout -B release-manifest/vX.Y.Z origin/main   # 分支名避开 release/prod-vX.Y.Z，CI 可能会 push -f 这个名字
```

清单路径：`release/manifests/<version>.yaml`（不带 `deploy/` 前缀）。

迁移分类，从 SQL 实际语句判定，别照抄上一版：

| SQL | type | 备注 |
|-----|------|------|
| `ADD COLUMN` / `CREATE TABLE` | `expand` | |
| 纯 `INSERT` / `UPDATE` / `DELETE` | `backfill` | 回滚安全 |
| `DROP TABLE` / `DROP COLUMN` / `DROP INDEX` | `contract` | **必须 `rollbackSafe: false`** |

```bash
# 快速看清一条迁移是什么性质（在 octopus-cloud 里看源文件）
cd ~/IdeaProjects/octopus/octopus-cloud
git show vX.Y.Z:<迁移文件> | grep -ioE "ADD COLUMN|MODIFY|DROP (TABLE|COLUMN|INDEX)|CREATE TABLE|INSERT|UPDATE|DELETE" | sort | uniq -c
```

`observeMinutes`：单服务 + 无迁移取 10；有 backfill 取 15；跨服务或含 contract 取 30。

### 3. 本地跑三道门禁（在 octopus-deploy 里）

```bash
cd ~/IdeaProjects/octopus/octopus-deploy
python3 scripts/release/validate-manifest.py release/manifests/vX.Y.Z.yaml vX.Y.Z
sh scripts/release/verify-release-record.sh vX.Y.Z registry.cn-hangzhou.aliyuncs.com/lengfeng-gs <本批服务...>
sh scripts/release/apply-manifest-to-prod.sh release/manifests/vX.Y.Z.yaml vX.Y.Z   # 看输出是否只动了本批服务
git checkout -- charts/                                                             # dry run 用的，别把它的改动提交进去
```

**改过 `scripts/endpoint-capability-exemptions.txt`（octopus-cloud 里）就必须补跑**
`bash scripts/check-endpoint-capability.sh`（在 octopus-cloud 里跑）。

### 4. manifest 提交、开 PR 到 octopus-deploy 的 main

```bash
git add release/manifests/vX.Y.Z.yaml
git commit -m "release: vX.Y.Z 生产发布清单"
git push -u origin release-manifest/vX.Y.Z
```

PR base 是 octopus-deploy 仓库的 **`main`**（不是 octopus-cloud 的 `master`，也不是 `dev`）。
PR 合并即视为发布审批通过——只提 PR，合并动作留给人。

### 5. 开 PR 合 master → 等用户合并 → 打 tag（回到 octopus-cloud）

先从 tag 切分支开 PR 到 master（`git merge-tree --write-tree origin/master vX.Y.Z` 结果树应 == tag 树），
**等用户合并后**，再在合并后的 origin/master 上打 tag。

- **「用户合了没」要去查，不要凭本地分支判断**：重新 fetch 后看 origin/master，或调 Gitee API 看 PR `state`。
  Gitee 合并常以新 SHA 落到目标分支，本地 `branch --contains` 看不出已合并。
- test→master 的 PR 是 **squash 合并**：tag commit 不是 master 的祖先，但内容零 diff
  （`git diff vX.Y.Z origin/master -- . ':(exclude)deploy/'` 为空即可），直接在 origin/master 上打 tag，不用纠结祖先关系。

```bash
cd ~/IdeaProjects/octopus/octopus-cloud
git tag -a prod-vX.Y.Z origin/master -m "Promote to prod: vX.Y.Z ..."
git push origin prod-vX.Y.Z
```

tag 名必须与镜像 tag 严格对应（`prod-` 前缀去掉后等于 `vX.Y.Z`），**不能换名**。若之前打错了位置，只能删了重推：

```bash
git push origin --delete prod-vX.Y.Z && git tag -d prod-vX.Y.Z
```

### 6. 真正上生产：合并 CI 开出的 `release/prod-*` PR

完整顺序（2026-10-08 实测）：**manifest PR 合并 → 打 `prod-` tag → 等 CI 在 octopus-deploy 自动开
`release/prod-vX.Y.Z` PR（改 digest）→ 人合并这个 PR 才上生产**，ArgoCD 随后同步。

- manifest PR 只是发布审批和范围声明，合并后 `values-prod.yaml` **不会变**，不要把它当成「已上生产」汇报。
- 不要抢在 CI 前面手动改 `values-prod.yaml` 或手动开这个 PR（会重复）；CI 没开出来就去 drone 看 `promote-prod` 挂在哪一步。
- 汇报时把这个 PR 的链接给用户，合并动作留给人。

## 前端 octopus-admin

**版本线与后端各自独立编号，不要对齐。** 机制也简单得多：没有 manifest、没有 release-record，`promote-prod` 只是 `docker pull` 确认镜像存在，然后在 master 上 `sed` 一下 `values-prod.yaml` 的 tag。

所以前端**不存在「必须先合 master」的硬约束**，但代码仍应合进 master，否则 master 的代码与线上镜像对不上。本地通常没有 checkout，用 Gitee API 打 tag：

```bash
curl -s --noproxy '*' -X POST "https://gitee.com/api/v5/repos/lengfeng_2/octopus-admin/tags?access_token=$T" \
  -G --data-urlencode "refs=master" --data-urlencode "tag_name=prod-vX.Y.Z" \
  --data-urlencode "tag_message=..."
```

**打完这个 tag，CI 会自动去 octopus-deploy 开出把 `values-prod.yaml` 镜像 tag 改过去的 PR，不要再手动切分支改 `values-prod.yaml` 或手动开这个 PR。** 前端流程到「打 tag 并确认推送成功」为止就结束了——这一点和上面后端的步骤 2-4（手写 manifest、跑门禁、手动开 PR）不是一回事，不要把后端那套流程也搬到前端来跑一遍。确认发布是否落地，去看 CI 有没有自动开出这个 PR，而不是抢在它前面自己开一个（会造成重复 PR）。那个 PR 合并才是真正上生产，ArgoCD 随后同步；只打 tag、PR 还没合并，生产镜像不会变。

前后端有版本落差时（后端权限体系已切、前端还是旧按钮逻辑），会出现按钮该显示不显示 / 该隐藏没隐藏，**这个窗口越短越好**。

## 汇报格式

**先报 §0.5 的结论**（master 是否干净 / 有无 dev 直入 / test 是否已吸收 master），再报发布内容。
master 不干净时汇报到此为止，不要顺手把后面的步骤做完。

给一张表：版本 / 内容 / 本批服务 / DB 迁移是否可回滚 / 状态。外加一句观察期该盯什么，按风险排序（能不能起来 > 迁移跑没跑完 > 权限有没有掉）。

## Gitee 访问（fetch / push / API）

- 本机代理会让 gitee 报 `SSL_ERROR_SYSCALL` 或卡死：命令前 `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy`，
  git 加 `-c http.proxy= -c https.proxy=`，curl 加 `--noproxy '*'`，并关闭 sandbox。
- 上面 `$T`（Gitee token）的来源顺序：用户本次对话给的 → `printf "protocol=https\nhost=gitee.com\n" | git credential fill`
  取 `password=`（macOS 钥匙串里的 git 凭证可直接当 `access_token`）→ 都 401 就向用户要。
  `GITEE_TOKEN` 环境变量经常已过期。**token 不要回显、不要写进任何文件。**

## 别忘了

- **编译和单测证明不了 Spring 容器能起来。** 循环依赖这类只有起服务才暴露，仓库里的 `@SpringBootTest` 都是要连库的 IT，本地跑不了。改了 Bean 注入关系的版本，别把「编译过了」当成能上生产。
- **`smoke: pending` 不拦晋级**，脚本只检查 `backendTests=passed` 与 digest 一致。UAT 到底验没验过，得自己问。
- 相关：[`test-merge-by-release`](../test-merge-by-release/SKILL.md)（UAT 阶段）、[`docs/ops/prod-release-runbook.md`](../../../docs/ops/prod-release-runbook.md)（完整 runbook）。
