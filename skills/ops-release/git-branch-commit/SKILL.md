---
name: git-branch-commit
description: |
  指导在本仓库中按功能分支开发、用 rebase 对齐 dev、通过 PR 合并、使用中文编写 commit message，并在成功提交后立即推送当前分支到远端。
  适用于用户要求开分支、同步主线、提交代码、整理 Git 工作流，或 Agent 代为执行 git checkout / commit / push 时。
metadata:
  last-updated: '2026-10-31'
---

# 分支与 Commit 工作流

## 何时启用

- 用户提到：开分支、切分支、同步 dev、提交、commit、推 PR/MR、rebase 等
- 需要在**非主线**上完成开发并走评审合并时

## 分支规则（强制）

1. **命名**：按功能或任务命名，**禁止用人名**。推荐前缀：`feature/`、`fix/`、`chore/` 等。  
   示例：`feature/product-crud-pages`、`fix/login-token-expiry`
2. **生命周期**：分支尽量短；功能合并进目标分支（通常为 `dev`）后**删除远端与本地分支**。
3. **对齐主线**：用 **`git rebase`** 把 `dev` 的更新接到当前分支上，**不要用 `git merge dev`** 同步主线。
4. **合入方式**：通过 **PR/MR** 合并，**做 code review**；不向受保护主线直接 push 代替评审（除非仓库明确允许）。

## 标准流程（从 dev 开功能分支）

```bash
git fetch origin
git checkout dev
git pull --ff-only origin dev   # 或：先确保本地 dev 与 origin/dev 一致
git checkout -b feature/your-task-name
```

开发过程中与 `dev` 保持同步：

```bash
git fetch origin
git rebase origin/dev
# 若有冲突：解决后 git add …，再 git rebase --continue
```

推送到远端并开 PR（目标分支一般为 `dev`）：

```bash
git push -u origin feature/your-task-name
# 在 Gitee/GitLab 等平台创建 PR/MR，评审通过后合并
```

需要由 Agent 创建 Gitee PR 时，继续使用 `git-pr-dev-test` skill；PR 标题统一为 `【禅道版本号】禅道标题`（版本号取自禅道发布任务，不确定就查，不要臆造）。**普通业务改动一律只合并到 `dev`**；UAT 修复走 `release/vX.Y.Z` 并单向 merge 回 `dev`；生产补丁从 master 切 `release/<补丁版本>`，`fix/*` 进该 release（2026-08-31 起**废除 `hotfix/*` 分支类型**）。**一个改动只落一条分支，不再「分别从 test 和 dev 拉两份分支」**（双 SHA 必冲突，理由见 `git-pr-dev-test`）。

合并并清理分支（在平台合并 PR 后，本地执行）：

```bash
git checkout dev
git pull origin dev
git branch -d feature/your-task-name
git push origin --delete feature/your-task-name   # 若远端分支仍存在
```

## Commit 规则（与本仓库一致）

- **commit message 必须使用中文**（见仓库 `.cursor/rules/git-commit-chinese.mdc`）。
- **只要成功执行 commit，默认就要继续 push 当前分支到远端**（见仓库 `.cursor/rules/git-commit-autopush.mdc`），除非用户明确要求只做本地提交或暂不推送。
- 先 **`git status` / `git diff`** 确认变更范围；避免把仅本机环境文件（如含个人路径、密钥的 `.env`）误提交，除非团队约定可提交且已脱敏。
- 信息应说明「做了什么、为何相关」，避免无意义文案（如「修改」「更新」单独一行）。

**多行提交示例**（heredoc，避免 shell 转义问题）：

```bash
git add <本次相关文件>        # 主工作目录常有用户在途改动，禁止 git add -A
git commit -F - <<'EOF'
对齐商品列表接口路径以匹配后端路由
调整详情查询为 query 传参
EOF
```

## Agent 执行时注意

- 用户只说「commit」时：先检查是否有未暂存/未提交改动，再暂存、用中文撰写 message 并提交；**提交成功后立即 push 当前分支**。
- 用户已在主线（如 `dev`）上改代码时：优先 **`git checkout -b feature/…`** 把改动带到功能分支再提交（避免长期在主线堆 commit）。
- **不要**用 `git merge dev` 作为「我每天同步一次主线」的默认方式；应用 **`git rebase origin/dev`**（在已推送分支上 rebase 后可能需要 `git push --force-with-lease`，需与用户或团队规范一致时再执行）。
- 若当前分支尚未设置 upstream：优先使用 **`git push -u origin <current-branch>`** 建立跟踪关系。
- 若 push 失败：明确说明失败原因和下一步需要处理的动作，不要把任务误报为已完成。
- 推 gitee 卡住或报 `SSL_ERROR_SYSCALL`：是本机代理导致，unset 代理变量、加 `git -c http.proxy= -c https.proxy=`、关 sandbox 后重试。
- **开分支前先确认基线**：本地工作区常年签出在落后 dev 上百提交的功能分支上。从 `origin/dev`（或对应 `origin/release/*`）新开分支，不要沿用工作区当前分支；
  当前签出分支和任务无关时，改动不要落在它上面（2026-08 曾把 CI 修复改在了不相关的分支上，只能再搬一次）。
- 排查生产告警/故障时，用户说「继续」不等于授权改代码——继续分析；用户明确说「改吧 / 修一下 / 提 PR」才开分支动手。
