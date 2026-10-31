# Fixture 协议

Fixture 是被测项目自己实现的一个可执行程序，负责签发登录态、造数、清理。语言不限，只要满足：

- 通过 `e2e.config.yaml` 的 `fixture.command` 调用，工作目录为被测项目根目录；
- 从**标准输入**读一个 JSON 请求，向**标准输出**写一个 JSON 响应；
- 成功退出码为 0，失败非 0，并把原因写到标准错误。

每个请求都带 `action` 和 `env`（当前环境名）。

| action | 请求 | 响应 | 何时调用 |
|---|---|---|---|
| `login` | `{ role, target }` | `{ storageState: <Playwright storageState 对象或文件路径> }` | 用例声明了 `precondition.login` |
| `seed` | `{ name, params }` | `{ batchId, data }` | 用例声明了 `precondition.data` |
| `cleanup` | `{ batchId }` | `{ ok: true }` | 用例结束后（无论成败） |

未配置 `fixture.command` 时，登录态改用人工保存的 `<e2e>/.auth/<role>.json`；声明了造数的用例会直接报错。

## 示例（Node）

```js
// e2e/fixture/index.mjs
const req = JSON.parse(await new Promise((r) => { let s = ''; process.stdin.on('data', (c) => (s += c)).on('end', () => r(s)); }));

if (req.action === 'login') {
  const token = await issueTestToken(req.env, req.role);   // 调用测试环境专用的签发接口
  process.stdout.write(JSON.stringify({
    storageState: { cookies: [], origins: [{ origin: 'https://uat.example.com', localStorage: [{ name: 'token', value: token }] }] },
  }));
} else if (req.action === 'seed') {
  const { batchId, orders } = await createOrders(req.env, req.params);
  process.stdout.write(JSON.stringify({ batchId, data: { orders } }));
} else if (req.action === 'cleanup') {
  await deleteBatch(req.env, req.batchId);
  process.stdout.write(JSON.stringify({ ok: true }));
} else {
  console.error(`unknown action ${req.action}`);
  process.exit(1);
}
```

## 实现要求

- 只在测试环境可用；拿到生产环境名必须拒绝。
- 测试账号按最小权限配置，这是写操作的真实安全边界（「禁止点删除」写在意图里只是提示）。
- 造数只造在专用测试租户 / 测试账号下，并以 `batchId` 为单位可清理。
- 登录态签发不要走页面登录（验证码、短信会让回归不稳定）。
