---
name: tag-fix-report
description: 后端两个发版 tag 之间的差异修复报告生成器（面向测试/产品）。当用户说「对比两个 tag」「rc.1 和 rc.2 差了什么」「tag 差异报告」「这次 rc 修了什么」「总结修复报告」「生成 rc 修复清单」时使用。基于 octopus-cloud 的 git first-parent 提交全量统计两个 tag 的差异，核实关键 diff 后输出一份按业务模块归类、附测试要点与优先级的 markdown 报告（默认 docs/releases/）。与 release-notes-gen（dev 发版 changelog）互补：本 skill 用于 tag→tag（尤其 rc 之间）的精确差异。
version: 0.1.0
---

# Tag 差异修复报告（面向测试/产品）

对比后端 octopus-cloud 两个发版 tag（典型场景：同一版本的 rc.N-1 → rc.N），产出一份**测试和产品能直接读懂**的修复报告。

**与 release-notes-gen 的分工**：release-notes-gen 统计"自上次发版以来合并到 dev 的 PR"（前后端合并、Gitee API）；本 skill 统计"两个 tag 之间的精确 git 差异"（纯 git、仅后端、不依赖 Gitee token）。rc 迭代之间用本 skill。

---

## 工作流程

### Step 1 — 确定范围（铁律：first-parent 全量）

```bash
cd octopus-cloud
git fetch --tags --quiet
git tag -l "v<版本>*" | sort                       # 确认两个 tag 都存在
git log --oneline --first-parent <旧tag>..<新tag>   # 提交清单
git diff --stat <旧tag>..<新tag> | tail -3          # 总体规模
```

- **必须用 `--first-parent`**：本项目不少后端改动是直推的 commit、不走 PR，按 PR 统计会漏。
- 发版 tag 从 test 分支打，两个 tag 应在 test 分支血缘上。
- 范围里通常混有 `ci(release): ... [skip ci]` 的发版记录提交，归入附录、不算功能项。

### Step 2 — 逐提交取证（不要只看 commit message）

```bash
git show --stat --format="%s%n%b" <hash>            # 每个提交的正文 + 文件清单
```

对**关键提交必须抽查实际 diff 核实**，至少包括：

- 标题含 fix/修复 的提交 → `git show <hash> -- <关键文件>` 确认根因和修法，报告里的"现象/修复"必须与 diff 一致，不能照抄 commit message 脑补；
- 涉及资金（退款/支付/结算）、权限（DataScope/资源域/越权）的提交 → 必须看 diff；
- 跨模块提交（同时改 commerce/fulfillment/system）→ 理清事件链路（Outbox → Kafka listener）。

### Step 3 — 环境与数据库影响核查

release-record 自 2026-09-03 拆仓起在 **octopus-deploy** 仓库（默认分支 `main`，路径不带 `deploy/` 前缀）；
octopus-cloud 里的 `deploy/` 是拆仓遗留镜像、已停止更新，不要读它。

```bash
D=../octopus-deploy && git -C $D fetch origin main && git -C $D checkout -q origin/main
cat $D/release/records/<新tag>.json                  # 构建时间、sourceSha、flywayVersions
diff <(jq .flywayVersions $D/release/records/<旧tag>.json) \
     <(jq .flywayVersions $D/release/records/<新tag>.json)   # V__ 迁移有无变化
git diff --stat <旧tag>..<新tag> -- "*/db/seed/*" "*/db/migration/*"  # R__/V__ 明细（在 octopus-cloud 里）
```

tag 名要精确匹配：`vX.Y.Z` 和 `vX.Y.Z.release-01` 是不同的 tag，可能只有其中一个有 record。

- flywayVersions 无变化 + 有 `db/seed` 改动 → 报告写"无 V__ 迁移，仅 R__ 种子启动自动重放"。
- 扫描新增的 `Dev*Controller` / dev-test 专用接口 → 发版注意里提醒"确认生产不暴露"。

### Step 4 — 输出报告

落盘位置**先问用户**；默认建议 `$OCTOPUS_ROOT/docs/releases/<新tag>-fix-report.md`（与 `v1.0.1.md` 同目录）。
不要再写进 octopus-cloud 的 `deploy/`（拆仓遗留目录，会被删除）。

**受众规则（面向测试/产品，不是开发）：**

- 每项按 **现象/影响 → 修复/内容 → 怎么验** 三段写；"怎么验"给可操作的步骤和预期结果。
- 业务语言优先，不出现类名/方法名（附录除外）；代码细节只保留必要的（如"补偿接口仅 dev/test"）。
- 接口/页面级改动**标注调用端**：PC 管理后台 / APP / H5 / 小程序——同一业务在三端入口不同，不标测试会走错链路。
- 分类：先「缺陷修复」后「功能与优化」；资金相关标 ⚠️。

**报告骨架**：

```markdown
# <新tag> 修复报告（对比 <旧tag>）
| 元信息表：版本范围 / 构建时间 / 源提交 / 变更规模 / 数据库影响 / 单测状态 |
**一句话总览**
## 一、缺陷修复（每项：模块｜现象｜修复｜怎么验）
## 二、功能与优化（每项：模块｜内容｜怎么验）
## 三、测试优先级（P0 资金/权限 > P1 跨模块新链路/高频操作 > P2 文案/低风险）
## 四、发版注意（Flyway/种子、dev-only 接口、配置项）
## 附录：提交清单（first-parent 全量：hash｜模块｜标题）
```

**测试优先级排序规则**：资金安全 > 数据权限/越权 > 跨模块新链路 > 高频业务操作 > 文案与低风险小改。

### Step 5 — 交付

- 报告落盘后，在会话里给出文件路径 + 报告全文（或要点），供直接粘贴到群/文档。
- 报告文件随代码提交时走正常 PR 流程（不直推 dev/test）。
