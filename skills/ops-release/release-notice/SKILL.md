---
name: release-notice
description: 版本/功能发布通知生成器（发到群里给测试、产品、研发主管看的那种）。当用户说「写个发布通知」「发版通知」「上线通知」「给这个需求写个通知」「v1.5.0.release-14 发布通知」「小程序 1.0.32 发布通知」，或贴一个禅道需求/发布/迭代链接（pm.lengfenghl.org.cn 的 storyView / releaseView / execution）要求写通知时使用。以禅道（需求、发布、Bug）为业务口径，用三端 git 提交核实实际上线内容与版本，输出可直接粘贴到群里的纯文本通知。与 release-notes-gen（dev 发版 changelog + 审批 smoke 清单）、tag-fix-report（tag→tag 修复报告落盘 md）互补：本 skill 只产出面向群发的简版通知。
version: 0.1.0
---

# 发布通知（群发版）

产出一条**可直接粘贴到群里**的发布通知。读者是测试、产品、研发主管，不是开发：业务语言、不出现类名/接口路径。

## 一、识别输入 → 确定通知粒度

| 用户给的 | 粒度 | 标题 |
|---|---|---|
| 禅道需求链接 `storyView&storyID=N` | 单需求 | 【功能上线通知】<需求标题>（禅道 #N） |
| 禅道发布链接 `releaseView&releaseID=N` / 小程序版本号 | 发布 | 【版本发布通知】小程序 x.y.z |
| 后端/PC 版本 tag（如 `v1.5.0.release-14`） | 版本 | 【版本发布通知】v1.5.0.release-14 |
| 禅道迭代链接 `execution=N` | 迭代 | 【版本发布通知】迭代 x.y.z |

单需求时，查到它所属的发布后，在末尾**提示**同一发布里还有哪些需求，问用户要不要出整版通知。

## 二、取数（禅道为业务口径）

禅道 MCP 工具先用 `ToolSearch("select:mcp__zentao__zentao_story,mcp__zentao__zentao_get,mcp__zentao__zentao_execution,mcp__zentao__zentao_bug")` 加载。

- 需求：`zentao_story(id)` → `title`、`spec`（含 PRD 链接）、`children`（技术子需求）、`tasks`、`executions`（迭代）、`actions` 里的 `linked2release`（关联发布 id 与名称）、`closedReason`。
- 发布：`zentao_get("releases/<id>")` → `name`、`date` / `releasedDate`、`stories`、`bugs`、`desc`（常含"对应 PR !752 #312"这类映射，是找代码的线索）。
- 迭代：`zentao_execution(id)`、`zentao_get("executions/<id>/stories")`。
- Bug：`zentao_bug(id)` 逐个取标题、严重程度（严重级 1 要标出来）、模块。

需求描述常只有 PRD 链接和截图，**不能只凭标题写功能说明**，必须走第三步看代码。

## 三、用代码核实"实际上线了什么"

| 端 | 仓库 | 通知里的叫法 |
|---|---|---|
| 后端 | `octopus-cloud` | 后端（一般不单列，功能归到对应端） |
| PC 管理后台 | `octopus-admin` | 后台 PC / 直播中控 等具体页面 |
| 小程序 | `octoups-user` | 小程序 |
| 门店/零售 APP | `octopus-user-app` | 门店 APP / 零售 APP |

```bash
# gitee 操作先绕代理，否则 SSL_ERROR_SYSCALL / 卡死；同时关闭 sandbox
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy
git -C <repo> fetch --tags --quiet
git -C <repo> log origin/dev --oneline -i --grep="<关键词>" --since=<需求创建日>
git -C <repo> show --stat <hash>                      # 看改了哪些页面/服务
git -C <repo> show <hash> | grep -E '^\+.*(<中文文案>)'  # 取按钮名、提示语等用户可见文案
git -C <repo> tag --contains <hash> | grep -E '^prod|rc'  # 判断是否已进生产、哪个版本
```

- 关键词：需求标题里的业务词（如"置顶"），加英文词（pin/top）。项目里有 `graphify-out/` 时先 `graphify query` 定位模块。
- 同名功能要区分清楚（例：弹幕置顶 ≠ 商品置顶 ≠ 讲解中），通知里写明"互不影响"。
- 功能说明、按钮名、提示语**以 diff 里的实际文案为准**，不照抄需求标题或 commit message 脑补。
- 设计文档（`docs/superpowers/specs/`、`docs/*.md`）只能作补充；来自文档、没在代码里核实的限制条件，交付时单独告诉用户"待确认"，不要写进通知正文。
- 上线版本以 `prod-*` tag 为准，只有 rc tag 的写"已到 UAT"，不要写成已上线。
- **小程序 `octoups-user` 不打版本 tag**，生产线是 `origin/prod-mini` 分支（版本分支 `release/prod-mini-<x.y.z>`）。判断是否上线用 `git branch -r --contains <hash> | grep prod-mini`；只在 `origin/dev` 的不能写成已上线。
- **禅道发布里的 Bug 不等于都修了**：`resolution` 为 `willnotfix` / `bydesign` 的不计入修复数、不写进正文，交付时单列（严重级 1 的要点名）。
- 版本 tag 粒度的通知：用 `git log --first-parent <上个prod tag>..<本tag>` 统计全量（直推提交不走 PR，按 PR 统计会漏）。

## 四、通知模板

纯文本 + 少量 emoji，不用 Markdown 标题/表格（群里不渲染）。

```
@史书钰  @吴丹萍  @符洪斌  @柯希奎 Ethan
【版本发布通知】<版本>          ← 单需求用【功能上线通知】<标题>（禅道 #N）

📅 发布日期：YYYY-MM-DD
🏷 版本：<版本>（ERP系统）       ← 多端时写：小程序 1.0.32 ／ 后台及后端 v1.5.0

本次为功能版本，新增 N 项需求，修复约 M 项问题（含本版新追加的 K 项）。

本次新增

1. <功能名>：<一句话说清谁在哪里能做什么，以及带来什么好处>。
2. ...

问题修复

- ⚠️ <资金口径变更（重点关注）>：<以前怎样 → 现在怎样 → 影响>。
- <模块>（N项）：修复 <代表性问题 2~4 个>等。
- ...

⚠️ 注意事项          ← 可选：使用限制、与相似功能的区别、正常的防护提示
- ...

验收重点            ← 单需求 / 小版本必写；大版本按需
1. <操作> → <预期>
```

写作规则：

- **@ 名单**：默认是上面这 5 人；用户指定了就按用户的。
- **计数**：需求数、修复数和禅道发布里的一致；只能估算时写"约"，不要编精确数字。
- **新增**：编号列表，每条"功能名：说明"。说明要写清端和入口（例："直播中控聊天面板每条弹幕有「置顶」按钮"）。
- **修复**：按业务模块归类，写"模块（N项）：修复 xxx、xxx 等"。资金、积分、分账、退款类的口径变更单独放第一条，前面加 ⚠️ 和"重点关注"。严重级 1 的 Bug 要标出来。本版新追加的项标"（新增）"。
- **一句话写不下的修复**：写成"以前 → 现在 → 影响"。
- **编号**：发出前检查新增列表的编号是否连续，不要出现"11-13."混在列表里导致错号的情况。
- **收尾**：条目要写完整，不要出现半截句子。

## 五、交付

1. 在会话里直接给出通知全文（放在 `---` 分隔线之间，方便复制）。
2. 通知外另列：
   - 待确认项：来自设计文档、没在代码里核实的内容。
   - 同一发布里的其他需求，询问是否出整版通知。
3. 不自己往群里发、不改禅道状态，除非用户明确要求。
