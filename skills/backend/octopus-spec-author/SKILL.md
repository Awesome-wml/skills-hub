---
name: octopus-spec-author
description: 'Use when the user wants to author a domain spec for any octopus backend project — drafting 领域 spec from a product requirement + code anchor. Triggers on "写 spec", "起草 spec", "新需求 spec", "技术方案", "接口契约", "产品要做 X 我准备改 Y", or any time the user describes a product feature plus a class/method/HTTP/page entry-point. Produces a two-layer spec (领域契约 + 施工清单) with @PM确认 / @架构确认 tags for unknowns. Generic across projects: reads the current project docs/superpowers/domain-index.yaml for domain invariants; octopus-cloud is the first implementation.'
---

# Octopus Spec Author

本 skill 的**通用流程与模板**完全自包含在 `references/` 下；**项目专属数据**（领域不变量、扩展点白名单、确认项模板）由**当前项目**的 `docs/superpowers/domain-index.yaml` 提供。

## 适用项目

任何需要"双层 spec（领域契约 + 施工清单）"工作流的后端项目。首个落地项目是 octopus-cloud；未来 octopus-user / opsapp / 新后端项目按同一套流程即可。

## 触发后必做

0. **先判断是否适用（硬性前置，命中即退出）**：若用户的需求本质是**纯 bug 修复 / 文案与配置调整 / 单纯重构 / 一次性脚本与数据回填 / 纯技术优化（性能、日志、命名、注释）** —— 即不引入新业务规则、新状态、新事件、新跨域交互 —— **不走本 skill**，直接告知用户"本 skill 不适用于纯 bug/技术类改动"并结束，**禁止**落盘任何 spec 草稿。判定边界：有产品原型 / PRD / 新业务流程 / 新领域行为 = 适用；只是让既有代码跑得更好或更干净 = 不适用。
1. 读 `references/spec-authoring-guide.md` —— 通用流程（步骤 0-10，含知识库拉取）
2. 读 `references/spec-template.md` —— 双层 spec 模板
3. 读 `references/spec-lint.md` —— lint 规则
4. 读 `references/domain-index-schema.md` —— `domain-index.yaml` 的格式规约
5. **读当前项目的 `docs/superpowers/domain-index.yaml`** —— 项目领域不变量、扩展点白名单、默问清单；若不存在或不符合 schema，先让项目维护者按 `domain-index-schema.md` 补齐
6. 严格按 guide 的「2. 流程：AI 工具该怎么做」**步骤 0-10** 执行：
   - **步骤 0**（生成前）：`git pull` 知识库 + 按域读取 `~/IdeaProjects/template-scaffold/docs/` 相关文档
   - **步骤 8.5**（生成后）：重读知识库文档 + 对照自检草稿，再进入 lint
7. **每条 `@确认` 生成后必须跑分类自查 + 行文自查**：
   - 分类：按 guide 步骤 5「分类守则」的红线词表检查；命中"表/字段/enum/SPI/抽象/性能/架构/..."等技术词汇默认归 `@架构确认`；不允许把架构决策 at 给 PM
   - 行文：`@PM确认` 内容必须用中文 + 业务视角提问；禁止出现类名/方法名/字段名/表名/接口名/enum/注解等代码符号；英文仅保留产品侧通用缩写（SKU/VIP/APP 等）。违反即改写或改标 `@架构确认`
8. **确认项超过 10 条时强制收敛**：`@PM确认` + `@架构确认` 合计 > 10 = 立刻停下，按 guide 步骤 5.5 **整篇重读**知识库文档 + `domain-index.yaml`（**禁止**用 grep 凑），逐条判断是否已有定论或可合并，最终把条数压回 ≤ 10；两轮仍超 10 必须在「@确认清单」开头写范围说明
9. 草稿 lint 必须通过（见 `references/spec-lint.md`）才允许 commit

## 产物落盘

草稿写入**当前项目仓库**：

```
docs/superpowers/specs/YYYY-MM-DD-<topic-kebab>-design.md
```

Commit message：`docs(superpowers): <topic> spec draft`。

## 边界

- 本 skill **只**产出 spec 草稿 + lint。不写实现代码、不开 plan。
- 实现 plan 由 `superpowers:writing-plans` skill 接续。
- 回填 `@确认` 答复由配套 skill `octopus-confirm-sync` 处理。

## 不要做

- 不要在本文件里写实质流程内容——所有流程描述必须在 `references/spec-authoring-guide.md` 里，避免分叉。
- 不要让开发回答业务不变量类问题；不知道一律标 `@PM确认` / `@架构确认`。
- 不要把项目专属数据（如 octopus-cloud 的具体扩展点名）硬编码进 `references/`；那些必须由当前项目的 `domain-index.yaml` 提供。
