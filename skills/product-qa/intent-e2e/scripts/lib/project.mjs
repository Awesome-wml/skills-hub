import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';

const CONFIG_NAME = 'e2e.config.yaml';

/** 从 cwd 向上查找测试根目录（含 e2e.config.yaml 的目录）。E2E_ROOT 可显式指定。 */
export function findRoot(start = process.cwd()) {
  if (process.env.E2E_ROOT) {
    const root = path.resolve(process.env.E2E_ROOT);
    if (!fs.existsSync(path.join(root, CONFIG_NAME))) fail(`E2E_ROOT=${root} 下没有 ${CONFIG_NAME}`);
    return root;
  }
  let dir = path.resolve(start);
  for (;;) {
    for (const candidate of [dir, path.join(dir, 'e2e')]) {
      if (fs.existsSync(path.join(candidate, CONFIG_NAME))) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) fail(`找不到 ${CONFIG_NAME}。先在项目根目录执行 init。`);
    dir = parent;
  }
}

export function loadProject(opts = {}) {
  const root = findRoot(opts.cwd);
  const config = YAML.parse(fs.readFileSync(path.join(root, CONFIG_NAME), 'utf8')) || {};
  const envName = opts.env || process.env.E2E_ENV || config.defaultEnv;
  const env = config.environments?.[envName];
  if (!env) fail(`环境 "${envName}" 未在 ${CONFIG_NAME} 的 environments 中声明`);
  return {
    root,
    projectDir: path.dirname(root),
    config,
    envName,
    env,
    casesDir: path.join(root, config.casesDir || 'cases'),
    authDir: path.join(root, '.auth'),
    mask: buildMasker(config.mask),
  };
}

export function buildMasker(rules = []) {
  const compiled = rules.map((r) => ({ re: new RegExp(r.pattern, 'g'), replace: r.replace ?? '<已脱敏>' }));
  return (text) => compiled.reduce((s, r) => s.replace(r.re, r.replace), String(text));
}

/** 优先使用被测项目自己的 Playwright，保证探针与回归运行时是同一个引擎版本。 */
export function loadPlaywright(projectDir) {
  const tries = [
    [createRequire(path.join(projectDir, 'package.json')), 'playwright'],
    [createRequire(path.join(projectDir, 'package.json')), '@playwright/test'],
    [createRequire(import.meta.url), 'playwright'],
  ];
  for (const [req, name] of tries) {
    try {
      return req(name);
    } catch {
      /* 继续尝试下一个 */
    }
  }
  fail('找不到 Playwright。在被测项目中安装：npm i -D playwright（或 @playwright/test）并执行 npx playwright install chromium');
}

/** 按 id 查找用例目录（cases/<任意层级>/intent.yaml 中 id 匹配）。 */
export function findCase(casesDir, id) {
  for (const dir of walkCaseDirs(casesDir)) {
    const intent = YAML.parse(fs.readFileSync(path.join(dir, 'intent.yaml'), 'utf8'));
    if (intent?.id === id) return { dir, intent };
  }
  return null;
}

export function* walkCaseDirs(dir) {
  if (!fs.existsSync(dir)) return;
  if (fs.existsSync(path.join(dir, 'intent.yaml'))) yield dir;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) yield* walkCaseDirs(path.join(dir, entry.name));
  }
}

/** 调用项目实现的 Fixture（协议见 reference/fixture-protocol.md）。未配置返回 null。 */
export function callFixture(project, action, payload) {
  const command = project.config.fixture?.command;
  if (!command) return null;
  const res = spawnSync(command, {
    shell: true,
    cwd: project.projectDir,
    input: JSON.stringify({ action, env: project.envName, ...payload }),
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (res.status !== 0) throw new Error(`Fixture ${action} 失败（退出码 ${res.status}）：${(res.stderr || '').trim()}`);
  return JSON.parse(res.stdout);
}

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[key] = true;
      else {
        flags[key] = next;
        i++;
      }
    } else positional.push(a);
  }
  return { positional, flags };
}

export function fail(msg, code = 1) {
  console.error(`✗ ${msg}`);
  process.exit(code);
}
