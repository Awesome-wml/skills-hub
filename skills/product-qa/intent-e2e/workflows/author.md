# 写新用例（意图 + 断言草稿）

目标：产出 `intent.yaml` 和 `assert.draft.yaml`，交人确认。格式见 [资产格式](../reference/asset-format.md)。

1. 从用户的描述、需求文档或 spec 里提炼**一个**业务目标。一个用例只验证一件事；「下单并退款」要拆成两个用例。
2. 用探针**只读**走一遍，确认页面、字段名、接口路径真实存在：

   ```bash
   node $SKILL/scripts/probe.mjs start --login <角色> --path <页面>
   node $SKILL/scripts/probe.mjs snap
   node $SKILL/scripts/probe.mjs net --last 5      # 看接口路径和响应字段
   ```

   不要在这一步做写操作。
3. 写 `<e2e>/cases/<用例目录>/intent.yaml`。`id` 用英文短横线命名，全项目唯一。
4. 写 `assert.draft.yaml`（**不是** `assert.yaml`）。起草原则：
   - 断言**业务结果**，不断言过程（按钮变灰、加载动画都不算）。
   - 优先断言接口响应（不受页面改版影响），再补少量界面断言。
   - 每条都是二值的：等于、包含、匹配、全部满足、存在。不写「显示正常」这类模糊描述。
   - 列表类断言要防「空列表也通过」：`all_rows_text` 默认至少 1 行；接口断言加 `minLength: 1`。
   - 金额、编号等字段按字符串写（YAML 里加引号），字段类型本身也是被测对象。
5. 把草稿给用户看，用业务语言逐条解释每条断言在验证什么，请用户确认或修改。
6. 用户确认后，**由用户**把 `assert.draft.yaml` 改名为 `assert.yaml`，并在终端执行 `npm run e2e:approve`。你不执行这两步。
7. 断言批准后，进入 [generate](generate.md)。
