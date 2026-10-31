---
name: authz-map
description: 菜单权限 2.0 的权限映射生成器：给定前端页面（或功能、或一批页面），找出「页面打开要调的读接口」和「每个按钮点击要调的写接口」，对照后端注解与权限种子，输出缺口清单和可直接粘贴进 R__permission_atom.sql 的种子行。触发词：「这个页面要配哪些权限」「这个页面调了哪些接口」「给这几个页面配权限」「/authz-map」「接口 403 了缺哪个原子」「新功能权限怎么配」「检查页面权限有没有漏配」「原子种子 id 怎么取」「R__permission_atom 冲突 / 撞号」。只读分析 + 生成种子草稿，不写库、不自动改种子，改种子前必须经用户确认。
version: 0.1.0
---

# authz-map：页面 → 接口 → 原子 映射生成

菜单权限 2.0 里，接口用无参 `@RequiresCapability` 表示「需要鉴权」，需要什么权限由 `sys_permission_atom`（原子）和 `sys_permission_atom_api`（原子 → 接口）决定。**无参接口没有任何原子覆盖 = 一律 403**；用超管自测永远发现不了，因为超管在切面里直接放行。

本技能把「研发对接一个页面后，手工去查这个页面调了哪些接口、再去配原子」这件事变成：给出页面 → 输出缺口表 + 种子草稿 → 研发审一遍。

## 仓库与关键位置

| 用途 | 路径 |
|---|---|
| 前端页面 | `octopus-admin/src/views/**`（菜单 `sys_menu.component` 指向这里，如 `system/sessionAdmin/index` → `src/views/system/sessionAdmin/index.vue`） |
| 前端手写接口 | `octopus-admin/src/api/*.ts`：`request({ url, method, module: apiModuleMap.xxx })`，前缀拼接在 `src/utils/request.ts` |
| 前端生成 SDK | `octopus-admin/src/sdk/<service>/*.ts`：`apiClient({ url, method })`，url 已是完整路径 |
| 模块前缀表 | `octopus-admin/src/config/net.config.ts`：如 `systemCore: '/system-core'`、`commerceCore: '/commerce-core/v1'` |
| 按钮权限码 | 页面里的 `v-permissions="{ permission: ['supplier:create'] }"`；码值 = `sys_menu.identity` = 原子码（**两表无存储关联**，只靠同码约定、运行时字符串相等拼接；这是已定方案，不要提议建关联表——码写错一个字符就静默失联，所以要逐个比对） |
| 后端接口 | `octopus-cloud/<service>/src/main/java/**/controller/**Controller.java` |
| 原子与映射种子 | `octopus-cloud/system-core/src/main/resources/db/seed/common/R__permission_atom.sql` |
| 原子所属能力（多对多） | 同目录 `R__capability_atom.sql`；`parent_capability_code` 列已废弃，归属以此为准 |
| 存量兼容映射 | 同目录 `R__permission_atom_compat.sql`（`legacy:<svc>:<Controller>:<capability>` 原子） |
| 能力目录种子 | 同目录 `R__capability_catalog.sql` |
| 公开接口豁免 | `octopus-cloud/scripts/endpoint-capability-exemptions.txt` |
| 静态提取脚本（参考） | `octopus-admin/scripts/extract-page-endpoints.mjs`（只跟一层 import、无 HTTP 方法，只作对照） |

先确认两个仓库所在分支（`git -C <repo> branch --show-current`），以权限 2.0 分支或已合入它的 dev 为准；分支不对就停下来告诉用户。工作区常落后 dev 上百提交，后端注解和种子的"现状"以 `git show origin/dev:<path>` 为准，输出里注明基线 commit。

**鉴权注解事实**（origin/dev 已核实）：后台接口用 `@RequiresCapability`（无参占绝大多数）；`@RequiresPermission(domain/object/action)` 已 `@Deprecated`，只剩个别存量类，遇到按 DECLARED 类似处理并单列「旧注解待迁移」；C 端 commerce-core 用 `@ConsumerApi`（只要求登录 + consumer 身份，不走原子），不需要配原子；`@Audited` 只审计不鉴权，不能当作已鉴权。

## 输入

用户可以给：页面文件路径、菜单路由（如 `/system/session-admin`）、菜单中文名、功能描述，或一批页面。拿到菜单名或路由时，在 `octopus-cloud` 的 `R__menu_*.sql` 种子里反查 `component`，再定位 `.vue` 文件。

## 第一步：收集页面会调的接口（前端，递归）

对每个页面：

1. 读页面 `.vue`，并**递归**读它 import 的本地组件（`./components/*`、`@/views/**`、弹窗、抽屉、Tab 子组件），直到不再出现新的本地组件。不要只看一层。
2. 收集所有被调用的 api / sdk 函数，进对应文件读出 `url` 和 `method`：
   - `src/api`：有 `module` 时，完整路径 = `net.config.ts` 里该模块前缀 + `url`（`request.ts` 第 237 行起）；没写 `module` 的，`url` 本身就是完整路径。
   - `src/sdk`：`url` 即完整路径，`method` 统一转大写。
   - 模板串里带变量的 url：列出来，标「动态 url，需人工确认」。
3. 按**触发时机**分组：
   - **页面读接口**：`onMounted` / `created` / 初始化 / 列表查询 / 字典与下拉选项加载。
   - **按钮接口**：在按钮点击处理函数（以及它打开的弹窗提交）里调用的接口，归到该按钮的 `v-permissions` 码下。按钮没有 `v-permissions` 的，标「按钮无权限码」。
   - 只在某个条件分支里才调的，标「条件调用」。

## 第二步：对照后端（注解模式 + 种子覆盖）

对每个「方法 + 路径」：

1. 在对应服务的 Controller 里找到方法（`@RequestMapping` 类前缀 + 方法 `@GetMapping`/`@PostMapping`）。找不到 = 前端调了不存在的接口，单列出来。
2. 判定鉴权模式：
   - 无参 `@RequiresCapability` → **DYNAMIC**，需要原子覆盖；
   - 带参 `@RequiresCapability(Capability.Codes.X)` → **DECLARED**，权限写死在代码里，配置不生效，记下声明的能力码；
   - `@ConsumerApi` → **CONSUMER**，C 端仅登录校验，不需原子；
   - 旧 `@RequiresPermission` → **LEGACY**，单列待迁移，不要顺手改；
   - 无鉴权注解（含只有 `@Audited`）→ **PUBLIC**，核对是否在 `endpoint-capability-exemptions.txt`，不在就报警（疑似漏加注解）。
3. 在 `R__permission_atom.sql` 和 `R__permission_atom_compat.sql` 的 `sys_permission_atom_api` 里 grep `'<METHOD>', '<path>'`，列出已覆盖它的原子及其父能力。
4. 按钮的权限码：在 `sys_permission_atom` 里查是否已有同码原子、父能力是什么、父能力是否还在 `R__capability_catalog.sql` 里（父能力已删除 = 孤儿原子，单列）。

## 第三步：输出

### 1）缺口表（每个页面一张）

| 触发 | 方法 | 路径 | 模式 | 已覆盖原子（父能力） | 结论 |
|---|---|---|---|---|---|

结论只用这几种：`已覆盖` · `缺映射（会 403）` · `DECLARED 不受配置管` · `CONSUMER 无需原子` · `LEGACY 旧注解待迁移` · `PUBLIC 未登记豁免` · `后端不存在` · `待人工确认`。

### 2）种子草稿（只针对「缺映射」）

- 页面读接口：优先挂到页面已有的读原子（如 `<entity>:list`）；没有就提议新原子 `<entity>:list`，父能力取该页面菜单在 `sys_menu_capability` 绑定的能力。
- 按钮接口：挂到按钮自己的原子（码 = 按钮 `v-permissions` 码）；原子不存在就同时生成原子行，所属能力取所在页面菜单绑定的能力（可多个，一个原子可属于多个能力）。**页面绑了 0 个能力时不要猜**，列为「待产品确认归属」。
- 公共接口（字典 `/system-core/v1/dict/*`、通用下拉、文件上传等几乎每页都调的）：**不要挂到某个业务能力下**，单列建议「登记为公开接口」或「归入人人都有的基础能力」，由用户决定。
- **id 取全局最大，不是本分支最大**：这些种子主键是手工顺序号、按 id upsert，两条并行 release 分支各自"接着最大号排"必撞号，后部署的覆盖先部署的（2026-10-23 撞车覆盖；2026-10-28 dev 的 system-core 因唯一键冲突 CrashLoop）。做法：对 `origin/dev` 和**每个活跃的 `origin/release/*`** 分别取对应文件 / INSERT 段的最大 id，取全局最大 +1（或留明显间隔）；生成后再 grep 全部 `db/seed` 确认不撞号（菜单 ID 撞车也曾导致整行被覆盖、菜单凭空消失）。
  ```bash
  for ref in origin/dev $(git -C $OCTOPUS_ROOT/octopus-cloud branch -r --list 'origin/release/*'); do
    git -C $OCTOPUS_ROOT/octopus-cloud show "$ref:system-core/src/main/resources/db/seed/common/R__permission_atom_compat.sql" 2>/dev/null \
      | grep -oE '^\s*\(([0-9]+)' | tr -dc '0-9\n' | sort -n | tail -1 | sed "s#^#$ref #"
  done
  ```
- 解 R__ 种子的合并冲突：逐行比对 id，不能简单取某一侧——两侧新增行可能都要保留，也可能正好撞号需要改号。
- 格式与文件现有行一致：
  ```sql
  -- sys_permission_atom
  (<id>, '<code>', '<模块 / 页面 / 按钮>', '<parent_capability_code>', '<ORG_CAPABILITY>', '按钮派生', '管理后台', 1),
  -- sys_permission_atom_api
  (<id>, '<atom_code>', '<METHOD>', '<path>'),
  -- R__capability_atom.sql（每个所属能力一行；id = CONV(SUBSTRING(MD5(CONCAT(cap,'#',atom)),1,15),16,10)）
  (<id>, '<capability_code>', '<atom_code>'),
  ```

### 3）给研发的下一步

- 种子行粘贴进 `R__permission_atom.sql` 对应段落（**先问用户，确认后再改文件**）；改完在真 MySQL 上起一次 system-core 验证（编译通过 ≠ SQL 能跑）；
- 后端新接口确认用的是无参 `@RequiresCapability`；
- 本地 `FLYWAY_ENABLED=true` 重启 system-core，看日志 `[ApiPermission] 配置快照已发布`，到「原子权限配置 › 接口核对」确认未覆盖列表里没有这些接口；
- **用只勾了该能力的非超管测试账号**把页面和每个按钮走一遍，确认没有 403。

## 红线

- 只读分析 + 生成草稿。不连数据库写数据，不自动改种子文件，不提交代码；改文件前必须得到用户确认。
- 静态分析是建议，不是事实：动态 url、条件调用、跨组件事件触发的请求都可能漏。输出里必须写明「已用浏览器 Network 抓包或测试账号走查核对」之前不算完成。
- 不替产品决定归属：一个接口挂到哪个能力是业务判断，拿不准就列出候选让用户选。
- 发现 DECLARED 接口不要顺手去参，那会改变该接口的权限来源，属于单独的改造。
