# 探针命令

`node $SKILL/scripts/probe.mjs <命令> [参数]`。一个常驻的浏览器会话，每条命令操作一步；会话 30 分钟无操作自动关闭。探针与回归运行时使用同一个 Playwright，探针里能定位到的元素，脚本里用同样写法就能定位到。

## 会话

| 命令 | 说明 |
|---|---|
| `start [--login <角色>] [--path <起始页>] [--headed] [--env <环境>]` | 启动；`--headed` 打开可见浏览器（给人登录用） |
| `stop` | 关闭 |
| `save-login --as <角色>` | 把当前登录态存为 `<e2e>/.auth/<角色>.json` |

## 观察

| 命令 | 说明 |
|---|---|
| `snap [--full]` | 页面结构（无障碍树）+ 截图路径 + 上次 snap 后的接口请求。默认截断到 8000 字 |
| `net [--path <片段>] [--last N] [--all] [--full]` | 接口请求与响应体（写 api 断言时用） |
| `shot` | 整页截图 |
| `log` | 已执行的操作列表 |

## 操作

所有操作执行后会等待接口静默（800ms 内无新请求），并输出「本步触发的接口」。

| 命令 | 额外参数 |
|---|---|
| `goto <路径或URL>` | |
| `click <定位>` | |
| `fill <定位> --value <文本>` | |
| `select <定位> --value <选项文字或值>` | 先按选项文字匹配，失败再按值 |
| `check <定位>` | |
| `hover <定位>` | |
| `press [<定位>] --key <键>` | 如 `Enter`；不给定位则按在当前焦点 |
| `wait --text <文字> \| --url <正则> \| --ms <毫秒>` | `--ms` 不会写入脚本草稿 |

## 定位参数

从 `snap` 输出中取：`button "查询"` → `--role button --name 查询`。

| 参数 | 对应 Playwright |
|---|---|
| `--role <角色> [--name <名称>]` | `getByRole`（首选） |
| `--label <文字>` | `getByLabel` |
| `--placeholder <文字>` | `getByPlaceholder` |
| `--text <文字>` | `getByText` |
| `--testid <id>` | `getByTestId` |
| `--exact` | 名称精确匹配（默认为包含匹配） |
| `--in-role <角色> [--in-name <名称>]` | 限定在某个区域内查找 |
| `--nth <下标>` | 多个匹配时取第几个（尽量不用） |

匹配到多个元素时探针会拒绝执行，与回归运行时的严格模式一致。

## 生成脚本

| 命令 | 说明 |
|---|---|
| `draft [--case <id>] [--write] [--force]` | 把操作记录转成 `reach.spec.ts`；触发接口的动作会自动包上「等待该接口返回」 |

## 常见问题

- 「登录态 xxx 不存在」：按 workflows/init.md 第 5 步保存登录态。
- 「环境声明了 aiData: forbidden」：这个环境不能用探针，换测试环境。
- 「已有探针会话在运行」：先 `stop`。
- 启动失败会直接打印原因；完整日志在 `<e2e>/.probe/daemon.log`。
