#!/usr/bin/env node
// 探针：常驻浏览器会话，供智能体逐步探索页面。用法见 reference/probe.md。
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadProject, loadPlaywright, findCase, callFixture, parseArgs, fail } from './lib/project.mjs';
import { specFromFlags, buildLocator, locatorCode, quote } from './lib/locator.mjs';

const SELF = fileURLToPath(import.meta.url);
const SNAP_LIMIT = 8000;
const BODY_LIMIT = 1500;
const IDLE_MS = 30 * 60 * 1000;

const { positional, flags } = parseArgs(process.argv.slice(2));
const cmd = positional[0];

if (cmd === '__daemon') {
  await runDaemon(JSON.parse(positional[1]));
} else {
  await runClient();
}

// ───────────────────────── 客户端 ─────────────────────────

async function runClient() {
  if (!cmd || cmd === 'help') {
    console.log('命令：start | goto | snap | click | fill | select | check | press | hover | wait | net | shot | log | draft | save-login | stop\n详见 reference/probe.md');
    return;
  }
  const project = loadProject({ env: flags.env });
  const sessionDir = path.join(project.root, '.probe');
  const sessionFile = path.join(sessionDir, 'session.json');

  if (cmd === 'start') {
    if (await alive(sessionFile)) fail('已有探针会话在运行，先执行 stop');
    if (project.env.aiData === 'forbidden') fail(`环境 ${project.envName} 声明了 aiData: forbidden，不允许把页面内容交给智能体`);
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.rmSync(sessionFile, { force: true });
    const logFd = fs.openSync(path.join(sessionDir, 'daemon.log'), 'w');
    const opts = { root: project.root, env: project.envName, login: flags.login || null, headed: Boolean(flags.headed), path: flags.path || null };
    const child = spawn(process.execPath, [SELF, '__daemon', JSON.stringify(opts)], { detached: true, stdio: ['ignore', logFd, logFd], cwd: process.cwd(), env: process.env });
    let exited = false;
    child.on('exit', () => (exited = true));
    child.unref();
    const logFile = path.join(sessionDir, 'daemon.log');
    const started = Date.now();
    while (!fs.existsSync(sessionFile)) {
      if (exited) fail(`探针启动失败：\n${fs.readFileSync(logFile, 'utf8').split('\n').filter((l) => !/UNDICI|trace-warnings/.test(l)).slice(0, 15).join('\n')}`);
      if (Date.now() - started > 60_000) fail(`探针启动超时，查看 ${logFile}`);
      await sleep(200);
    }
    const res = await call(sessionFile, 'status', {});
    console.log(res.out);
    return;
  }

  if (!fs.existsSync(sessionFile)) fail('没有探针会话，先执行 start');
  const res = await call(sessionFile, cmd, { ...flags, _: positional.slice(1) });
  if (!res.ok) fail(res.out);
  console.log(res.out);
}

async function alive(sessionFile) {
  if (!fs.existsSync(sessionFile)) return false;
  try {
    await call(sessionFile, 'status', {});
    return true;
  } catch {
    return false;
  }
}

function call(sessionFile, name, args) {
  const { port } = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  const body = JSON.stringify({ name, args });
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        fs.rmSync(sessionFile, { force: true });
        reject(new Error('探针会话已退出'));
      } else reject(e);
    });
    req.end(body);
  }).catch((e) => fail(e.message));
}

// ───────────────────────── 守护进程 ─────────────────────────

async function runDaemon(opts) {
  const project = loadProject({ cwd: opts.root, env: opts.env });
  const sessionDir = path.join(project.root, '.probe');
  const shotsDir = path.join(sessionDir, 'shots');
  fs.mkdirSync(shotsDir, { recursive: true });
  const mask = project.mask;
  const pw = loadPlaywright(project.projectDir);

  const channel = project.config.browser?.channel;
  const browser = await pw.chromium.launch({ headless: !opts.headed, ...(channel ? { channel } : {}) }).catch((e) => {
    if (!/Executable doesn't exist/.test(e.message)) throw e;
    return pw.chromium.launch({ headless: !opts.headed, channel: 'chromium' });
  });
  const ctxOpts = { baseURL: project.env.baseURL, locale: 'zh-CN', viewport: { width: 1440, height: 900 } };
  let loginNote = '未加载登录态';
  if (opts.login) {
    const file = path.join(project.authDir, `${opts.login}.json`);
    const issued = callFixture(project, 'login', { role: opts.login, target: 'web' });
    if (issued) {
      ctxOpts.storageState = typeof issued.storageState === 'string' ? path.resolve(project.projectDir, issued.storageState) : issued.storageState;
      loginNote = `已由 Fixture 签发登录态 ${opts.login}`;
    } else if (fs.existsSync(file)) {
      ctxOpts.storageState = file;
      loginNote = `已加载登录态 ${opts.login}`;
    } else {
      loginNote = `登录态 ${opts.login} 不存在：请人在有界面模式（start --headed）下手动登录后执行 save-login --as ${opts.login}`;
    }
  }
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();

  const actions = [];
  const network = [];
  let curIdx = -1;
  let seq = 0;
  let lastSnapSeq = 0;
  let shotNo = 0;

  let inflight = 0;
  let lastActivity = Date.now();
  page.on('request', (req) => {
    const type = req.resourceType();
    if (type !== 'fetch' && type !== 'xhr') return;
    const u = new URL(req.url());
    const entry = { seq: ++seq, actionIdx: curIdx, method: req.method(), path: u.pathname, query: u.search, reqBody: req.postData() || '', status: null, resBody: '' };
    network.push(entry);
    if (network.length > 500) network.shift();
    inflight++;
    lastActivity = Date.now();
    req.response().then(async (res) => {
      if (!res) return;
      entry.status = res.status();
      try {
        entry.resBody = await res.text();
      } catch {
        entry.resBody = '<无法读取响应体>';
      }
    }).catch(() => {}).finally(() => {
      inflight--;
      lastActivity = Date.now();
    });
  });

  // 动作后等待接口静默：至少 QUIET_MS 内无新请求且无进行中的请求（上限 SETTLE_MAX_MS）。
  // 不用 networkidle：页面首次加载后它已达成，再次等待会立即返回，漏掉防抖/延迟发出的请求。
  const QUIET_MS = 800;
  const SETTLE_MAX_MS = 8000;
  async function settle() {
    const start = Date.now();
    await page.waitForLoadState('load', { timeout: 5000 }).catch(() => {});
    while (Date.now() - start < SETTLE_MAX_MS) {
      const now = Date.now();
      if (inflight === 0 && now - lastActivity >= QUIET_MS && now - start >= QUIET_MS) return;
      await sleep(100);
    }
  }

  function apiSince(fromSeq) {
    const rows = network.filter((n) => n.seq > fromSeq);
    if (!rows.length) return '（无）';
    return rows.map((n) => `#${n.seq} ${n.method} ${n.path}${n.query} → ${n.status ?? '进行中'}`).join('\n');
  }

  function resolveOne(spec, loc) {
    return loc.count().then((n) => {
      if (n === 0) throw new Error(`未找到元素：${locatorCode(spec)}。先 snap 看页面结构再定位`);
      if (n > 1 && spec.nth === undefined) throw new Error(`匹配到 ${n} 个元素：${locatorCode(spec)}。加 --exact、--in-role/--in-name 缩小范围，或用 --nth`);
    });
  }

  async function act(name, args, perform, record) {
    const before = seq;
    curIdx = actions.length;
    await perform();
    actions.push({ name, ...record });
    await settle();
    return `✓ ${name}\nURL: ${page.url()}\n本步触发的接口：\n${apiSince(before)}`;
  }

  const handlers = {
    async status() {
      const initial = opts.path;
      opts.path = null;
      return `探针已启动（环境 ${project.envName}，${opts.headed ? '有界面' : '无界面'}）\nbaseURL: ${project.env.baseURL}\n${loginNote}${initial ? '\n' + (await handlers.goto({ _: [initial] })) : ''}`;
    },
    async goto(a) {
      const target = a._[0] || a.path;
      if (!target) throw new Error('用法：goto <路径或完整URL>');
      return act('goto', a, () => page.goto(target, { waitUntil: 'load' }), { target });
    },
    async snap(a) {
      await settle();
      let tree = await page.locator('body').ariaSnapshot();
      tree = mask(tree);
      if (!a.full && tree.length > SNAP_LIMIT) tree = tree.slice(0, SNAP_LIMIT) + `\n…（已截断，共 ${tree.length} 字符，加 --full 看全部）`;
      const shot = path.join(shotsDir, `${String(++shotNo).padStart(3, '0')}.png`);
      await page.screenshot({ path: shot });
      const out = `URL: ${page.url()}\n标题: ${await page.title()}\n截图: ${shot}\n--- 页面结构（无障碍树）---\n${tree}\n--- 上次 snap 之后的接口请求 ---\n${mask(apiSince(lastSnapSeq))}`;
      lastSnapSeq = seq;
      return out;
    },
    async click(a) {
      const spec = specFromFlags(a);
      const loc = buildLocator(page, spec);
      await resolveOne(spec, loc);
      return act('click', a, () => loc.click({ timeout: 5000 }), { spec });
    },
    async hover(a) {
      const spec = specFromFlags(a);
      const loc = buildLocator(page, spec);
      await resolveOne(spec, loc);
      return act('hover', a, () => loc.hover({ timeout: 5000 }), { spec });
    },
    async check(a) {
      const spec = specFromFlags(a);
      const loc = buildLocator(page, spec);
      await resolveOne(spec, loc);
      return act('check', a, () => loc.check({ timeout: 5000 }), { spec });
    },
    async fill(a) {
      if (a.value === undefined) throw new Error('fill 需要 --value');
      const spec = specFromFlags(a);
      const loc = buildLocator(page, spec);
      await resolveOne(spec, loc);
      return act('fill', a, () => loc.fill(String(a.value), { timeout: 5000 }), { spec, value: String(a.value) });
    },
    async select(a) {
      if (a.value === undefined) throw new Error('select 需要 --value（选项文字或值）');
      const spec = specFromFlags(a);
      const loc = buildLocator(page, spec);
      await resolveOne(spec, loc);
      const value = String(a.value);
      let by = 'label';
      return act('select', a, async () => {
        try {
          await loc.selectOption({ label: value }, { timeout: 3000 });
        } catch {
          by = 'value';
          await loc.selectOption(value, { timeout: 3000 });
        }
      }, { spec, value, get by() { return by; } });
    },
    async press(a) {
      if (!a.key) throw new Error('press 需要 --key，例如 Enter');
      const spec = a.role || a.label || a.placeholder || a.text || a.testid ? specFromFlags(a) : null;
      const loc = spec ? buildLocator(page, spec) : null;
      if (spec) await resolveOne(spec, loc);
      return act('press', a, () => (loc ? loc.press(a.key) : page.keyboard.press(a.key)), { spec, key: a.key });
    },
    async wait(a) {
      const timeout = Number(a.timeout || 10000);
      if (a.text) return act('wait', a, () => page.getByText(String(a.text)).first().waitFor({ timeout }), { text: String(a.text) });
      if (a.url) return act('wait', a, () => page.waitForURL(new RegExp(a.url), { timeout }), { url: String(a.url) });
      if (a.ms) {
        await page.waitForTimeout(Number(a.ms));
        return `✓ 已等待 ${a.ms}ms（不会写入脚本草稿）`;
      }
      throw new Error('用法：wait --text <文字> | --url <正则> | --ms <毫秒>');
    },
    async net(a) {
      let rows = network;
      if (a.path) rows = rows.filter((n) => n.path.includes(a.path));
      if (!a.all) rows = rows.slice(-Number(a.last || 10));
      if (!rows.length) return '（没有接口请求记录）';
      const limit = a.full ? Infinity : BODY_LIMIT;
      const cut = (s) => (s.length > limit ? s.slice(0, limit) + '…' : s);
      return mask(rows.map((n) => `#${n.seq} ${n.method} ${n.path}${n.query} → ${n.status ?? '进行中'}\n  请求体: ${cut(n.reqBody) || '（空）'}\n  响应体: ${cut(n.resBody) || '（空）'}`).join('\n'));
    },
    async shot() {
      const shot = path.join(shotsDir, `${String(++shotNo).padStart(3, '0')}-full.png`);
      await page.screenshot({ path: shot, fullPage: true });
      return `截图: ${shot}`;
    },
    async log() {
      if (!actions.length) return '（还没有操作）';
      return actions.map((x, i) => `${i + 1}. ${actionCode(x) || x.name}`).join('\n');
    },
    async draft(a) {
      return draft(a);
    },
    async 'save-login'(a) {
      if (!a.as) throw new Error('用法：save-login --as <角色名>');
      fs.mkdirSync(project.authDir, { recursive: true });
      const file = path.join(project.authDir, `${a.as}.json`);
      await context.storageState({ path: file });
      return `✓ 登录态已保存：${file}（已在 .gitignore 中，不要提交）`;
    },
    async stop() {
      setTimeout(shutdown, 50);
      return '✓ 探针已关闭';
    },
  };

  function actionCode(x) {
    switch (x.name) {
      case 'goto': return `await page.goto(${quote(x.target)});`;
      case 'click': return `await ${locatorCode(x.spec)}.click();`;
      case 'hover': return `await ${locatorCode(x.spec)}.hover();`;
      case 'check': return `await ${locatorCode(x.spec)}.check();`;
      case 'fill': return `await ${locatorCode(x.spec)}.fill(${quote(x.value)});`;
      case 'select': return x.by === 'label'
        ? `await ${locatorCode(x.spec)}.selectOption({ label: ${quote(x.value)} });`
        : `await ${locatorCode(x.spec)}.selectOption(${quote(x.value)});`;
      case 'press': return x.spec ? `await ${locatorCode(x.spec)}.press(${quote(x.key)});` : `await page.keyboard.press(${quote(x.key)});`;
      case 'wait': return x.text ? `await page.getByText(${quote(x.text)}).first().waitFor();` : `await page.waitForURL(new RegExp(${quote(x.url)}));`;
      default: return null;
    }
  }

  function draft(a) {
    const body = [];
    actions.forEach((x, i) => {
      const stmt = actionCode(x);
      if (!stmt) return;
      const paths = [...new Set(network.filter((n) => n.actionIdx === i).map((n) => n.path))];
      if (!paths.length) {
        body.push(stmt);
        return;
      }
      body.push('await Promise.all([');
      for (const p of paths) body.push(`  page.waitForResponse((r) => r.url().includes(${quote(p)})),`);
      body.push(`  ${stmt.replace(/^await /, '').replace(/;$/, '')},`);
      body.push(']);');
    });
    const id = a.case;
    let importPath = '../../runtime/index';
    if (id) {
      const found = findCase(project.casesDir, id);
      if (!found) throw new Error(`找不到用例 ${id}`);
      importPath = path.relative(found.dir, path.join(project.root, 'runtime', 'index')).split(path.sep).join('/');
      if (!importPath.startsWith('.')) importPath = './' + importPath;
    }
    const code = `import { reach } from '${importPath}';\n\nreach(${quote(id || '<用例id>')}, async ({ page }) => {\n${body.map((l) => '  ' + l).join('\n')}\n});\n`;
    if (id && a.write) {
      const found = findCase(project.casesDir, id);
      const file = path.join(found.dir, 'reach.spec.ts');
      if (fs.existsSync(file) && !a.force) throw new Error(`${file} 已存在，加 --force 覆盖`);
      fs.writeFileSync(file, code);
      return `✓ 已写入 ${file}\n\n${code}`;
    }
    return code;
  }

  let idleTimer;
  const touch = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(shutdown, IDLE_MS);
  };

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      touch();
      const { name, args } = JSON.parse(raw);
      const handler = handlers[name];
      let reply;
      try {
        if (!handler) throw new Error(`未知命令 ${name}`);
        reply = { ok: true, out: await handler(args || {}) };
      } catch (e) {
        reply = { ok: false, out: String(e.message || e).split('\nCall log')[0] };
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reply));
    });
  });

  async function shutdown() {
    fs.rmSync(path.join(sessionDir, 'session.json'), { force: true });
    server.close();
    await browser.close().catch(() => {});
    process.exit(0);
  }

  server.listen(0, '127.0.0.1', () => {
    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify({ port: server.address().port, pid: process.pid }));
    touch();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
