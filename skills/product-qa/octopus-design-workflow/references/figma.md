# Figma 工具与操作契约

工具和官方技能名称以当前目标电脑发现的能力为准；下述是已核验的必要约束，不是允许猜工具签名的理由。首次运行先查看实际工具及当前官方说明。仅安装本 Skill 不会安装或授权 Figma 连接。

## 读取文件的已核验要点（2026-11-09，figma MCP 实测）

- 文件类工具调用前必须 `create_session`（参数 fileKey＋description），返回的 sessionId 需随每次调用传入；缺 description 会报 Invalid argument。
- `get_metadata` 不带 nodeId 时返回顶层页面清单；文件根节点（如 `0:0`）是无效目标，必须先列页再带具体 page/frame 的 nodeId 读子树。
- 读取顺序建议：列顶层页 → 读目标页 get_metadata 结构 → 需要实现时再 get_design_context / get_variable_defs；metadata 不含样式值，不能代替 design context。
- Bearer token 若为 MCP 专用 scope（`mcp:connect`），REST `api.figma.com` 会返回 403（需 `file_content:read`），只能走 MCP 通道；宿主连接器掉线时可本机 `npx mcp-remote`＋同一凭据自建 stdio 桥接读取，不因此暂停。
- 规范执行版文件的 05 变更记录页是锁定改动范围的入口；引用文件内容时记录读取日期与页面版本头。

## 默认使用 Design 与规范说明

Markdown 正文独立存放在共享仓库，不依赖原生 Specs。设计画面可配普通文字说明面板，明确标为“规范说明”，记录对应条目 ID、正文链接、提交/摘要及同步状态。它是正文的说明视图，不是原生 Spec 或另一个规则正本。正文变更先比较差异，只更新受影响说明；更改说明文字不等于更改设计、组件或样式。设计更新需要单独的节点读写与视觉验证。

## 可选的原生 Specs

- 调用 whoami，并确认目标文件属于哪个 plan；只有该 plan 明确 specs_enabled=true 才使用 figma.spec.*。whoami 的 plans 列表不能单独证明某个 fileKey 的归属。
- URL 有 node-id 时解析实际节点，目标必须是 SPEC_BLOCK 且 specBlockType=DOCUMENT。无 node-id 时在文件内发现并读取文档；多篇时按任务内容定位，仍不明确再问。不要臆造 nodeId。
- getContent 返回正文 markdown。编辑前读取同一 specNodeId；默认 editContent 每个 oldText 必须唯一匹配；只有空初稿或明确全文替换才 setContent。保留 [comment:uuid] 标记。
- 创建画布内 Spec 用当前工具支持的 createOnCanvasAsync，返回实际根 ID，随后 getContent 读回。独立文件创建走实际建文件能力，不把内嵌 Spec 冒充独立文件。
- 原生能力不足即停止该路线；不因 specs_enabled=true 继续重试运行时已拒绝的创建。Markdown 模式照常执行。普通 TEXT 仅作为明确标识的规范说明，不计为原生 Spec 完成。

## Design 与组件

状态色在属性、变体和实例生成后回读最终 fills/strokes 与透明度，分别检查主组件和预览实例，不能仅据变量值断言颜色一致。同一文件的验收截图按序获取；局部缺失且与结构矛盾的渲染需重新读取复核，不能记为通过。CSS 字体栈、实际字形字体及 Figma 替代字体分别记录。

写画布前加载 figma-use；创建页面和库分别加载 figma-generate-design / figma-generate-library。创建新文件前加载 figma-create-new-file。先读现有文件/库/变量，使用组件实例与 auto-layout，按实际变量定义绑定，不造固定值和虚构属性。

所有写入返回实际变更 ID，读回结构与属性。字体编辑先读取并加载原字体；不要从本机字体推断目标文件字体可用。多个画布写入顺序执行；失败后先检查是否已部分生效，再决定重试，不重复创建。

## 开发读取与映射

实现前加载 figma-design-to-code；get_design_context 同时取得截图，无截图补 get_screenshot。稀疏上下文继续读取适用子节点。按当前响应规定下载静态素材，代码不留临时 Figma 素材 URL，不能把整张设计截图当页面素材。

Code Connect 按实际属性和值映射真实代码 props/slots；不发明代码属性，不把 Vue 工程换成 React。没有发布组件或访问权时报告映射未生效，保留可审查的映射计划。套餐/席位能力以当前目标账号、工具和官方文档为准，不沿用旧技能中可能过时的套餐名单。

## 当前官方入口

- [Figma Specs](https://help.figma.com/hc/en-us/articles/44049066011671-Guide-to-Specs-in-Figma)
- [Code Connect](https://developers.figma.com/docs/code-connect/)
- [Codex Skills](https://developers.openai.com/codex/skills/)

这些链接解释能力，不证明某台电脑已连接或目标文件已授权。
