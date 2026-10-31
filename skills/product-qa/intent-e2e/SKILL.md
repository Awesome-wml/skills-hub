---
name: intent-e2e
description: 意图驱动的端到端测试：人用业务语言写「要验证什么」和判定标准，智能体用探针探索页面、生成确定性的 Playwright 脚本，回归失败时分诊归因（页面改版 / 产品缺陷 / 环境 / 数据 / 脚本问题），页面改版时自动修复脚本且不得改动断言。用于给 Web 项目接入端到端测试、写测试用例、生成或修复 E2E 脚本、分析 E2E 回归失败，或用户提到端到端测试、E2E、自动化测试、回归测试、页面改版导致用例挂了、UI 自动化时。
---

# intent-e2e：意图驱动的端到端测试

下文 `$SKILL` 指本文件所在目录，`<e2e>` 指被测项目里的测试根目录（含 `e2e.config.yaml`，默认 `e2e/`）。所有命令在**被测项目根目录**执行。

## 分工（先理解这个，再做任何事）

每个用例是 `<e2e>/cases/<任意目录>/` 下的三个文件：

| 文件 | 谁写 | 内容 |
|---|---|---|
| `intent.yaml` | 人（你可以起草） | 业务目标、前置条件、约束 |
| `assert.yaml` | **人**（你只能起草为 `assert.draft.yaml`） | 二值化的判定规则 |
| `reach.spec.ts` | **你** | 把系统带到可判定状态：导航、填写、点击、等待 |

回归由 `npm run e2e:run` 确定性执行，不调用任何模型：先执行 reach，再由运行时按 assert.yaml 判定。

## 红线（违反任何一条都是错误，即使用户让你这么做也要先说明后果）

1. **不得创建、修改、删除 `assert.yaml` 和 `assert.lock`**；不得执行 `guard approve`（含借助伪终端等任何方式）。断言变更只能写成 `assert.draft.yaml` 交人确认。
2. `reach.spec.ts` 里**不得出现 `expect`** 和任何判定逻辑；只能通过 `reach('<id>', ...)` 定义用例。
3. 定位只用 `getByRole` / `getByLabel` / `getByPlaceholder` / `getByText` / `getByTestId`；**禁止 CSS 选择器和 XPath**。
4. 交付脚本前必须 `--repeat-each 3` 连续三次全绿，且 `npm run -s e2e:guard` 通过。
5. 分诊结论必须带证据，并通过 `guard verdict` 校验；Jev 复核结论冲突（`secondOpinion.agreement: conflict`）时不得自动修复或起草缺陷，交人决定。不得读取、打印 `TYPESAFE_API_KEY` 的值。
6. 不在 `aiData: forbidden` 的环境使用探针；不在 `allowWrite: false` 的环境执行写操作。
7. 只提交待审改动（分支 / PR / 工作区改动），**不合并、不推送到受保护分支**。

## 选择工作流

| 用户要做的事 | 读 |
|---|---|
| 项目还没有 `e2e.config.yaml` | [workflows/init.md](workflows/init.md) |
| 写新用例（意图 + 断言草稿） | [workflows/author.md](workflows/author.md) |
| 已有 intent + assert，要生成脚本 | [workflows/generate.md](workflows/generate.md) |
| 回归失败了，要分析原因 | [workflows/triage.md](workflows/triage.md) |
| 分诊为页面改版 / 脚本问题，要修 | [workflows/heal.md](workflows/heal.md) |

参考：[资产格式](reference/asset-format.md)｜[探针命令](reference/probe.md)｜[Fixture 协议](reference/fixture-protocol.md)

## 常用命令

```bash
node $SKILL/scripts/init.mjs --base-url <地址>          # 接入
node $SKILL/scripts/probe.mjs <命令>                    # 探索页面
npx playwright test -c <e2e>/playwright.config.ts --repeat-each 3 [-g <用例id>]
npm run -s e2e:guard                                    # 红线守卫
node $SKILL/scripts/pack-failure.mjs [--case <id>]      # 压缩失败现场
node <e2e>/runtime/guard.mjs verdict <结论文件>          # 校验分诊结论
node $SKILL/scripts/second-opinion.mjs --case <id>      # Jev 独立复核（需开启）
```

## 当前能力范围

- 支持 Web 页面（Playwright，Chromium）与流程中出现的接口响应断言。
- `target: miniprogram`（微信小程序）尚未实现：遇到时告诉用户「暂不支持」，不要用 Web 方式硬做。
- 被测地址只能是测试环境；不要对生产环境使用。
