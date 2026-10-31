# 接入项目

1. 确认被测项目根目录有 `package.json`（纯后端或没有前端工程的项目，可以单独建一个测试目录并 `npm init -y`）。
2. 向用户确认**测试环境地址**。不要猜，不要用生产地址。
3. 执行：

   ```bash
   node $SKILL/scripts/init.mjs --base-url <测试环境地址> --env <环境名，如 uat>
   ```

   输出里如有「缺少依赖」，按提示安装：`npm i -D playwright yaml && npx playwright install chromium`。
4. 打开生成的 `<e2e>/e2e.config.yaml`，和用户逐项确认：
   - `allowWrite`：这个环境允许测试写数据吗？（下单、提交表单等都算写）
   - `aiData`：这个环境的页面内容（截图、页面结构、接口数据）可以交给智能体吗？有真实用户数据的环境应为 `forbidden`。
   - `mask`：还需要脱敏哪些字段（手机号、身份证已默认）。
5. 登录态，二选一：
   - **人工保存**（最快）：让用户执行
     `node $SKILL/scripts/probe.mjs start --headed --path <登录页>`，在弹出的浏览器里手动登录，然后
     `node $SKILL/scripts/probe.mjs save-login --as <角色名>`，再 `probe stop`。登录态会过期，过期后重做。
   - **Fixture 签发**（适合 CI）：由项目研发按 [Fixture 协议](../reference/fixture-protocol.md) 实现，并在配置里填 `fixture.command`。
6. 验证：`probe start --login <角色名> --path <首页>` 后 `probe snap` 能看到登录后的页面，`probe stop`。
7. 提醒用户两件事（只说一次）：
   - 在代码托管平台把 `<e2e>/cases/**/assert.yaml` 和 `<e2e>/assert.lock` 设为必须人审（CODEOWNERS 或同类机制）。
   - CI 里先跑 `npm run e2e:guard`，再跑 `npm run e2e:run`。

运行时升级：`node $SKILL/scripts/init.mjs --upgrade`（只替换 `<e2e>/runtime/`，不动用例和配置）。
