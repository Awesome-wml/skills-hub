# 修复脚本

前提：已有分诊结论，且为 `UI_CHANGED` 或 `SCRIPT_BUG`。其他结论不修脚本。

**只能改 `reach.spec.ts`。** 修复的唯一目标是让脚本重新到达同一个业务状态；判定规则一个字都不能动。

1. 对照分诊材料里「失败时的页面结构」，找出脚本中失效的定位对应的新元素。证据不够就用探针看当前页面：

   ```bash
   node $SKILL/scripts/probe.mjs start --login <角色> --path <页面>
   node $SKILL/scripts/probe.mjs snap
   ```

2. 改动尽量小：只换失效的定位或补等待，不重写整个脚本。如果操作路径变了（比如筛选挪进了弹窗），按 [generate](generate.md) 的方法重新探索这一段。
3. **自检，任何一条为「是」就停下来问用户，不要继续修**：
   - 新路径是否跳过了 intent 要求的步骤（例如原来要选状态，现在不选了）？
   - 新路径填的值、选的选项是否和 intent 不一致？
   - 改完后断言才能通过，是不是因为走了一条「更容易通过」的路？
4. 验证：

   ```bash
   npx playwright test -c <e2e>/playwright.config.ts -g <用例id> --repeat-each 3
   npm run -s e2e:guard
   ```

   改完后失败落在「判定」阶段：说明页面改版之外还有产品行为变化，回到 [triage](triage.md) 重新分诊，不要继续改。
5. 交付给用户：改了哪几处定位（旧 → 新）、为什么（引用页面结构证据）、三次执行结果。改动留在分支或工作区等人审。
