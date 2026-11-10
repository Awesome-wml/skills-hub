# macOS 与 Codex 安装和首次执行

## 安装

这个包既有 portable plugin 清单和 skills 目录，也能按官方本地 Skill 路径安装单个 Skill。

最短路径：解压后打开终端，在解压出的 octopus-design-workflow 目录执行：

```sh
python3 install.py --check
python3 install.py --install
```

安装仅把本 Skill 复制到当前用户的 ~/.agents/skills/octopus-design-workflow。已有目录会拒绝覆盖；需要更新时先比较，并按脚本 --help 指定备份替换。不会修改 Codex 配置、共享 AGENTS、模型、账号或其他 Skill，也不会把当前电脑的登录传到目标电脑。没有 Python 3 时可将 skills/octopus-design-workflow 整个目录手工复制到上述用户目录。

支持本地插件的 Codex 也可以用解压包内 .agents/plugins/marketplace.json 作为本地来源，按当前官方插件安装文档在客户端安装；不要同时安装独立 Skill 与插件中的同名 Skill，以免列表重复。包内未配置 Figma MCP，需在目标客户端单独连接官方 Figma。

Codex 官方说明支持从 ~/.agents/skills 发现用户 Skill；变化未显示时再重新打开客户端/新会话。检查能否选到 octopus-design-workflow，不仅看目录存在。

## 目标电脑的执行前检查

先读实际安装的 SKILL.md，再：

1. 运行 `python3 <Skill目录>/scripts/preflight.py` 检查包内资源。开发模式加 `--admin-root <Octopus管理端目录>`；有 LFerp 本地仓库时可加 `--lferp-root <LFerp目录>`。只读，不读凭据、不自动克隆或安装。
2. 在当前会话发现 共享仓库规格访问，以及 Figma 的身份、节点/设计上下文、截图及所需画布写能力。检查对应官方操作技能；不同模式只要求相关工具。脚本不能检查 live MCP，会明确返回 agent_check_required。
3. 每台电脑在官方 Figma 连接自行登录；确认相关设计文件实际访问权。Markdown 模式不要求原生 Specs；只有明确选用原生模式才核验归属 plan、specs_enabled 及实际读写。没有共享正文或设计目标时只能完成对应的环境/模板检查，不能宣称完整协作链路通过。
4. 解析材料入口和本地路径；共享链接必须在目标账号可读。产品模式没有 Octopus checkout 可以使用包内版本基线；开发模式必须有实际代码、规范和接口来源。
5. 检查用户需求权限：读材料不等于批准改全部设计/发布库/写生产。只缺一个来源或工具时暂停对应步骤，继续独立工作，不回退成无 Spec 的代码生成工作流。

## 产品、设计与开发电脑怎么使用同一能力

产品/设计提示：`用 $octopus-design-workflow，根据这个 LFerp/需求入口，在指定仓库起草 Markdown 规格，并关联这个 Figma 目标的设计与规范说明，形成可开发交接。`

开发提示：`用 $octopus-design-workflow，读取这份同一仓库 Markdown 规格、Figma 设计和交接，核对 LFerp 是否符合设计师稿、已有系统和已确认变更，按 Octopus 组件/接口实现并验收。`

验收提示：`用 $octopus-design-workflow，对照这份 Spec、LFerp 与 Figma 设计验收这个环境，分别报告业务与视觉差异。`

迁移只携带 Skill、规范基线和用户明确选择的任务交接；不复制 API token、浏览器会话、个人路径、私有环境文件或当前聊天全文。安装成功、工具连接成功、目标 Spec 读写成功和业务验收通过是四种不同结论。

官方路径与插件格式来源：[Codex Skills](https://developers.openai.com/codex/skills/)、[Package your plugin](https://developers.openai.com/plugins/build/plugins)。
