---
name: dict-creator
description: |
  查询数据库字典是否存在，存在则返回 key，不存在则生成幂等的 R__ 种子 SQL（含 sys_dict_type + sys_dict 两张表）。
  适用于用户要求新建字典、添加枚举字典、生成字典 SQL、给状态字段加中文文案 / @DictLabel、写 R__dict_*.sql 种子、
  字典 label 被覆盖 / 字典 id 撞车排查等场景。
metadata:
  last-updated: '2026-10-31'
---

# 字典创建 SQL 生成

## 数据库连接参数

从项目 `.env` 读取（DB_HOST / DB_USER / DB_PASSWORD），不要把真实值写进本文件：

| 参数       | 值                                              |
|----------|-------------------------------------------------|
| host     | `${DB_HOST}` |
| port     | `3306`                                          |
| user     | `${DB_USER}`                                        |
| password | `${DB_PASSWORD}`                                    |
| database | `octopus_sys`                                    |

## 表结构速查

### sys_dict_type（字典类型）

| 字段        | 类型         | 说明                                |
|-----------|------------|-------------------------------------|
| id        | BIGINT     | 主键（手动赋值：编写时秒级时间戳，见 Step 3） |
| type_code | VARCHAR(64)| 全局唯一编码，与 sys_dict.dict_key 对应 |
| type_name | VARCHAR(128)| 类型名称                            |
| is_system | TINYINT    | 1=内置不可删，0=自定义               |
| sort      | INT        | 排序（升序）                         |
| remark    | VARCHAR(256)| 备注                               |

### sys_dict（字典条目）

| 字段       | 类型        | 说明                          |
|----------|-----------|-------------------------------|
| id       | BIGINT    | 主键（手动赋值：编写时秒级时间戳，同批逐行 +1） |
| dict_key | VARCHAR(64)| 字典类型编码（=type_code）      |
| code     | VARCHAR(64)| 条目编码（同一 dict_key 下唯一）|
| label    | VARCHAR(128)| 显示文案                      |
| sort_order| INT      | 排序（升序）                   |
| is_system| TINYINT   | 1=内置不可删                   |

## 执行流程

### Step 1：接收用户输入

用户需要提供（可以是文字描述，从中提取）：

- `type_code`：字典类型编码（英文下划线，如 `store_status`）
- `type_name`：字典类型名称（中文，如 `门店状态`）
- `items`：字典条目列表，每条包含 `code`（英文大写）和 `label`（中文）

### Step 2：查询是否已存在

只读查询（SELECT 可以自己跑；任何写库语句都不要自己执行，只交付 SQL）。使用 `mcp__mysql-mode-mcp-server__mysql_query` 执行：

```sql
SELECT type_code, type_name
FROM sys_dict_type
WHERE type_code = '{type_code}'
  AND deleted = 0
LIMIT 1;
```

同时在代码里查种子（库可能落后于代码，以 origin/dev 为准，不看落后的工作区）：

```bash
git -C $OCTOPUS_ROOT/octopus-cloud grep -n "'{type_code}'" origin/dev -- '*/db/seed/*'
```

**任一处已存在**：直接告知用户"字典类型已存在"，并输出：
```
dict_key = {type_code}
```
**流程结束，不生成 SQL。**

### Step 3：生成主键 id（秒级时间戳，禁止 MAX(id)+1 / 手挑小号）

```bash
date +%Y%m%d%H%M%S      # 例：20261031143005
```

- `sys_dict_type` 一行用这个值；`sys_dict` 同批条目从这个值起**逐行 +1**。
- 不要查 `MAX(id)+1`，也不要手工挑一段"看起来空着"的连续小号。为什么：2026-07-21 app 版本策略字典手挑 id 2110~2112，撞上商品规格单位字典的同号行，upsert 把「件/箱/瓶」整行盖掉（知识库 BP-053）。`MAX(id)+1` 在多分支并行时同样会撞。
- 生成后 grep 确认不撞号：`git grep -n "<id>" origin/dev -- '*/db/seed/*' '*/db/migration/*'`，并对活跃的 `origin/release/*` 各查一遍。
- 已上线且正确的旧 id 不动；历史上被覆盖的行用一次性 `V__` 脚本显式修复，不要靠改 R__ 碰运气。

### Step 4：生成幂等 INSERT SQL

放入 `db/seed/common/R__{功能域}.sql`，**不是** Flyway `V__` 迁移（CONV-007；CI `check-migration-seed-separation.sh` 会拦）。R__ 内容一变就会整文件重跑，必须可重复执行、不产生重复行。

```sql
-- 字典类型：ON DUPLICATE KEY UPDATE 一律按业务键门控赋值
INSERT INTO sys_dict_type (id, type_code, type_name, is_system, sort, remark)
VALUES ({type_id}, '{type_code}', '{type_name}', 1, {sort}, '{remark}') AS new_row
ON DUPLICATE KEY UPDATE
  type_name = IF(sys_dict_type.type_code = new_row.type_code, new_row.type_name, sys_dict_type.type_name);

-- 字典条目：主键若撞到别的字典的行，IF 条件不成立 → 原值保留，不会被盖写
INSERT INTO sys_dict (id, dict_key, code, label, sort_order, is_system)
VALUES
  ({item_id},     '{type_code}', '{code1}', '{label1}', 1, 1),
  ({item_id + 1}, '{type_code}', '{code2}', '{label2}', 2, 1),
  ... AS new_row
ON DUPLICATE KEY UPDATE
  label      = IF(sys_dict.dict_key = new_row.dict_key AND sys_dict.code = new_row.code, new_row.label,      sys_dict.label),
  sort_order = IF(sys_dict.dict_key = new_row.dict_key AND sys_dict.code = new_row.code, new_row.sort_order, sys_dict.sort_order);
```

写法红线：

- **禁止裸赋值** `label = new_row.label` / `label = VALUES(label)`：主键撞到别域的行时会直接盖写别人的数据。也不要自更新键列（`dict_key = new_row.dict_key, code = new_row.code`），撞号时同样会把别人的行改成你的键。
- 用了 `AS new_row` 别名后，**现有行的列必须带表名前缀**（`sys_dict.label`、`sys_dict_type.type_code`），否则 MySQL 报 Error 1052（列名歧义），Flyway 跑 R__ 失败、服务起不来。
- 只想"插入一次、不覆盖存量 label"（CONV-007 的 insert-only 口径）时，把门控赋值写成恒等：`label = sys_dict.label`；改存量 label/sort 走「变更区」显式 `UPDATE ... WHERE dict_key=... AND code=...`。
- `code` = 后端枚举名（英文大写），`label` = 中文。
- `sort` 默认值：按同类字典拉开间距（如 10 的倍数）；`remark` 未提供置空串 `''`；`is_system` 默认 `1`。

**必须实跑验证**：Java 编译通过 ≠ SQL 能跑。在本地 / 一次性 MySQL（`FLYWAY_ENABLED=true` 起一次 system-core，或直接在本地容器执行）跑通，并确认重跑第二次无重复行、无报错；不要直接对共享环境库执行写语句。

### Step 5：输出结果

输出格式：

```
✅ 字典类型不存在，已生成 INSERT SQL：

dict_key = {type_code}

--- SQL ---
{生成的 SQL}
-----------

请将上述 SQL 合入 {module}/src/main/resources/db/seed/common/R__dict_{功能域}.sql
（已有该域文件则更新对应行，无则新建；禁止放入 db/migration 的 V 脚本——schema/seed 分离红线，见 /flyway-migration skill）。
```

接下来（状态类字典）：后端 DTO 状态字段加 `@DictLabel("{type_code}")`、`@Schema(description)` 写「…；字典 {type_code}」，commerce 域把 dict_key 登记到 `CommerceDictKeys.java`；前端读 `row.xxxLabel`，不要在前端硬编码状态 → 中文 map（详见 platform-kernel `dict.md`）。

## 注意事项

- 查询时过滤 `deleted = 0`，已软删除的不算存在（需重新插入）
- seed 行 ID 一经写入即固定、多环境一致；写入前按 Step 3 对 origin/dev 和活跃 release 分支 grep 确认无冲突
- 解 R__ 种子文件的合并冲突时逐行比对 id，不能简单取某一侧（两侧各自新增的行可能都要保留，也可能撞号）
- 如果用户只想查询是否存在而不生成 SQL，执行 Step 1-2 后直接返回结果即可
