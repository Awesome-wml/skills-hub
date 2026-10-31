# 失败分诊

1. 压缩失败现场：

   ```bash
   node $SKILL/scripts/pack-failure.mjs            # 全部失败用例
   node $SKILL/scripts/pack-failure.mjs --case <id>
   ```

   读输出（也写在 `<e2e>/runs/triage/<id>.md`）。不要直接读 trace 压缩包；需要细节时再看截图或 `npx playwright show-trace`。

2. 按「失败阶段」判断：

   | 阶段 | 含义 | 常见结论 |
   |---|---|---|
   | `setup` | 登录态 / 造数没准备好 | `ENVIRONMENT`、`TEST_DATA` |
   | `reach` | 脚本没走到目标状态 | `UI_CHANGED`、`SCRIPT_BUG`、`ENVIRONMENT` |
   | `assert` | 脚本走完了，判定没过 | `PRODUCT_DEFECT`（需先确认确实到达） |

   五种结论：

   - `UI_CHANGED`：页面改版（文案、布局、组件变了），业务行为没变。证据：失败时的页面结构里能找到改名或换位的对应元素。
   - `PRODUCT_DEFECT`：系统行为不符合断言。**只有确认脚本确实到达了目标状态才能这样判**，并在结论中设置 `reachConfirmed: true`。
   - `ENVIRONMENT`：服务不可达、接口 5xx、超时、网关错误。证据：页面是浏览器错误页，或接口状态码异常。
   - `TEST_DATA`：数据不满足前提（被别人改了、造数失败、登录态过期）。
   - `SCRIPT_BUG`：脚本自身问题，典型是偶发失败（等待不足）。分诊材料会标出「N 次中 M 次失败」。

3. 证据不足时，用探针复现：`probe start --login <角色> --path <失败时 URL>` 后 `snap`，对照脚本的定位逐个检查。

4. 写结论到 `<e2e>/runs/triage/<id>.verdict.json`：

   ```json
   {
     "caseId": "order-list-filter",
     "verdict": "UI_CHANGED",
     "confidence": 0.9,
     "summary": "一句话结论，用业务语言",
     "reachConfirmed": false,
     "evidence": [
       { "type": "page_structure", "ref": "证据文件路径或接口", "note": "这条证据说明了什么" }
     ]
   }
   ```

   `evidence.type` 可选：`trace` / `screenshot` / `api_response` / `page_structure` / `log` / `probe`。

5. 校验：`node <e2e>/runtime/guard.mjs verdict <e2e>/runs/triage/<id>.verdict.json`。

6. 独立复核：`node $SKILL/scripts/second-opinion.mjs --case <id>`。它把脱敏后的失败现场交给 TypeSafe Jev 独立判断（Jev 看不到你的结论），结果写回结论文件的 `secondOpinion` 字段：

   | `secondOpinion` | 怎么办 |
   |---|---|
   | `status: disabled / blocked / unavailable` | 未开启、环境禁止外发或调用失败，按你的结论继续，告诉用户「未经复核」及原因 |
   | `agreement: agree` | 按你的结论继续 |
   | `agreement: uncertain` | Jev 没把握，按你的结论继续，把 Jev 的选项一并告诉用户 |
   | `agreement: conflict` | **停下**：不进入 heal、不起草缺陷，把两边结论和各自证据列给用户，由人决定 |

   不要为了「让两边一致」而改自己的结论；你若被 Jev 的选项说服，回到第 2 步重新取证。

7. 告诉用户结论和下一步：
   - `UI_CHANGED`、`SCRIPT_BUG`：置信度 ≥ 0.8 时进入 [heal](heal.md)，否则先请用户确认。
   - `PRODUCT_DEFECT`：给出复现步骤、期望与实际（引用断言名和接口响应），供用户提缺陷。
   - `ENVIRONMENT`、`TEST_DATA`：说明哪里不可用，需要谁处理。不要修改脚本。
