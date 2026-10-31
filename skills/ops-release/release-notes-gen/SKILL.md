---
name: release-notes-gen
description: 本项目发版内容（changelog）生成器。当用户说「统计发版内容」「生成发版清单」「这次发版有哪些改动」「生成 changelog」「发版报告」「整理这个版本的 PR」「dev 到 test 有哪些改动」时使用。统计前端 octopus-admin 与后端 octopus-cloud 自上次发版以来进入 dev 的全部改动（Gitee PR + first-parent 提交，直推 dev 的也算），按业务模块归类，输出发版记录表 + 审批/smoke 重点清单。
version: 0.1.0
---

# 发版内容生成（前后端合并，基于 Gitee PR）

统计一个版本的发版内容。**必须前后端一起统计**：后端 `lengfeng_2/octopus-cloud` + 前端 `lengfeng_2/octopus-admin`。现行发版/部署说明见 `docs/后端技术/06-部署与运维.md`（旧的 `docs/架构/12-发版与运维.md` 已移入 `docs/_history/`，只作历史参考）。

---

## 工作流程

### Step 1 — 确定上次版本与统计范围（版本号不要问用户，自动定）

- **版本号由 skill 自动算，不要让用户拍**。先取上次发版 tag：
  ```bash
  git -C octopus-cloud describe --tags --match 'v*' --abbrev=0   # 后端
  git -C octopus-admin describe --tags --match 'v*' --abbrev=0   # 前端
  ```
  **前后端版本线各自独立编号，不要对齐**（后端 `v1.6.1.2` 时前端可能是另一个号）。两个仓库各用自己的上一个 tag 作为 `last_version`，分别统计、分别定版。
- 统计起点：该 tag 的日期 `git -C <repo> log -1 --format=%cI <tag>`，作为 `since` 过滤 PR。
- **下一版本号交给脚本算**（语义化规则）：传 `last_version`、**不传 `version`**，脚本按本次 PR 性质自动 bump：
  - 破坏性变更（标题 `feat!:` / `BREAKING`）→ 主版本号 +1
  - 有 feat / 接口 / 数据结构变更 → 次版本号 +1
  - 仅修复 / 杂项 → 补丁号 +1
- 若用户**显式**给了版本号，才传 `version` 覆盖自动结果。

### Step 2 — 拉取两个仓库的全部改动

**以 first-parent 提交为全量口径，PR 列表只用来补作者和链接**。本项目不少后端改动是直推 dev 的 commit，不走 PR，只拉 PR 列表会漏：

```bash
git -C <repo> fetch origin dev --tags
git -C <repo> log --first-parent <last_tag>..origin/dev --format='%cI | %an | %s'
```

Gitee 合并在 dev 上留下的提交形如 `!<PR号> <标题> Merge pull request !<号> from <分支>`，据此对上 PR 号。
过滤 `ci: update ... [skip ci]` 镜像回写、`Merge branch`、revert 对。（访问 gitee 要绕代理，写法见 prod-release 的「Gitee 访问」一节。）

再对 **octopus-cloud 和 octopus-admin 各跑一次** `mcp__gitee__list_repo_pulls` 补 PR 元数据（MCP token 常 401，失败就只用上面的 git 结果，不要卡住）：

```
owner=lengfeng_2  repo=<octopus-cloud|octopus-admin>
state=merged  base=dev  sort=updated  direction=desc  per_page=100
```

- 用 `since`（ISO8601）缩小范围；返回多页时翻页直到 `merged_at < 统计起点`。
- 只保留 `merged_at >= 统计起点` 的 PR。
- 每个 PR 取字段：`number` / `title` / `merged_at` / `user.name`(或 login) → author / `html_url` → url。
- **过滤掉发版回写噪音**：标题以 `ci:` 且含「update image tag」/「[skip ci]」的自动提交可忽略（非真实变更）。

### Step 3 — 渲染

把两个仓库拼成一个 JSON（结构见脚本头注释），喂给渲染脚本：

```bash
python3 .claude/skills/release-notes-gen/scripts/render-release-notes.py input.json
```

脚本按 conventional-commit 前缀（feat/fix/refactor/ci…）分类，自动产出：
- **发版记录表**（版本号/时间/tag/操作人/禅道发布任务）；
- 前端、后端各自按类型分组的 PR 清单；
- **⚠️ 需重点关注清单**：feat + 含 migration/接口/数据结构/字段/breaking 的 PR —— 用来判定是否走审批，并作为 QA smoke 重点。

### Step 3.5 — 按业务模块归类（必做，不能只按 commit 类型）

脚本只按 conventional 前缀（feat/fix）分组，**这不够**——光看 `refactor(outbound):…` 看不出在动什么业务。出稿时**必须再做一遍业务模块归类**（agent 人工判断，脚本做不到）：

- 把变更按**业务域 / 功能模块**聚合：支付/进件、出库拣分复、收货库存、订单取消、结算分佣、商品单位、门店进件、售后、直播、用户权限、工程测试……
- 每个模块**一句话说清改了啥**，并标 **smoke 重点**（这块怎么测）。
- 用 🔴 标出影响钱 / 行为变更 / 接口与数据结构变更的模块（审批 + 优先回归）。
- 末尾给一个「smoke 重点汇总」排序（按业务风险）。

> 参考成品：`docs/releases/v1.0.1.md`（按业务模块归类 + smoke 重点）。脚本输出的「按类型分组」只作为中间素材。
>
> 写「改了啥」时以代码为准：PR 标题和 commit message 常常不准，关键条目（动钱、动状态、动接口的）要看一眼 diff 再下结论。

### Step 4 — 交付

输出 markdown，问用户是否落盘（如 `docs/releases/<version>.md`）或贴进禅道发布任务。

---

## 输入 JSON 结构

```json
{
  "last_version": "v1.3.2",
  "since": "2026-06-20 18:00",
  "operator": "张三",
  "tapd": "https://www.tapd.cn/.../iterations/...",
  "groups": [
    {"label": "后端 octopus-cloud", "prs": [
      {"number":1174,"title":"refactor(order): ...","author":"youwei",
       "url":"https://gitee.com/lengfeng_2/octopus-cloud/pulls/1174"}
    ]},
    {"label": "前端 octopus-admin", "prs": [ ... ]}
  ]
}
```

- 传 `last_version`、**不传 `version`** → 脚本自动定版（推荐）。给 `version` 才覆盖。
- `merged_at` 可带可不带（仅展示用，过滤在 Step 2 已做）。

---

## 常见错误

| 错误 | 纠正 |
|---|---|
| 只统计后端 | **必须前后端都拉**——漏前端 = 漏一半改动（两边版本号各自独立） |
| 把 `[skip ci]` 自动回写 PR 当真实变更 | Step 2 过滤掉镜像 tag 回写噪音 |
| 只拉 PR 列表 | 后端有不少直推 dev 的 commit，**以 `git log --first-parent` 为全量**，PR 只补元数据 |
| 范围按分支 push 时间 | 按 `merged_at`（合并进 dev 的时刻）才准 |
| 版本号用 commit-sha | 发版 tag 是语义版本 `vX.Y.Z`，不可自定义 |
| 问用户「这次发什么版本号」 | 别问。传 `last_version` 让脚本自动 bump，像记录一样生成 |
| 前后端 last_version 取错 | 两仓库**各取自己的**上一个 tag，不要拿一边的号去套另一边 |
| 只按 commit 类型分组就交稿 | **必须再按业务模块归类**（Step 3.5）+ 每块 smoke 重点，否则看不出改了什么业务 |
| UAT 发版从 dev 打 tag | **错！UAT/prod tag 必须从 `test` 分支打**（dev→test 晋级后），dev 直接打会绕过稳定线 |
| 部署 PR（dev→test）只数 PR | dev→test 部署看 **test..dev 全量真实 commit**，不是「上次 tag 后的几个 PR」（test 可能落后很多） |
| 统计结果直接当「这次要合进 test 的范围」 | 合并 test 的范围**只认禅道发布任务**，统计只是素材，见 `test-merge-by-release` |

---

## 关联

- `docs/后端技术/06-部署与运维.md` — 现行部署与发版说明
- `test-merge-by-release`（按禅道发布任务合 test）、`tag-fix-report`（tag→tag 精确差异）、`release-notice`（群发通知）
