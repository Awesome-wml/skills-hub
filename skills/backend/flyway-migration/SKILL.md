---
name: flyway-migration
description: |
  创建 Flyway 数据库迁移脚本。自动获取当前时间戳生成规范文件名，支持幂等 DDL/DML。
  适用于用户要求新建迁移脚本、加字段、建表、改表结构、补数据、数据订正 / 回填、写字典 / 菜单 / 权限种子等场景。
  涵盖 db/migration（V__）与 db/seed（R__ 种子）分流规则、种子主键防撞号、upsert 门控写法、
  CI 门禁（seed-separation / expand-only）和"写库 SQL 只交付不执行"红线。
metadata:
  last-updated: '2026-10-31'
---

# Flyway 迁移脚本生成

## ⚠️ 建表前必读（最常见的遗漏项）

**新建表必须包含 `tenant_id` 字段，否则会被 PreToolUse 钩子直接拦截。**

`.claude/hooks/check-tenant-id.py` 会在你 Write/Edit `db/migration/*.sql` 时扫描每个
`CREATE TABLE` 块，缺字段即 `exit 2` 拒绝写入。这是硬性校验，不是提醒。

写 `CREATE TABLE` 时，列定义里必须含下列 7 个 BasePO 字段（缺任何一个都应补上）：

```sql
`id`         BIGINT       NOT NULL                COMMENT '主键',
`tenant_id`  VARCHAR(64)  DEFAULT NULL            COMMENT '租户ID',
`created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP           COMMENT '创建时间',
`created_by` VARCHAR(64)  DEFAULT NULL            COMMENT '创建人',
`updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
`updated_by` VARCHAR(64)  DEFAULT NULL            COMMENT '更新人',
`deleted`    TINYINT      NOT NULL DEFAULT 0      COMMENT '软删除',
```

## ⚠️ 先分流：schema 变更还是 seed 数据？（强制）

设计依据：`docs/superpowers/specs/2026-07-06-flyway-schema-seed-separation-design.md`。
一句话标准：**这条数据是「配置的终态声明」还是「一次性的状态变更」？**

| 走 `db/seed/common/`（R__，见下方 seed 规范） | 走 `db/migration/`（V__，本 skill 原有规范） |
|---|---|
| 字典 sys_dict_type / sys_dict | 所有 DDL |
| 菜单 sys_menu、角色-菜单绑定 sys_role_menu、Casbin 策略 | 一次性 backfill（如 tenant_id 回填） |
| 通知路由等平台级配置行 | 对业务行的一次性数据修复 |

**组合变更（DDL + 数据同时改）：**
- DDL + 一次性业务数据变更 → 同一个 V__ 文件，DDL 在前、DML 在后
- DDL + 配置类种子 → 拆两个文件、同一 PR：DDL 进 V__，种子进 R__（Flyway 保证所有 V 先于 R 执行）
- DDL 动了 seed 表本身结构 → 结构变更+旧数据一次性迁移进 V__；同 PR 把受影响 R__ 更新为新结构下的终态

**红线（PR 直接打回；CI `scripts/check-migration-seed-separation.sh` 硬检查）：**
- `db/migration` 新脚本（版本号 ≥ 20260706000000）出现 `INSERT INTO sys_dict_type|sys_dict|sys_menu|sys_role_menu|casbin_rule` —— 必须写成 `db/seed/common/R__*.sql`
- `db/seed` 下出现 V__ 文件；`db/seed/dev` 下出现非 `R__dev_` 前缀文件

存量旧 V 脚本不迁移；某域配置下次需要改动时，从 dev 库导出该域完整终态迁入对应 R__ 文件，此后以 R__ 为准。

## seed 脚本规范（db/seed，R__ repeatable）

- **目录**：`{module}/src/main/resources/db/seed/common/`（全环境必备）；`db/seed/dev/`（仅 dev，由 octopus-infra 在 dev Deployment 设 `FLYWAY_LOCATIONS` 追加，目录按需创建）
- **命名**：`R__{功能域}.sql`（如 `R__dict_store.sql`、`R__menu_settlement.sql`）；dev 种子 `R__dev_{描述}.sql`。**无版本号无时间戳**，不用 new-migration-version.sh；按功能域拆小文件（R__ 重跑粒度是整个文件，checksum 变化即整文件重跑）
- **期望清单**：一个文件 = 该功能域配置数据的期望清单；新增条目直接加行，checksum 变化后下次启动自动重跑
- **可重复执行**：R__ 内容（checksum）一变就整文件重跑，必须重跑任意次都不报错、不产生重复行；禁止裸 INSERT。
- **upsert 必须按业务键门控赋值**：`ON DUPLICATE KEY UPDATE col = IF(<表>.<业务键> = new_row.<业务键> ..., new_row.col, <表>.col)`。sys_dict 示例：
  ```sql
  INSERT INTO sys_dict (id, dict_key, code, label, sort_order, ...) VALUES (...) AS new_row
  ON DUPLICATE KEY UPDATE
    label = IF(sys_dict.dict_key = new_row.dict_key AND sys_dict.code = new_row.code, new_row.label, sys_dict.label);
  ```
  - 裸 `label = new_row.label` / `VALUES(label)`、以及自更新键列 `dict_key = new_row.dict_key, code = new_row.code` 都**禁用**：主键撞到别域的行时会盖写别人的数据。为什么：2026-07-21 一个新字典手挑的 id 撞上商品规格单位字典，「件/箱/瓶」被覆盖（知识库 BP-053）。存量文件里的裸写法下次改动该文件时顺手改掉。
  - 用了 `AS new_row` 别名后，现有行的列**必须带表名前缀**（`sys_dict.label`、`sys_dict_type.type_code`），否则 Error 1052 列名歧义，Flyway 跑 R__ 崩、服务起不来。
  - insert-only 口径（CONV-007，不覆盖存量非键列）：门控写成恒等 `label = sys_dict.label`；**改存量非键列（label/sort 等）或下线**在文件尾部「变更区」写显式 `UPDATE`/`DELETE ... WHERE <业务键>='xxx'`——仅改 INSERT 的值对存量行无效。
- **固定主键**：seed 行必须写死 ID，禁止运行时生成。取号规则：
  - **sys_dict / sys_dict_type 等字典种子**：用编写时秒级时间戳 `date +%Y%m%d%H%M%S`，同批逐行 +1；不要手挑"看着空"的连续小号，也不要 `MAX(id)+1`（理由同上，BP-053）。
  - **权限 / 菜单类手工顺序号种子**（如 `R__permission_atom*.sql`，按 id upsert）：两条并行 release 分支各自"接着最大号往下排"必撞号，后部署的覆盖先部署的（2026-10-23 撞车覆盖；2026-10-28 dev 的 system-core 因唯一键冲突 CrashLoop）。追加前对 `origin/dev` 和**每个活跃的 `origin/release/*`** 分别取该文件最大 id，取全局最大 +1，或预留明显间隔。
  - 已上线且正确的旧 id 不动；被覆盖的行用一次性 `V__` 显式修复。
  - **解 R__ 种子的合并冲突**：逐行比对 id，不能简单"取我方 / 取对方"——两侧新增行可能都要保留，也可能正好撞号需要改号。
- **文件间不建依赖**：有先后关系（dict_type → dict）放同一文件；不得依赖字母序编排
- **必须能在最新 schema 上跑通**：落后环境先补齐全部 V 再跑 R，只需兼容最新结构

## 何时启用

- 用户提到：加字段、建表、改表、迁移脚本、migration、DDL、DML、补数据
- 代码审查发现数据库表缺少字段需要补全时
- 新功能需要新建数据表时

## 文件命名规范（强制）

格式：`V{yyyyMMddHHmmss}__{description}.sql`

1. **必须通过 `date '+%Y%m%d%H%M%S'` 获取当前精确时间戳**，禁止手动编造或使用序号
2. 双下划线 `__` 分隔版本号和描述
3. 描述使用小写英文 + 下划线，简明表达变更内容
4. 示例：`V20260409211335__add_basePO_audit_columns_to_resource_grant.sql`

## 文件存放路径

```
system-core/src/main/resources/db/migration/
```

## 脚本编写规范（强制）

### 幂等性

所有 DDL/DML 必须可重复执行，不报错：

**加字段**（推荐模式）：
```sql
SET @table_name = '表名';

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = '列名') = 0,
  CONCAT('ALTER TABLE ', @table_name, ' ADD COLUMN 列名 类型 DEFAULT NULL COMMENT ''注释'' AFTER 前一列'),
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

**建表**：
```sql
CREATE TABLE IF NOT EXISTS 表名 (...) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
```

**插入业务数据**（配置表不在此列，见上方分流红线）：
```sql
INSERT INTO 表名 (...) VALUES (...) ON DUPLICATE KEY UPDATE updated_at = NOW();
```

### expand-only（CI `scripts/check-migration-expand-only.sh`）

新增 V__ 里禁止破坏性 DDL（`DROP COLUMN` / `DROP TABLE` / `RENAME` / 加无默认值的 `NOT NULL` 等）。为什么：生产回滚只能回滚应用镜像、回滚不了库，删了旧结构旧版本就起不来。按 expand → backfill → contract 分三次发布；确需 contract 时在脚本里写豁免注释 `expand-only-exempt: contract`，并在 release manifest 标 `rollbackSafe: false`。

### 数据订正 / 回填脚本：只交付，不执行

- 数据回填、订正、迁移的 `INSERT/UPDATE/DELETE/DDL` **一律不自己执行**（包括"在事务里跑一下再 ROLLBACK"），只把 SQL 交给用户；环境库可以只读排查，写操作只走 Flyway 或由用户执行。
- 只读的 `SELECT` / dry-run 可以跑，用来确认影响范围和行数，并把预期行数写进交付说明。
- SQL 要 robust：避开临时表（跨环境 / 连接池下脆弱）；`UPDATE/DELETE` 子查询引用自身表会触发 MySQL 1093，改用派生表包一层或 JOIN；`WHERE` 条件带足业务键，避免误伤。

### BasePO 标准字段

继承 `BasePO` 的表必须包含以下列（对照 `BasePO.java`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `BIGINT NOT NULL` | 主键（ASSIGN_ID 雪花算法） |
| `tenant_id` | `VARCHAR(64) DEFAULT NULL` | 租户ID（MetaObjectHandler 自动填充） |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `created_by` | `VARCHAR(64) DEFAULT NULL` | 创建人（MetaObjectHandler 自动填充） |
| `updated_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |
| `updated_by` | `VARCHAR(64) DEFAULT NULL` | 更新人（MetaObjectHandler 自动填充） |
| `deleted` | `TINYINT NOT NULL DEFAULT 0` | 软删除 |

新建表时不要遗漏。对存量表补字段时参照 `V8__align_basePO_columns.sql` 的模式。

### 常用字段类型约定

| 业务含义 | 类型 |
|---------|------|
| 金额 | `DECIMAL(12,2)` |
| 状态/类型枚举 | `VARCHAR(32)` |
| 编码/编号 | `VARCHAR(64)` |
| 名称 | `VARCHAR(128)` |
| 时间 | `DATETIME` |
| 大文本/JSON | `TEXT` / `LONGTEXT` |
| 乐观锁 | `INT NOT NULL DEFAULT 0` |

## 标准流程

```bash
# 1. 获取当前时间戳
date '+%Y%m%d%H%M%S'

# 2. 创建迁移文件
# V{时间戳}__{描述}.sql

# 3. 编写幂等 SQL

# 4. 在真 MySQL 上实跑（本地 / 一次性库，FLYWAY_ENABLED=true 起一次服务）
#    Java 编译通过 ≠ SQL 能跑；R__ 再重跑一次确认无重复、无报错

# 5. 验证
# 检查 flyway_schema_history 表确认执行成功

# 6. 提 PR 前跑 octopus-cloud 的门禁脚本（与 .drone.yml 一致；不要接 | tail，会吞掉退出码）
sh scripts/check-migration-seed-separation.sh
sh scripts/check-migration-expand-only.sh
```

## 注意事项

- **禁止修改已执行的迁移脚本**（Flyway 校验 checksum，修改会导致启动失败）
- 大表 ALTER 考虑锁影响，必要时用 `pt-online-schema-change`
- 脚本头部用注释说明变更原因和回滚方案
- NOT NULL 字段必须提供 DEFAULT 值，否则业务代码未赋值时 insert 会失败