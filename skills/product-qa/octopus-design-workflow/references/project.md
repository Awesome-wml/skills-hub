# Octopus 与 LFerp 项目规则

## 可迁移定位

- LFerp 产品逻辑与原型入口（沿用已确认页面、流程、字段和交互；未确认项单列核对）：用户给出的发布页或需求链接；仓库 https://github.com/342-droid/LFerp 。本地存在 LFerp 时读取 docs/team-rules/README.md、适用团队规则与 PRD/导航，但核对与需求实际链接是否一致。
- Octopus 工程仓库：https://gitee.com/lengfeng_2/octopus-admin 。本地从用户工作区发现仓库根，不假设用户名或目录。读取 AGENTS.md、CLAUDE.md、docs/standards/README.md 与适用规则；Git 操作在实际子仓库执行。
- 产品电脑可先用包内 assets/project-baseline 中的规范/类型/Token 基线。每个文件的原路径、提交、内容摘要和是否包含 WIP 见 assets/project-baseline/manifest.json。基线不是自动更新的最新事实；当前仓库/设计与基线不同先比较并记录，不能静默覆盖。

## 关键约束

列表优先 VabSchemaTable；编辑优先 VabSchemaForm/Dialog/Drawer；详情优先 VabDetailPage/Header/Section/Drawer/Dialog。优先使用现有 schema、props 和 slot；纯读/编字段可以组合，不能推断所有业务都应禁用表单展示。

颜色/间距/字号/圆角来自 design-tokens.md 登记的变量及实际 styles/var.scss 与主题；设计时记录 Figma 变量→CSS Token 的映射。Table 密度跟随 layoutDensity；实际 props 默认值以组件代码为准，不以旧 README 的字号阈值为准。

状态字典区分状态 Tag 与操作按钮。展示已有 Label，不从 code/近义字段造默认展示；编辑仍用 code/value。SDK 未提供字段就报告缺口，不自行补数组、零值、拼接字段或猜默认值。权限走 v-permissions，删除/作废/停用按项目约束二次确认。

LFerp 的演示数据、内存或 localStorage 保存不作为生产 API/账务事实。商业快照不自动构成库存供应商匹配限制。已有 WIP、私有配置和共享服务保留；没有用户要求不创建/切换 worktree，不合并、部署或写生产。

## 组件映射最小字段

以下字段用于涉及 Figma/代码映射的交接。单次原型生成或展示规范化只填写本轮适用的映射；未涉及 Figma 不伪造节点，也不以缺少节点阻断工作。

Figma component/node URL；属性/variant/slot 和各适用值；Octopus 组件路径＋版本；真实 prop/slot 对应关系；Token/文字/效果样式绑定；未映射项与原因。包内类型快照用于产品阶段发现候选，开发前必须核验当前组件源码与实际接口。

规范基线适合携带到产品电脑；任务自己的需求、私有素材和运行数据不自动随 Skill 发布。需要分享这些资料时按用户指定范围另行交接。
