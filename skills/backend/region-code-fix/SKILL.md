---
name: region-code-fix
description: 修复门店/主体的行政区划码错误（尤其「市辖区」这类国标占位码导致汇付进件报「地区编码有误」）。触发词：「地区编码有误」「进件报区划错误」「市辖区」「区划码不对」「371301」「进件提示地区编码」「区县选错了」。产出可直接执行的救火 UPDATE SQL（含 SELECT 核对 + 回滚），不改代码不发版。
version: 0.1.0
---

# 行政区划码救火修复

## 适用场景

汇付进件返回「地区编码有误 XXXXXX」，或前端级联把地址匹配成了「市辖区」。

**根因（已在生产实测确认）**：`sys_region` 的国标区划表里每个地级市都带一条 `xx01 市辖区` / `xx21 县` 的**虚拟占位码**，它不是真实行政区，汇付/银行的地区码表里没有这条 → 进件必挂。`StoreCreateAction.validateRegionCodes()`（`system-core/.../application/action/StoreCreateAction.java`）只校验"码在 sys_region 里存不存在"，占位码是**存在**的，所以放行了。

生产 `sys_region` 共 **287 条**占位行（`region_name in ('市辖区','县')`），这是复发型问题，不是孤例。

## 环境

生产库用**只读账号**（账号名向用户索取），实例与口令向用户索取或从既有运维记录取，**不写进本文件**。库名 `octopus_sys`（区划与主数据都在这里）。

本机无 mysql CLI，用 pymysql（`python3 -c "import pymysql; ..."`）。连接参数从环境变量读，不要硬编码：

```bash
export PROD_DB_HOST=... PROD_DB_USER=... PROD_DB_PASS=...
cd /tmp && python3 -c "
import os,pymysql
c=pymysql.connect(host=os.environ['PROD_DB_HOST'],user=os.environ['PROD_DB_USER'],
  password=os.environ['PROD_DB_PASS'],database='octopus_sys',charset='utf8mb4')
cur=c.cursor(pymysql.cursors.DictCursor)
cur.execute('<SQL>')
for r in cur.fetchall(): print(r)
c.close()"
```

**这个账号只用来查。任何 UPDATE 都不在这里跑。**

## 涉及的 4 张表（一处都不能漏）

区划码在这 4 张表各存了一份快照，只改一张，重提进件还是老值：

| 表 | 关键列 | 说明 |
|---|---|---|
| `mdm_org_profile` | `district`/`district_code`/`address`/`business_address` | **企业主体，汇付进件取数主表** |
| `mdm_org_store` | `district`/`district_code`/`address` | 门店 |
| `mdm_org_address` | `district`/`district_code`/`detail_address` | 组织地址 |
| `mdm_org_warehouse` | `district_name`/`district_code`/`address` | 仓库 |

注意列名不统一：warehouse 用 `district_name`，address 用 `detail_address`，profile/store 用 `district` + `address`。

## 执行步骤

### 1. 全量盘点占位码引用

```sql
SELECT 'profile' t, p.id, p.org_id, p.license_name nm, p.province_code, p.city_code, p.district_code, r.region_name, p.address
FROM mdm_org_profile p JOIN sys_region r ON r.region_id=p.district_code
WHERE r.region_name IN ('市辖区','县')
UNION ALL
SELECT 'store', s.id, s.org_id, s.name, s.province_code, s.city_code, s.district_code, r.region_name, s.address
FROM mdm_org_store s JOIN sys_region r ON r.region_id=s.district_code
WHERE r.region_name IN ('市辖区','县')
UNION ALL
SELECT 'address', a.id, a.org_id, '', a.province_code, a.city_code, a.district_code, r.region_name, a.detail_address
FROM mdm_org_address a JOIN sys_region r ON r.region_id=a.district_code
WHERE r.region_name IN ('市辖区','县')
UNION ALL
SELECT 'warehouse', w.id, w.org_id, w.warehouse_name, w.province_code, w.city_code, w.district_code, r.region_name, w.address
FROM mdm_org_warehouse w JOIN sys_region r ON r.region_id=w.district_code
WHERE r.region_name IN ('市辖区','县');
```

如果用户只给了一个地址/公司名，用 `address LIKE '%关键词%'` 或 `license_name LIKE` 先定位，再顺着 `org_id` 把 4 张表全捞一遍——**同一 org_id 的多张表往往一起错**。

### 1.5 用进件流水表定位「已经炸了几次、炸在谁身上」

`sys_payment_onboarding_attempt`（`octopus_sys`）存了每次推汇付的完整报文和回执，比查 profile 更能直接给出爆炸半径：

```sql
-- 被汇付以「地区编码有误」打回的次数，按码汇总
SELECT SUBSTRING_INDEX(reject_reason, ':', -1) code, COUNT(*) c, COUNT(DISTINCT org_id) orgs
FROM sys_payment_onboarding_attempt
WHERE reject_reason LIKE '地区编码有误%'
GROUP BY code ORDER BY c DESC;

-- 报文里带占位码的每一次尝试（含主体名与提交地址）
SELECT a.id, a.org_id, a.attempt_status,
       JSON_UNQUOTE(JSON_EXTRACT(a.submitted_payload_json, '$.reg_name'))    reg_name,
       JSON_UNQUOTE(JSON_EXTRACT(a.submitted_payload_json, '$.district_id')) district_id,
       JSON_UNQUOTE(JSON_EXTRACT(a.submitted_payload_json, '$.reg_district_id')) reg_district_id,
       JSON_UNQUOTE(JSON_EXTRACT(a.submitted_payload_json, '$.reg_detail'))  reg_detail
FROM sys_payment_onboarding_attempt a
WHERE JSON_UNQUOTE(JSON_EXTRACT(a.submitted_payload_json, '$.district_id')) IN
        (SELECT region_id FROM sys_region WHERE region_name IN ('市辖区','县'))
   OR JSON_UNQUOTE(JSON_EXTRACT(a.submitted_payload_json, '$.reg_district_id')) IN
        (SELECT region_id FROM sys_region WHERE region_name IN ('市辖区','县'))
ORDER BY a.org_id, a.id;
```

汇付报文里的区划字段是 `prov_id` / `area_id` / `district_id` 和一组 `reg_*` 镜像（`reg_prov_id` / `reg_area_id` / `reg_district_id`），**两组都得对**。`reg_detail` 是拼好的完整地址文本。

口径提醒：`profile` 里带占位码的主体数 ≥ `attempt` 里失败的主体数——**没提过进件的那几家是"待炸"，一提就挂**，一并修掉。

### 2. 为每条错误行判定真实区县

**先看营业执照统一社会信用代码的第 3–8 位**（`business_license_no`），那是登记机关的行政区划码，比地址文本硬：

- 落在 `sys_region` 里的真实区县 → 直接采用（例：南陵县鲜邻 `92`**`340223`**`MAKB…` → `340223 南陵县`，地址也写南陵县籍山镇，铁证）。
- **查不到的码 = 开发区/新区托管码**（例：`441208` 肇庆高新区、`610132` 西安经开区，`sys_region` 里都没有），说明这家就注册在功能区，必须按下面的规则回落母区县。
- 省级/市级登记码（`360000`、`371500`、`130101`）不含区县信息，只能靠地址判。

然后列出该市下的全部真实区县作为候选：

```sql
SELECT region_id, region_name FROM sys_region
WHERE parent_id = <city_code> AND region_name NOT IN ('市辖区','县')
ORDER BY region_id;
```

判定规则：

- 按 `address` / `detail_address` 里的**街道、乡镇、村**归属，落到国标口径的区县。
- **功能区/新区没有独立 adcode**（沂河新区、经开区、高新区等），一律回落到其国标母区县。例：山东临沂沂河新区梅埠街道 → `371312 河东区`（梅埠街道原属河东区）。
- 拿不准就查该街道的国标归属，**不要猜**，也不要随手选该市第一个区。
- 选定的 code 必须能在上面的候选清单里查到，否则等于换了一个汇付同样不认的码。
- 每条给出**置信度**：执照码直接命中真实区县 = 铁证；开发区托管地址回落母区县 = 高；只有"高新区/经开区"字样、母区县有争议 = 中，中等的必须提示用户对着执照登记住所复核后再执行。

### 3. 生成救火 SQL

对每条行输出这一组（**按 id 精确定位，禁止 `WHERE district_code='xxx'` 裸更新**）：

```sql
-- ===== <主体名> / <表> id=<id> =====
-- 改前留档（执行前先跑，把结果贴到工单里）
SELECT id, district, district_code, address FROM mdm_org_profile WHERE id = <id>;

-- 修正
UPDATE mdm_org_profile
SET district      = '<真实区县名>',
    district_code = '<真实区县码>',
    address       = '<修正后的完整地址>',
    business_address = '<修正后的完整地址>'
WHERE id = <id> AND district_code = '<旧占位码>';

-- 回滚
-- UPDATE mdm_org_profile SET district='市辖区', district_code='<旧占位码>',
--   address='<原地址>', business_address='<原地址>' WHERE id = <id>;
```

**address 文本也要一起修**：前端是把区县名拼进地址的，占位码会拼出「山东省临沂市**市辖**河东区沂河新区…」「安徽省芜湖市**市辖区**安徽省-芜湖市-…」这种脏串。改码不改文本，汇付那边地址和区划对不上仍可能被打回。

每组 SQL 后面附一句：**执行完需在后台重新提交进件**，改库不会自动重推汇付。

### 4. 止血（可选，用户确认后再给）

禁用全部占位行，让前端级联选不到、`validateRegionCodes` 开始拦：

```sql
-- 先确认影响面（正常应只剩已修复的历史行）
SELECT COUNT(*) FROM mdm_org_store s JOIN sys_region r ON r.region_id=s.district_code
WHERE r.region_name IN ('市辖区','县');

UPDATE sys_region SET status = 0 WHERE region_name IN ('市辖区','县') AND status = 1;
```

**置 0 不要 DELETE**——历史门店还引用着这些行，删了级联查询会恒空。

## 红线

- 只读账号只用来查。所有 UPDATE 交给用户在生产执行，**不代跑**。
- 凭据不落盘、不写进 SQL 文件或 skill 文档，走环境变量。
- 每条 UPDATE 必须 `WHERE id = <id> AND district_code = '<旧值>'` 双条件，跑批式裸更新一律不给。
- 每条 UPDATE 必须配一条注释掉的回滚语句和一条改前 SELECT。
- 真实区县码必须来自 `sys_region` 实查，不得凭记忆写。
- 治本（给 `validateRegionCodes` 补「不得为占位区划」校验、错误文案改成"请选择具体区县"）属于发版范畴，单独提 PR，不混进救火 SQL。

## 已知事实（生产实测 2026-09-02 / 09-03）

- 临沂：`371301 市辖区`（占位）、`371302 兰山区`、`371311 罗庄区`、`371312 河东区`；生产库**没有** `371371 临沂高新区`（dev 有），别往那儿映射。
- 09-02 生产共 15 条占位码引用：profile 7 条、address 6 条（全是同一个云仓地址 `420901`）、store 1 条、warehouse 1 条（`340201`）。
- `sys_payment_onboarding_attempt` 99 行里，14 次 FAILED 全因占位码，集中在 3 家主体（`371301` 试了 7 次、`441201` 5 次、`610101` 2 次）。**运营会反复重试，每次都被同一个码打回。**
- 陷阱：其中一家重试时只改了 `district` 名（`市辖区` → `市辖河东区`）没改 `district_code`，照样挂。**汇付只认 `district_id`，改名无效。**
- 已确认的映射（可复用）：临沂沂河新区梅埠街道 → `371312 河东区`；芜湖南陵县籍山镇 → `340223 南陵县`；聊城经开区东城街道 → `371502 东昌府区`；南昌经开区榆林路 → `360112 新建区`；西安经开区文景北路 → `610112 未央区`；石家庄高新区兴安大街 → `130102 长安区`；肇庆高新区大旺迎宾大道 → `441284 四会市`（执照登记码 `441208` 是高新区托管码，国标无）。
