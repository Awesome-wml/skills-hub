# 生成脚本

前提：用例目录里已有 `intent.yaml` 和**已批准的** `assert.yaml`（`npm run -s e2e:guard` 不报「尚未经人批准」）。没有就先走 [author](author.md)。

1. 读 `intent.yaml` 的 `goal` 和 `constraints.forbidden`，读 `assert.yaml` 弄清最终要到达什么状态（例如「列表已按条件刷新」）。
2. 用探针按目标一步步操作，每步之后看输出里「本步触发的接口」，必要时 `snap`：

   ```bash
   node $SKILL/scripts/probe.mjs start --login <intent 中的角色> --path <起始页>
   node $SKILL/scripts/probe.mjs snap
   node $SKILL/scripts/probe.mjs select --role combobox --name 订单状态 --value 已完成
   node $SKILL/scripts/probe.mjs fill --role textbox --name 订单号 --value SO202610
   node $SKILL/scripts/probe.mjs click --role button --name 查询
   ```

   - 定位方式从 `snap` 的页面结构里取：`combobox "订单状态"` → `--role combobox --name 订单状态`。
   - 探针报「匹配到 N 个元素」时用 `--exact`、`--in-role/--in-name` 缩小范围，不要直接上 `--nth`（下标最容易随改版失效）。
   - 不要点 `constraints.forbidden` 里的元素。
   - 操作失败、走错页面时可以 `goto` 重来；只有最终成功的路径才应留在脚本里，所以走错后先 `stop` 再 `start` 重新走一遍干净路径。
3. 生成草稿：

   ```bash
   node $SKILL/scripts/probe.mjs draft --case <用例id> --write
   node $SKILL/scripts/probe.mjs stop
   ```

   草稿会给触发接口的动作自动加上「等待该接口返回」，保留它们：这是脚本稳定的关键。
4. 审一遍草稿：删掉探索时多余的步骤；如果 intent 里有造数（`precondition.data`），用 `data` 参数里的值替换写死的数据。
5. 验证（全部通过才算完成）：

   ```bash
   npx playwright test -c <e2e>/playwright.config.ts -g <用例id> --repeat-each 3
   npm run -s e2e:guard
   ```

   - 三次里有失败：看报错修脚本。最常见的原因是少了等待；不要用 `waitForTimeout` 硬等。
   - 失败在「判定」阶段，而你确认脚本已经走到了目标状态：可能是产品真有缺陷，也可能是断言写错了。**不要改断言、不要为了通过而改变操作路径**，停下来把现象告诉用户。
6. 交付给用户：脚本路径、走过的步骤（一句话一步）、三次执行结果。改动留在工作区或分支里等人审。
