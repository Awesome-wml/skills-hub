---
name: skills-guide
description: >
  Octopus 技能总导航。当用户问「有哪些技能」「该用哪个技能」「这事用什么技能」「技能怎么用」「帮我选个技能」，
  或一个任务跨好几个阶段（需求→开发→提 PR→发 UAT→发生产、告警→排查→修复→发版）需要知道先用哪个、再用哪个时使用。
  按意图推荐技能和调用顺序，并给出所有技能共用的工作约定。
metadata:
  last-updated: '2026-10-31'
---

# Octopus 技能导航

收到请求后：判断意图 → 在下面的地图里选**一个**最贴切的技能 → 跨阶段的任务按「典型链路」给出调用顺序 → 说明用户需要提供什么（禅道链接、tag、traceId、页面路径……）。

## 一、按意图找技能

### 需求与设计

| 想做什么 | 技能 |
|---|---|
| 写 / 改 PRD | `prd` |
| PRD 转技术方案、评审可行性 | `prd-review` |
| 写某个后端业务域的 spec | `octopus-spec-author` |
| 查飞书上的设计文档（组织/门店/订单/履约/结算……） | `octopus-design-lookup` |
| 把飞书 Base 回填表的答复同步回 spec 的确认清单 | `octopus-confirm-sync` |
| 只读查飞书 Wiki | `wiki-read-only` |

### 后端 octopus-cloud

| 想做什么 | 技能 |
|---|---|
| 任何后端开发（先看规范） | `springboot3-backend` |
| 新增业务模块 / Controller / Action / Repository | `platform-module` |
| 查 kernel starter 用法（路由、字典、鉴权、数据权限、审计、Outbox……） | `platform-kernel` |
| 写 Flyway 迁移 | `flyway-migration` |
| 查字典 / 生成字典种子 SQL | `dict-creator` |
| 页面要配哪些权限、接口 403 缺哪个原子 | `authz-map` |
| 代码审查 | `code-review` |
| 生成 .http 接口测试 / Controller 单测 | `api-test-gen` / `springboot-unit-test-gen` |
| 汇付进件报「地区编码有误」 | `region-code-fix` |

### 管理后台 octopus-admin

| 想做什么 | 技能 |
|---|---|
| 页面、组件、路由、权限、接口对接的总规范 | `octopus-admin-dev`（通用 Vue3 写法看 `vue3-pc-web`） |
| 列表 + 表单弹窗 | `schema-crud` |
| 详情页 | `detail-page` |
| 列表时间列排序 | `enable-list-time-sorting` |
| 对接接口：字段严格对齐、只改对接层、不做前端兜底 | `api-contract-strict` / `api-integration-only` / `no-frontend-data-fallback` |
| 列表/详情页不引用文档组件的约束 | `octopus-doc-no-component-rule` |
| 按 Pencil 设计稿 1:1 还原 | `pencil-pixel-perfect-mode` |
| 补实施台账 | `ledger-entry` |
| 浏览器端到端验收 | `webapp-testing`；用业务语言写验证意图、自动生成 Playwright 用例 → `intent-e2e` |

### 小程序 / H5 / 运营 App

| 想做什么 | 技能 |
|---|---|
| octoups-user 小程序开发 / 规范 / 联调 / SDK | `octoups-miniprogram-dev` / `octoups-miniapp-standards` / `octoups-frontend-integration` / `octoups-miniprogram-sdk` |
| 截图→页面规格→代码 | `octoups-screenshot-to-spec` → `octoups-spec-to-code` |
| 小程序迁移 uni-app、改动同步到 uni-client | `uni-migrate` / `octoups-uni-migrate-discipline` / `octoups-miniprogram-to-apps` |
| iconfont | `octoups-iconfont` |
| 门店注册 H5 | `store-register-h5-dev` |
| OpsApp 开发（总规范 / 组件 / 布局 / 三端 / 定时器 / 防抖） | `opsapp-frontend-dev` / `opsapp-component` / `opsapp-ui-layout` / `opsapp-tri-platform` / `opsapp-timer-cleanup` / `opsapp-debounce-throttle` |
| OpsApp 分支与发布、打正式包 | `opsapp-branch-workflow` / `opsapp-production-pack` |
| 先读文档再确认再写代码的工作方式 | `senior-frontend-engineer` |
| 分批提交 | `git-batch-commit-zh` |

### 分支、PR 与发版

| 想做什么 | 技能 |
|---|---|
| 开分支、commit、push | `git-branch-commit` |
| 提 PR（判断进 dev / release / 补丁 release） | `git-pr-dev-test` |
| PR 冲突、老分叉、合不进去 | `pr-conflict-analysis` |
| 按禅道发布任务合 test、发 UAT rc | `test-merge-by-release` |
| 发生产（打 prod tag） | `prod-release` |
| 统计发版内容 / changelog | `release-notes-gen` |
| 两个 tag 之间修了什么（给测试/产品） | `tag-fix-report` |
| 群发的发布通知 | `release-notice` |
| 写日报 | `daily-report` |

### 线上排障与运维

集群访问、日志排查、根因追踪、直播容量这几类技能涉及内部基础设施，没有放进公开版本；有权限的同事从内部渠道获取。

## 二、典型链路

```
新功能：   prd → prd-review / octopus-spec-author → springboot3-backend + octopus-admin-dev（或 schema-crud）
           → authz-map（配权限）→ git-pr-dev-test（PR 进 dev）
发版：     test-merge-by-release（按禅道合 test、打 UAT tag）→ release-notes-gen / tag-fix-report → release-notice
           → prod-release（PR 合 master → 打 prod tag → 合 CI 开的 release/prod-* PR）
线上问题： 取证、定根因（只分析，相关技能未公开）→ 用户同意后修
           → git-pr-dev-test（UAT 问题进 release 分支，生产问题从 master 切补丁 release）→ 禅道只建 Bug
冲突：     pr-conflict-analysis 先定性（双 SHA / CI 产物 / 版本线并行 / 种子撞号 / 真冲突）再动手
```

## 三、所有技能共用的工作约定

这些是用户反复纠正过的习惯，任何技能下都适用：

1. **回复以中文为主**：英文状态值、表名、术语第一次出现时后面加括号，用一句白话说清是什么，例如「PENDING（待处理）」「split（分佣明细：一笔订单商品分给某个收款方的一行钱）」。写进文件的文档按文档原有语言。
2. **排障默认只分析不改代码**：「继续」不等于授权；用户说「改吧 / 修一下 / 提 PR」才动手。
3. **现状以 origin/dev（或对应环境分支）为准**：本地工作区常签出在落后上百提交的功能分支，读之前先 fetch，用 `git show origin/dev:<path>` 核对，结论里写明基线 commit。
4. **写库的 SQL 不自己执行**：回填、订正、迁移只交付 SQL，只读查询和 dry-run 可以跑。
5. **一个改动只落一条分支**：不要 test 和 release 各提一个 PR；「dev 也要」指在 dev 生效，不是往 dev 再开 PR。
6. **说 PR 状态前先查 Gitee 或 origin/dev**：Gitee 合并会以新 SHA 进入目标分支。
7. **gitee / 禅道 / 飞书调用绕开本机代理**：unset 代理变量、关 sandbox；token 不回显、不写进文件。
8. **不自己发明界面元素**：按钮、跳转、文案、通知都要有来源（用户原话 / PRD / 原型），没来源的单列「建议（待产品确认）」。
9. **spec 先行**：用户在改 spec 时等 spec 落定再写代码；实现和 spec 有出入先指出。
10. **向后兼容**：现有接口不换不删，只追加可选字段和枚举值，已有状态值保留。
11. **没验证的不说「已修复」**：前端视觉问题改完说「已改，请你验证」；Java 编译通过不代表 SQL 能跑、Spring 容器能起来。

## 四、使用原则

- 一个任务用一个最贴切的技能；相近的技能（如 `vue3-pc-web` 与 `octopus-admin-dev`）优先用项目专属的那个。
- 技能内容和代码或实查结果冲突时，以代码和实查为准，并回来改技能。
