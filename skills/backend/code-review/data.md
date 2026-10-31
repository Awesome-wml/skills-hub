# 数据安全与持久化检查清单

覆盖 SQL 注入防护、数据脱敏、迁移脚本规范、持久化层最佳实践。

---

## 1. SQL 注入防护

### BLOCKER 级

- [ ] **MyBatis XML 中禁止使用 `${}` 拼接用户输入**
  - 参数化查询只使用 `#{}`
  - `${}` 仅允许用于固定的列名/表名（非用户输入）
  - 检查：`src/main/resources/mapper/*.xml` 中的 `${` 使用

- [ ] **禁止手动拼接 SQL 字符串**
  - 使用 MyBatis-Plus `QueryWrapper` / `LambdaQueryWrapper` 构建查询
  - 检查：代码中是否有 `"SELECT ... WHERE " + param` 的拼接

- [ ] **动态排序/分页字段需白名单校验**
  - `ORDER BY` 字段不能直接使用用户输入
  - 检查：排序参数是否经过允许列名的白名单过滤

### WARNING 级

- [ ] **查询写法符合项目规范（约束新增代码）**
  - 单表：MyBatis-Plus 内置方法 + `LambdaQueryWrapper`（含 `selectPage`），不写 `@Select`
  - 多表：必须写 Mapper XML，**禁止 `@Select` 注解版**（含 `<script>`），参数一律 `#{}`
  - 返回值：禁止 `Map<String, Object>` 接 mapper 返回，用具体 PO/VO（可作 mapper 接口的 `public static` 内部类）
  - 检查：新增 Mapper 方法上的 `@Select` / `@Update` 注解、`List<Map<String, Object>>` 返回类型

---

## 2. 数据脱敏

### BLOCKER 级

- [ ] **敏感字段数据库存储加密**
  - 身份证号、银行卡号、手机号等：AES 加密存储
  - 密码：BCrypt 不可逆加密
  - 检查：PO 中敏感字段是否有加解密处理（TypeHandler 或 Service 层）

- [ ] **API 响应中敏感字段脱敏**
  - 手机号：`138****8888`
  - 身份证：`110***********1234`
  - 银行卡：`6222 **** **** 1234`
  - 检查：VO 中敏感字段是否有脱敏序列化处理

- [ ] **日志输出禁止包含完整敏感数据**
  - `@Audited(maskFields)` 已覆盖审计日志
  - 业务日志中的 `log.info/debug` 也不应包含完整敏感信息
  - 检查：日志语句中是否打印了完整的手机号、身份证等

### WARNING 级

- [ ] **数据导出/批量接口应控制数据量和脱敏**
  - 导出接口添加分页限制
  - 导出的敏感字段同样脱敏
  - 检查：导出接口是否有条数限制和脱敏处理

---

## 3. Flyway 迁移脚本规范

### BLOCKER 级

- [ ] **迁移脚本命名遵循规范**
  - 格式：`V{yyyyMMddHHmmss}__{description}.sql`（`date +%Y%m%d%H%M%S` 生成，禁止手编）
  - 示例：`V20260409211335__add_user_phone_column.sql`
  - 检查：新增迁移文件的命名是否规范

- [ ] **迁移脚本必须幂等**
  - DDL 使用 `IF NOT EXISTS` / `IF EXISTS`
  - DML 使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或先查后插
  - 检查：SQL 是否在重复执行时不报错

- [ ] **配置类种子不进 V 脚本**
  - 版本号 ≥ 20260706000000 的 V 脚本出现 `INSERT INTO sys_dict_type|sys_dict|sys_menu|sys_role_menu|casbin_rule` → 打回，改写为 `db/seed/common/R__*.sql`
  - R__ 内容变化即整文件重跑，必须可重复执行、不产生重复行

- [ ] **种子 upsert 按业务键门控赋值**
  - `ON DUPLICATE KEY UPDATE col = IF(<表>.<业务键> = new_row.<业务键>, new_row.col, <表>.col)`；裸 `label = new_row.label` 打回（主键撞到别域行会盖写，曾覆盖规格单位字典，BP-053）
  - 用 `AS new_row` 时现有行列必须带表名前缀，否则 Error 1052、服务起不来

- [ ] **种子主键不撞号**
  - 字典种子 id 用编写时秒级时间戳，同批逐行 +1；不得手挑连续小号
  - 权限 / 菜单类顺序号种子（`R__permission_atom*.sql` 等）：核对新 id 是否大于 origin/dev 和所有活跃 `origin/release/*` 的最大 id（并行 release 各自"接着排"曾撞号覆盖、导致 system-core CrashLoop）
  - R__ 合并冲突须逐行比 id 解决，不能整侧取舍

- [ ] **迁移不含破坏性 DDL（expand-only）**
  - `DROP COLUMN` / `DROP TABLE` / `RENAME` / 无默认值 `NOT NULL` 须拆 expand → backfill → contract，并有 `expand-only-exempt: contract` 豁免与 manifest `rollbackSafe: false`

- [ ] **种子 / 迁移 SQL 已在真 MySQL 上实跑**
  - Java 编译通过 ≠ SQL 能跑；PR 描述应说明验证方式

- [ ] **禁止修改已执行的迁移脚本**
  - Flyway 校验 checksum，修改会导致启动失败
  - 需要修正应新建迁移脚本
  - 检查：是否有修改历史迁移文件

### WARNING 级

- [ ] **大表 DDL 应考虑锁影响**
  - ALTER TABLE 在大表上可能导致长时间锁表
  - 建议使用 `pt-online-schema-change` 或分步迁移
  - 检查：是否对大表执行了 ALTER TABLE

- [ ] **迁移脚本应有对应的回滚方案**
  - 至少在注释中说明回滚步骤
  - 检查：新增迁移脚本是否有回滚说明

---

## 4. 持久化层规范

### BLOCKER 级

- [ ] **PO 类必须配置软删除**
  - MyBatis-Plus 全局配置：`logic-delete-field: deleted`
  - PO 中包含 `deleted` 字段（`@TableLogic`）
  - 检查：新增 PO 是否有 deleted 字段

- [ ] **PO 必须有审计字段**
  - `created_by`、`created_at`、`updated_by`、`updated_at`
  - 通过 MyBatis-Plus MetaObjectHandler 自动填充
  - 检查：新增建表脚本是否包含审计字段

### WARNING 级

- [ ] **ID 策略应一致**
  - 根据模块约定使用 ASSIGN_ID（雪花）或 ASSIGN_UUID
  - 检查：新增表的主键策略是否与模块一致

- [ ] **索引设计应合理**
  - 高频查询条件应有索引
  - 组合索引遵循最左前缀原则
  - 检查：新增表是否缺少必要索引

- [ ] **字段类型应匹配业务语义**
  - 金额：`DECIMAL(12,2)`
  - 状态/类型：`VARCHAR(32)`（枚举字符串）
  - 时间：`DATETIME`
  - 大文本：`TEXT` / `LONGTEXT`
  - 检查：字段类型是否与业务语义匹配
