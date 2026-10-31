---
name: code-review
description: |
  代码审查 Skill：基于等保 2.0 安全合规要求和本平台架构设计理念，对变更代码进行系统化审查。
  适用于用户要求审查代码、Review PR/MR、检查变更是否符合规范，或 Agent 代为执行代码质量检查时。
  覆盖接口鉴权（@RequiresCapability / @ConsumerApi）、接口向后兼容、调用端标注、MyBatis 查询写法、
  R__ 种子主键撞号与 upsert 写法、BizException 提示文案、提 PR 前 CI 门禁等项目红线。
metadata:
  last-updated: '2026-10-31'
---

# 代码审查 Skill

本 Skill 对变更代码执行系统化审查，覆盖 **等保 2.0 安全合规** + **平台架构规范** 两大维度。
按下方大纲定位到具体审查维度，使用 `Read ${CLAUDE_SKILL_DIR}/<module>.md` 获取完整检查清单。

> **使用方式**：`/code-review` 或在对话中要求"审查代码"、"Review 这些变更"。

---

## 审查流程

### 第 1 步：确定审查范围

1. 若用户指定了文件/PR/分支，直接使用
2. 若未指定，通过 `git diff` 或 `git diff HEAD~1` 获取最近变更
3. 用 `git log --oneline -5` 了解变更上下文
4. **基线必须是 origin/dev**：工作区常签出在落后 dev 上百提交的功能分支。判断"现状是否已有 / 是否已修"前，用 `git show origin/dev:<path>` 或 `git diff HEAD origin/dev -- <file>` 核实，报告里注明基线 commit；不要拿落后的工作区下结论

### 第 2 步：分类变更文件

将变更文件按层分类：
- **API 层**：controller、DTO、请求/响应对象
- **应用层**：AppService、Command、Assembler、Action
- **领域层**：Domain Model、Repository 接口、枚举
- **基础设施层**：Mapper、PO、Repository 实现、配置
- **数据库**：Flyway 迁移脚本
- **配置**：application.yml、.env、pom.xml

### 第 3 步：逐维度审查

按以下维度依次检查（每个维度的详细检查项见对应的 reference 文件）：

| 维度 | Reference 文件 | 关注点 |
|------|---------------|--------|
| 等保 2.0 安全合规 | [security.md](security.md) | 身份鉴别、访问控制、安全审计、数据保密性、数据完整性、入侵防范 |
| 分层架构规范 | [architecture.md](architecture.md) | DDD 分层、依赖方向、职责边界、命名规范 |
| 平台 Kernel 使用 | [kernel-usage.md](kernel-usage.md) | 正确使用 platform-kernel 组件，而非自行实现 |
| 数据安全与持久化 | [data.md](data.md) | SQL 注入防护、数据脱敏、迁移脚本规范、软删除 |
| 可靠性与幂等 | [reliability.md](reliability.md) | 幂等设计、Outbox 事件、异常处理、事务边界 |

**octopus-cloud 变更额外核对 CI 门禁**（与 `.drone.yml` 一致，逐个跑看退出码，不要接 `| tail` 吞退出码）：`scripts/check-migration-seed-separation.sh`、`scripts/ci/check-fast-test-excludes.sh`、`scripts/check-migration-expand-only.sh`、`scripts/check-no-test-skip.sh`、`scripts/check-knowledge-index.sh`。新增 `import org.testcontainers` 的 `*Test` 未按字母序登记 `scripts/ci/surefire-fast-excludes.txt` → BLOCKER。

### 第 4 步：输出审查报告

使用以下格式输出审查结果：

```markdown
## 代码审查报告

### 概要
- 审查范围：<文件列表或 PR 链接>
- 审查维度：安全合规 / 架构规范 / Kernel 使用 / 数据安全 / 可靠性

### 问题清单

#### BLOCKER（必须修复）
- [ ] **[安全]** 文件:行号 — 问题描述 → 修复建议

#### WARNING（建议修复）
- [ ] **[架构]** 文件:行号 — 问题描述 → 修复建议

#### INFO（改进建议）
- [ ] **[规范]** 文件:行号 — 问题描述 → 改进方向

### 通过项
- [x] 权限校验已正确配置
- [x] 审计注解已添加
- ...
```

**严重级别定义**：
- **BLOCKER**：安全漏洞、数据泄露风险、等保 2.0 不合规项 → 必须在合并前修复
- **WARNING**：架构违规、缺失最佳实践、潜在可靠性问题 → 强烈建议修复
- **INFO**：代码风格、命名优化、可选改进 → 酌情处理

---

## 审查维度速查

### 1. [security.md](security.md) — 等保 2.0 安全合规

| 关键词 | 检查点 |
|--------|--------|
| 身份鉴别 | Sa-Token 登录拦截、Token 配置、密码策略 |
| 访问控制 | @RequiresCapability（C 端 @ConsumerApi）、@DataScope、最小权限 |
| 安全审计 | @Audited、审计日志完整性、脱敏 |
| 数据保密 | 传输加密、存储加密、敏感字段脱敏 |
| 入侵防范 | 输入校验、注入防护、文件上传限制 |
| 安全通信 | HTTPS、gRPC TLS、跨域配置 |

**何时重点查阅**：任何涉及认证、授权、用户数据、对外接口的变更。

---

### 2. [architecture.md](architecture.md) — 分层架构规范

| 关键词 | 检查点 |
|--------|--------|
| DDD 分层 | api/application/domain/infrastructure 依赖方向 |
| 跨域通信 | 禁止跨库 JOIN、使用 Outbox/Feign/gRPC |
| 职责边界 | Controller 只做参数校验与转发、Service 编排业务 |
| 接口契约 | 存量接口向后兼容、调用端（PC/APP/H5）标注 |
| 命名规范 | PO/DTO/VO/Command 后缀、包结构 |

**何时重点查阅**：新增模块、新增接口、重构代码结构。

---

### 3. [kernel-usage.md](kernel-usage.md) — 平台 Kernel 使用

| 关键词 | 检查点 |
|--------|--------|
| 统一响应 | 使用 R<T> 而非自定义响应体 |
| 异常处理 | 使用 BizException 而非自定义异常类 |
| 金额计算 | 使用 Money 而非裸 BigDecimal |
| 字典翻译 | 使用 @DictLabel 而非 hardcode |
| 审计日志 | 使用 @Audited 而非手写日志 |
| 权限控制 | 使用 @RequiresCapability 而非手写拦截器；@RequiresPermission 已废弃 |

**何时重点查阅**：新增接口、新增业务逻辑、涉及金额/权限/审计。

---

### 4. [data.md](data.md) — 数据安全与持久化

| 关键词 | 检查点 |
|--------|--------|
| SQL 注入 | MyBatis-Plus BaseMapper、禁止拼接 SQL |
| 查询写法 | 单表 MP + LambdaQueryWrapper、多表 XML、禁 @Select / Map 返回 |
| 种子数据 | R__ 可重复执行、主键防撞号、upsert 业务键门控 |
| 数据脱敏 | 敏感字段加密存储、日志脱敏 |
| 迁移脚本 | Flyway 命名规范、幂等性、回滚方案 |
| 软删除 | logic-delete-field 配置一致性 |

**何时重点查阅**：新增/修改数据表、新增 Mapper、处理敏感数据。

---

### 5. [reliability.md](reliability.md) — 可靠性与幂等

| 关键词 | 检查点 |
|--------|--------|
| 幂等设计 | ActionExecutor + IdempotencyGuard |
| Outbox 事件 | 事件与业务数据同事务写入 |
| 事务边界 | @Transactional 范围最小化 |
| 异常处理 | BizException vs 系统异常区分 |

**何时重点查阅**：写操作接口、事件发布、跨服务调用。
