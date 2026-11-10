# Octopus Skills

Octopus 项目（octopus-cloud / octopus-admin / octoups-user / opsapp / store-register-h5）的 Claude Code / Codex / Cursor 技能合集。

> 集群运维、日志排查类技能涉及内部基础设施，未包含在公开版本中。

## 安装

```bash
# 单个技能装到某个仓库（Claude Code）
cp -r skills/backend/springboot3-backend <repo>/.claude/skills/
# 或装成个人全局技能
cp -r skills/ops-release/prod-release ~/.claude/skills/
```

部分技能依赖环境变量（已脱敏为占位符），用前在本地 `.env` / shell 配好：

| 变量 | 用到的技能 |
|---|---|
| `~/.claude/zentao.env`（禅道账号，curl 换 token 用） | test-merge-by-release、daily-report |
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` | dict-creator |
| `WIKI_BASE_URL` / `WIKI_CONN_ID` / `WIKI_API_KEY` | wiki-read-only |
| `OCTOPUS_ROOT`（octopus 工作区根目录） | prd-review |

## 技能清单

### 运维 / 发布 / 协作

| 技能 | 用途 |
|---|---|
| [daily-report](skills/ops-release/daily-report) | 生成王茂林的"开发 + 发布"双线日报：当天完成事项、进度、瓶颈、明日计划、需要协助。数据源为 git log/tags（本人提交 + rc… |
| [git-branch-commit](skills/ops-release/git-branch-commit) | 指导在本仓库中按功能分支开发、用 rebase 对齐 dev、通过 PR 合并、使用中文编写 commit message，并在成功提交后立… |
| [git-pr-dev-test](skills/ops-release/git-pr-dev-test) | 提交代码并创建 Gitee PR。普通业务改动一律只进 dev；test 是长期 UAT 投影分支，只接受 release PR， |
| [pr-conflict-analysis](skills/ops-release/pr-conflict-analysis) | 诊断 PR 冲突的成因并给出解法。触发词："这个 PR 为什么冲突"、"PR 老分叉"、"合不进去"、"冲突怎么解"、"两个版本线打架"。核… |
| [prod-release](skills/ops-release/prod-release) | 把已过 UAT 的版本晋级到生产（打 prod- tag）。触发词："发生产"、"上生产"、"晋级生产"、"打 prod tag"、"发下这… |
| [release-notes-gen](skills/ops-release/release-notes-gen) | 本项目发版内容（changelog）生成器。当用户说「统计发版内容」「生成发版清单」「这次发版有哪些改动」「生成 changelog」「发版… |
| [release-notice](skills/ops-release/release-notice) | 版本/功能发布通知生成器（发到群里给测试、产品、研发主管看的那种）。当用户说「写个发布通知」「发版通知」「上线通知」「给这个需求写个通知」「… |
| [tag-fix-report](skills/ops-release/tag-fix-report) | 后端两个发版 tag 之间的差异修复报告生成器（面向测试/产品）。当用户说「对比两个 tag」「rc.1 和 rc.2 差了什么」「tag … |
| [test-merge-by-release](skills/ops-release/test-merge-by-release) | 按禅道发布任务合并 PR 到 test 分支并发 UAT rc。触发词："把 x.y.z 合到 test"、"合并 test 的 PR"、"… |

### 后端 octopus-cloud

| 技能 | 用途 |
|---|---|
| [api-test-gen](skills/backend/api-test-gen) | 本项目接口测试脚本生成器。当用户说「生成接口测试」「生成 http 测试文件」「为 Controller 生成测试脚本」「生成 .http … |
| [authz-map](skills/backend/authz-map) | 菜单权限 2.0 的权限映射生成器：给定前端页面（或功能、或一批页面），找出「页面打开要调的读接口」和「每个按钮点击要调的写接口」，对照后端… |
| [code-review](skills/backend/code-review) | 代码审查 Skill：基于等保 2.0 安全合规要求和本平台架构设计理念，对变更代码进行系统化审查 |
| [dict-creator](skills/backend/dict-creator) | 查询数据库字典是否存在，存在则返回 key，不存在则生成幂等 INSERT SQL（含 sys_dict_type + sys_dict 两… |
| [flyway-migration](skills/backend/flyway-migration) | 创建 Flyway 数据库迁移脚本。自动获取当前时间戳生成规范文件名，支持幂等 DDL/DML |
| [octopus-confirm-sync](skills/backend/octopus-confirm-sync) | Use when the user wants to sync 飞书 Base 回填表的答复状态到本地 spec 文件 §6 @确认清单。T… |
| [octopus-design-lookup](skills/backend/octopus-design-lookup) | Octopus 项目飞书设计文档智能查阅。当用户/任务涉及组织/合作/门店/商品/价格/订单/履约/仓储/库存/支付/分账/营销/分销/通知… |
| [octopus-spec-author](skills/backend/octopus-spec-author) | Use when the user wants to author a domain spec for any octopus backen… |
| [platform-kernel](skills/backend/platform-kernel) | Platform kernel starters reference: routing, dict, authz, data-scope, … |
| [platform-module](skills/backend/platform-module) | 在本项目中新增业务模块、Controller、Service、Action、Repository 或整个微服务模块时的代码生成指引。遵循 s… |
| [region-code-fix](skills/backend/region-code-fix) | 修复门店/主体的行政区划码错误（尤其「市辖区」这类国标占位码导致汇付进件报「地区编码有误」）。触发词：「地区编码有误」「进件报区划错误」「市… |
| [springboot-unit-test-gen](skills/backend/springboot-unit-test-gen) | 本项目 Spring Boot Controller 单元测试生成器。当用户说「生成单元测试」「为 Controller 写单元测试」「给 … |
| [springboot3-backend](skills/backend/springboot3-backend) | 本项目 Spring Boot 3 后端开发规范，基于 platform-kernel 全套 starter、DDD 分层架构、Sa-Tok… |

### 管理后台 octopus-admin

| 技能 | 用途 |
|---|---|
| [api-contract-strict](skills/admin-web/api-contract-strict) | 前端接口契约严格对齐规则。用于对接后端 API / SDK / OpenAPI、编写列表/详情/表单的数据映射、处理接口返回值、拼装请求参数… |
| [api-integration-only](skills/admin-web/api-integration-only) | 页面接口对接专用约束。用于列表/详情/表单/弹窗/抽屉对接后端 API、SDK、OpenAPI 时，只改请求、响应映射与字段绑定，禁止私自改… |
| [detail-page](skills/admin-web/detail-page) | 详情页组件开发指南。使用 VabDetailPage + VabDetailPageHeader + VabDetailSection 组件… |
| [enable-list-time-sorting](skills/admin-web/enable-list-time-sorting) | 为 octopus-admin 新建或修改分页列表页时，确保所有展示型时间列支持与后端契约一致的服务端排序。适用于 VabSchemaTab… |
| [ledger-entry](skills/admin-web/ledger-entry) | 实施台账记录维护指南。用于在 octopus-admin 仓库内新增或补写实施记录、选择正确的功能域台账、 |
| [no-frontend-data-fallback](skills/admin-web/no-frontend-data-fallback) | octopus-admin 前端接口数据对接强制约束。适用于新增或修改前端页面、组件、API/SDK 对接、字段映射、详情回显、表单提交、列… |
| [octopus-admin-dev](skills/admin-web/octopus-admin-dev) | octopus-admin 项目前端页面、组件、路由、权限与 API 对接规范。适用于本仓库的 Vue 3 + TypeScript 前端开… |
| [octopus-doc-no-component-rule](skills/admin-web/octopus-doc-no-component-rule) | Use when creating or modifying octopus-admin frontend list or detail p… |
| [pencil-pixel-perfect-mode](skills/admin-web/pencil-pixel-perfect-mode) | 严格根据 Pencil MCP 提供的设计图生成 Vue / UniApp 页面，实现 UI 1:1 像素级还原。Use when the … |
| [schema-crud](skills/admin-web/schema-crud) | Schema 驱动的 CRUD 页面生成指南。使用 VabSchemaTable + VabSchemaForm / VabSchemaFo… |
| [vue3-pc-web](skills/admin-web/vue3-pc-web) | Vue3 PC web application development with TypeScript, Element Plus, and… |
| [webapp-testing](skills/admin-web/webapp-testing) | Web 应用 E2E 测试与浏览器联调指南。适用于 Vue/React/后台管理系统等浏览器端应用的端到端验收： |

### 小程序 / H5（octoups-user、store-register-h5）

| 技能 | 用途 |
|---|---|
| [octoups-frontend-integration](skills/miniapp/octoups-frontend-integration) | Use when the task is front-end API integration, joint debugging, backe… |
| [octoups-iconfont](skills/miniapp/octoups-iconfont) | Integrates or updates Alibaba iconfont (Font class) in the octoups-use… |
| [octoups-miniapp-standards](skills/miniapp/octoups-miniapp-standards) | Use when modifying the octoups-user WeChat miniprogram's pages, compon… |
| [octoups-miniprogram-dev](skills/miniapp/octoups-miniprogram-dev) | Use when the user asks to add, modify, refactor, debug, or integrate f… |
| [octoups-miniprogram-sdk](skills/miniapp/octoups-miniprogram-sdk) | Use when the task touches the generated C-end API SDK in |
| [octoups-miniprogram-to-apps](skills/miniapp/octoups-miniprogram-to-apps) | 把 octoups-user 小程序 miniprogram 的改动同步到 apps/uni-client（uni-app） |
| [octoups-screenshot-to-spec](skills/miniapp/octoups-screenshot-to-spec) | Use when the user provides a screenshot, PNG, or design image and want… |
| [octoups-spec-to-code](skills/miniapp/octoups-spec-to-code) | Use when a result page in `octoups-user-results.pen` has been confirme… |
| [octoups-uni-migrate-discipline](skills/miniapp/octoups-uni-migrate-discipline) | Enforces uni-app migration discipline for octoups-user: never hand-edi… |
| [store-register-h5-dev](skills/miniapp/store-register-h5-dev) | storeRegisterH5 前端 H5 开发规范。用于 uni-app Vue2 页面、组件、样式、配置修改及后端接口联调 |
| [uni-migrate](skills/miniapp/uni-migrate) | 把冷丰生鲜微信小程序(octopus-user/miniprogram)渐进式迁移到 uni-app 多端工程(octopus-user/a… |

### 运营 App opsapp

| 技能 | 用途 |
|---|---|
| [git-batch-commit-zh](skills/opsapp/git-batch-commit-zh) | 用于当前仓库的 Git 提交与推送协作约定。当用户明确说“分批提交”时，先检查当前工作区改动，再按功能或变更性质拆成多个原子 commit，… |
| [opsapp-branch-workflow](skills/opsapp/opsapp-branch-workflow) | 管理 OpsApp 的需求分支、联调、UAT 与生产发布。基于生产切迭代分支，按需推进 dev → test → master |
| [opsapp-component](skills/opsapp/opsapp-component) | 创建 OpsApp 的 UniApp-X 组件，包括基础 primitives 和业务 domain 组件 |
| [opsapp-debounce-throttle](skills/opsapp/opsapp-debounce-throttle) | OpsApp 页面/组件里实现防抖（搜索联想、数量同步、表单校验等只关心最后一次调用的场景） |
| [opsapp-frontend-dev](skills/opsapp/opsapp-frontend-dev) | OpsApp 项目前端页面、组件、路由、能力守卫、API 对接、设计稿样式统一与新增图标规范。用于当前仓库的 uni-app x / UTS… |
| [opsapp-production-pack](skills/opsapp/opsapp-production-pack) | 按手册打 OpsApp 安卓 / iOS / 鸿蒙生产正式包，核证书、环境、版本并收包到桌面； |
| [opsapp-timer-cleanup](skills/opsapp/opsapp-timer-cleanup) | OpsApp 页面里创建 setTimeout/setInterval（扫码看门狗、防抖、倒计时、数量同步、滚动锁等）时， |
| [opsapp-tri-platform](skills/opsapp/opsapp-tri-platform) | OpsApp 新增或修改页面、组件时，一次写出 Android、iOS、HarmonyOS 三端通用的实现， |
| [opsapp-ui-layout](skills/opsapp/opsapp-ui-layout) | OpsApp 页面布局与字号规范。全局页边距 12px，卡片间距 8px，卡片内边距 12px（内容多可改 8px）； |
| [senior-frontend-engineer](skills/opsapp/senior-frontend-engineer) | 以项目资深工程师身份做前端开发：先读产品文档、代码现状和规范，再说三句话等确认，再按目标平台写代码，不猜、不加无关依赖、不声称未跑过的验证 |

### 产品 / 测试 / 导航

| 技能 | 用途 |
|---|---|
| [intent-e2e](skills/product-qa/intent-e2e) | 意图驱动的端到端测试：人用业务语言写「要验证什么」和判定标准，智能体用探针探索页面、生成确定性的 Playwright 脚本，回归失败时分诊… |
| [octopus-design-workflow](skills/product-qa/octopus-design-workflow) | 用 Octopus 的 Token、组件与页面规范约束原型：可在产品写业务逻辑、生成原型之前调用，也可在已有原型之后调用… |
| [prd](skills/product-qa/prd) | 使用此技能来创建、编写、优化或完善产品需求文档（PRD）。当用户提到「PRD」、「产品需求」、「需求文档」、「功能规格」、「产品规划」、「用… |
| [prd-review](skills/product-qa/prd-review) | PRD 转技术方案技能：对照项目架构知识库（template-scaffold/docs/）和当前代码（前后端）， |
| [skills-guide](skills/product-qa/skills-guide) | 技能总导航与管理中心。当用户询问「有哪些技能」「该用哪个技能」「技能怎么用」「帮我选择合适的技能」时使用 |
| [wiki-read-only](skills/product-qa/wiki-read-only) | 仅允许查看知识库（飞书 Wiki）内容时使用。当用户需要「只看知识库」「查知识库文档」「列表/空间/节点/文档内容」且不调用其他业务接口时启… |

## 未收录

- `openspec-*`（13 个）：OpenSpec CLI `openspec init` / `openspec update` 自动生成，各仓库按需重新生成即可。
- `graphify`：第三方工具 `graphify` 自带的技能。
