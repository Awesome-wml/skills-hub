---
name: daily-report
description: 生成王茂林的"开发 + 发布"双线日报：当天完成事项、进度、瓶颈、明日计划、需要协助。数据源为 git log/tags（本人提交 + rc/prod tag + test/dev 合入）与禅道（本人名下 bug、当天新报 bug）。触发词："日报"、"写日报"、"今天干了啥整理一下"、"汇报一下今天进度"、"/daily-report"，或用户在一天结束时要求汇总当天工作、明日计划时使用。也可带日期参数补写某天日报。
---

# 日报生成（开发 + 发布双线）

用户是本项目的开发者，**同时是整个项目的发布者**，日报必须覆盖两条线：发布管理线在前，开发线在后。

## 第一步：采集数据

默认日期为今天（`date +%F`）；用户指定日期则用指定日期。以下命令并行执行（git 用户名是 `wml`，禅道实名"王茂林"）：

```bash
# 1. 本人当天提交（注意 --since 会带入更早的旧 commit，必须按 %ad 日期过滤，只留当天的）
git fetch --tags -q
git log --all --since="<date> 00:00" --author="wml" --pretty="%h %ad %s" --date=format:"%m-%d %H:%M" | sort -k2

# 2. 当天的 tag（rc = vX.Y.Z.release-NN / -rc.N；生产 = prod-v 前缀）
git for-each-ref refs/tags --sort=-creatordate --format='%(creatordate:format:%m-%d %H:%M) %(refname:short)' | head -20

# 3. 当天合入 test（UAT 投影分支）和 dev 的内容
git log origin/test --since="<date> 00:00" --pretty="%h %ad %an %s" --date=format:"%H:%M"
git log origin/dev --since="<date> 00:00" --merges --pretty="%h %ad %s" --date=format:"%H:%M"
```

禅道：用 `mcp__zentao__zentao_bugs` 拉最近 bug 列表。MCP 拉迭代 bug 常超过 120s 不返回，这时直接 curl 直连禅道 API
（`source ~/.claude/zentao.env` → `POST /api.php/v1/tokens` 换 token → 带 `Token:` 头 GET，unset 代理变量 + `--noproxy '*'`，关 sandbox；百来条约 7s），不要干等 MCP。脚本里不打印凭据。关注三类：
- 本人名下当天 resolved 的（→ 今日完成）
- 本人名下仍 active 的（→ 明日计划）
- 当天新报的一批 bug（不论指派给谁，发布者视角要评估是否影响版本窗口 → 明日计划/风险）

## 第二步：按固定模板输出

```markdown
以下是 **<日期>（周X）日报**：

## 今日完成
### 发布管理线
1. **生产发布 vX.Y.Z**：prod tag + 时间
2. **UAT 发布**：当天各 rc（release-NN）及各自包含的关键修复
3. **合流**：release 分支合入 test/dev 的情况、解掉的冲突
### 开发线
4. **<修复/功能名>（禅道 #NNN，状态）**：做了什么 + commit/PR + 进到了哪个版本

## 今日瓶颈
- 2~4 条，写系统性问题（版本线并行成本、流程被动、信息不透明），不写个人失误归因

## 明日计划
1. UAT 验证/生产晋级跟进（prod-release 红线：发布前先验 master 干净）
2. 名下 active 的禅道 bug
3. forward-port / 回补事项
4. 当天新报 bug 对版本窗口的影响评估

## 需要协助
- 2~3 条，具体到人群（测试/前端/责任人）和事项，说明不协助的后果
```

## 措辞红线（绩效保护，重要）

冒烟通过率、版本延期率、线上高优 Bug 率被考核，日报是给上级看的：

- 自己修的问题写"修复/补齐/恢复"，**不写**"我之前删错了/引入了"这类自认责任的表述。回滚类改动写成中性事实（如"昨日版本中做了调整，今日已恢复并补全"）。
- 瓶颈归因到**流程和结构**（多版本线并行、修复零散到达、配置消费方不透明），不点名同事。
- 他人的 bug 只列事实和指派人，不加评价。

## 其他注意

- 时间线交叉核对：commit 属于哪个 rc、rc 是否已发 UAT，别把未进版本的改动写成"已发布"。
- 数据不足时（比如当天没有 tag、禅道查不到），对应小节写"无"或省略，不要编造。
- 输出直接给用户可复制粘贴的中文日报，不要输出采集过程。
- 说某个 PR「已合并 / 还开着」前先查 Gitee 或 `git log origin/dev | grep <标题>`：Gitee 合并会以新 SHA 进 dev，本地分支看不出来。
- 正文里出现的英文状态值、表名、术语，后面括号写中文（如「PENDING（待处理）」），日报读者不一定懂。
- 别人复用本技能时：把上面的 git 用户名 `wml` 和禅道实名换成自己的。
