---
name: octopus-confirm-sync
description: 'Use when the user wants to sync 飞书 Base 回填表的答复状态到本地 spec 文件 §6 @确认清单。Triggers on "同步确认回填", "回填 @确认", "spec confirm sync", "把飞书上 PM 的答复抄回 spec", or any time the author merges Base replies back into a spec before marking approved. Only handles 方式 C (飞书 Base) path; not 方式 A / 方式 B. Generic across projects: reads project-local docs/superpowers/confirm-base.yaml for Base configuration.'
---

# Octopus Confirm Sync

配套上游 skill：`octopus-spec-author`。本 skill **只在方式 C 场景**运行 —— 判断依据：spec §6 里每条 `@确认` 后挂了 `[关联](<主表 record URL>)` 形式的 URL。

## 适用项目

任何采用"方式 C · 飞书 Base 回填表"的项目。首个落地项目是 octopus-cloud；其他项目复用同一协议，各自在项目本地 `docs/superpowers/confirm-base.yaml` 维护自己的 Base 配置。

## 触发后必做

1. 读 `references/confirm-sync-protocol.md` —— Base/主表/子表的**格式规约**（字段、触发机制、URL 识别规则）
2. 读 `references/spec-authoring-guide.md`（在配套 skill `octopus-spec-author/references/` 下；用户已装该 skill 即可；或直接读本项目的 guide）§3.4 方式 C —— 机制与流程
3. **读当前项目的 `docs/superpowers/confirm-base.yaml`** —— Base token / 主表 table_id / 子表 table_id / workflow_id / 字段映射；若不存在 = 项目未启用方式 C，直接退出
4. 接收一个 spec 文件路径作为输入；文件必须位于**当前项目的** `docs/superpowers/specs/`
5. 严格按下方「执行流程」执行
6. 回填 lint 必须通过（见 `octopus-spec-author/references/spec-lint.md`）后才允许 commit

## 边界

- 本 skill **只**读 Base + 改写 spec §6。不开 PR、不 push、不 commit（作者自行 review 后 commit）。
- 只处理方式 C 的 `[关联](...)` URL；方式 A 的"直接回填"不是本 skill 职责；方式 B 的 `gitee.com/...` 链接跳过。
- 不碰主表数据：本 skill 只读 Base，不写 Base。主表的「状态」「最终答复摘要」由作者/workflow 维护。

## 执行流程

1. **解析 spec §6**：用正则抓所有形如 `[关联](<url>)` 的链接
2. **筛选方式 C 链接**：
   - 按项目 `confirm-base.yaml` 的 `base_token` 识别"本项目主表" URL
   - 识别 `record=rec...` 查询参数或 URL 路径中的 record id
   - 不在项目 `base_token` 白名单里的链接跳过（可能是其他 Base，不是本机制）
3. **批量读主表**：对每个 record_id，用 lark-cli 读主表（table_id 读自项目 `confirm-base.yaml`）：
   ```
   lark-cli base +record-get --base-token <base_token> --table-id <main_table_id> --record-id rec...
   ```
   拿回：spec_id / 确认编号 / 类型 / 问题 / 状态 / 最终答复摘要 / 通知人
4. **批量读子表答复历史**：对每个主表 record_id，查子表：
   ```
   lark-cli base +record-search --base-token <base_token> --table-id <reply_table_id> \
     --json '{"keyword":"<spec_id>","search_fields":["spec_id"]}'
   ```
   过滤出该 spec 下所有答复，按「确认编号 + 轮次」分组排序
5. **状态判断每条 @确认**：
   - 主表「状态」= "已回复" 且「最终答复摘要」非空 → 闭环，可勾 `[x]`
   - 否则 → 仍是 `[ ]`，本次不推进
6. **改写 spec §6 和「@确认清单」**：
   - §6 每条 `@确认` 标签保持不动（它是作者原始描述锚点）
   - 「@确认清单」部分：
     - 每条 `@确认 #N` 的 `[ ]` → `[x]`（如果闭环）
     - 在该行后追加：`答复：<最终答复摘要>`（来自主表）
     - 保留原有 `[关联](<url>)`
     - 可选：追加多轮讨论折叠块（`<details><summary>查看 N 轮讨论</summary>...`，每轮答复一行）
7. **frontmatter 推进**：若所有 `@确认` 均已闭环 → `status: draft/reviewing` 改为 `approved`；否则保持原状
8. **输出 diff 给用户 review**：skill 不自动 commit；作者 `git diff` 后自行 `git add && git commit`

## 输入格式

```bash
# 方式 1：作者在对话里说"同步 <spec-file>"
"同步回填 docs/superpowers/specs/2026-04-17-points-pay-channel-and-freeze.md"

# 方式 2：作者只说文件名，skill 自动拼到 specs 目录
"sync confirms points-pay-channel-and-freeze"
```

## 输出格式

- 修改 spec 文件（仅 §6 「@确认清单」部分和 frontmatter `status`）
- 打印摘要到终端：
  ```
  已读取 N 条 @确认，其中：
    闭环（已勾 [x]）：X 条
    待回复：Y 条
  status: draft → approved  （仅当 Y=0 时）
  ```

## 不要做

- 不要同时实现方式 A / 方式 B 的"同步"逻辑 —— 那两种路径没有机器可读来源，只能人工
- 不要把 Base 配置硬编码进本 skill —— `base_token` / `table_id` / `workflow_id` 一律从项目 `docs/superpowers/confirm-base.yaml` 读
- 不要自动 push / 开 PR —— 作者要先 review diff

## TODO（下次迭代）

- [ ] 实现命令行形态的 `octopus-confirm-sync <spec-file>`（目前只是文字描述，未实现）
- [ ] 解析 spec §6 的正则鲁棒性测试（标签换行 / 编号跳号 / 多 link 场景）
- [ ] 主表"最终答复摘要"为空时的错误提示文案
- [ ] 多轮讨论折叠块的渲染格式（`<details>` 在 md 里兼容性 / 或者改成嵌套列表）
- [ ] 和 `spec-lint` 联动：sync 完跑 lint 检查回填是否合规
