# 交接 JSON 字段

这是协作证据的结构，不是业务状态机。assets/handoff-template.json 是空模板，不能原样作为已交接结果。未实际执行的验收 result 写 not-run 或 blocked。

- task / scope：稳定任务定位与本次范围。
- spec：默认 kind=repo-markdown，记录真实共享正文的 url、repository_url、仓库相对 path、完整 commit、markdown_sha256、read_at。url 必须指向同一仓库提交下的文件，不用 main 等可变分支代替冻结版本。尚未发布的本地稿不能作为已共享交接通过验证。
- 原生模式使用 kind=figma-native，并记录 url、file_key、原生文档根 node_id、markdown_sha256、read_at；来自真实读取，不手填示例 ID。为兼容 0.1.0，缺少 kind 的旧交接仍按原生模式验证。
- sources[]：id、url、locator（章节/页面/状态）、read_at、sha256。需求附件可独立列 source。
- requirements[]：id、source_ids[]、statement、spec_anchor；每条需求至少追溯一个已读来源。
- designs[]：id、url、node_id、states[]、read_at、style_evidence（变量/文字样式/布局属性与截图定位）。
- mappings[]：design_id、code_path（仓库相对路径）、code_commit、props、tokens、mapping_status；确实无代码组件时用 not_applicable_reason 并说明影响，不能伪造 Code Connect。
- decisions[]：条目、各来源原口径、confirmed/source-fact/technical/proposed/pending 的性质与实际确认记录。分类只标记证据性质，不推导批准。
- acceptance[]：id、requirement_ids[]、scenario、expected、result（passed/failed/not-run/blocked）；执行过的结果还需 evidence。每条需求都有验收覆盖。
- implementation[]：需求 ID、仓库、提交/PR、文件/行与接口来源；产品阶段尚未实现时保持空数组。
- verification：业务、视觉、部署等分别记录真实完成程度。

运行 scripts/check_handoff.py 只检结构/引用/覆盖，不能识别 URL 内容是否真实、正文摘要是否来自工具或结果是否符合业务。结构通过后仍按 Skill 执行源材料读取、规格正文与 Figma 设计读回、视觉及业务验收。

仅交付 Spec 的任务使用 `--stage spec`，不强制生成设计；完整设计交接默认 `--stage design`；开发交接用 `--stage development`，还需 implementation[] 中每项有 requirement_id、code_path 和 commit。不要为了让验证器通过而扩大任务。
