import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';

export type Env = { baseURL: string; allowWrite?: boolean; aiData?: 'allowed' | 'forbidden' };
export type Project = {
  root: string;
  projectDir: string;
  config: any;
  envName: string;
  env: Env;
  casesDir: string;
  authDir: string;
  runsDir: string;
  mask: (s: string) => string;
};

const CONFIG_NAME = 'e2e.config.yaml';

export function findRoot(): string {
  if (process.env.E2E_ROOT) return path.resolve(process.env.E2E_ROOT);
  let dir = process.cwd();
  for (;;) {
    for (const candidate of [dir, path.join(dir, 'e2e')]) {
      if (fs.existsSync(path.join(candidate, CONFIG_NAME))) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`找不到 ${CONFIG_NAME}：请在被测项目根目录运行，或设置 E2E_ROOT`);
    dir = parent;
  }
}

let cached: Project | undefined;

export function loadProject(): Project {
  if (cached) return cached;
  const root = findRoot();
  process.env.E2E_ROOT = root;
  const config = YAML.parse(fs.readFileSync(path.join(root, CONFIG_NAME), 'utf8')) || {};
  const envName = process.env.E2E_ENV || config.defaultEnv;
  const env = config.environments?.[envName];
  if (!env) throw new Error(`环境 "${envName}" 未在 ${CONFIG_NAME} 中声明`);
  const rules = (config.mask || []).map((r: any) => ({ re: new RegExp(r.pattern, 'g'), replace: r.replace ?? '<已脱敏>' }));
  cached = {
    root,
    projectDir: path.dirname(root),
    config,
    envName,
    env,
    casesDir: path.join(root, config.casesDir || 'cases'),
    authDir: path.join(root, '.auth'),
    runsDir: path.join(root, 'runs'),
    mask: (s: string) => rules.reduce((acc: string, r: any) => acc.replace(r.re, r.replace), String(s)),
  };
  return cached;
}

export type Case = { dir: string; intent: any; asserts: any[] };

export function findCase(project: Project, id: string): Case {
  const stack = [project.casesDir];
  while (stack.length) {
    const dir = stack.pop()!;
    if (!fs.existsSync(dir)) continue;
    const intentFile = path.join(dir, 'intent.yaml');
    if (fs.existsSync(intentFile)) {
      const intent = YAML.parse(fs.readFileSync(intentFile, 'utf8'));
      if (intent?.id === id) {
        let assertFile = path.join(dir, 'assert.yaml');
        let draft = false;
        // 草稿预演：只给人确认断言前看效果用，结果不算回归。必须显式 E2E_DRAFT=1，CI 不会设
        if (!fs.existsSync(assertFile) && process.env.E2E_DRAFT === '1' && fs.existsSync(path.join(dir, 'assert.draft.yaml'))) {
          assertFile = path.join(dir, 'assert.draft.yaml');
          draft = true;
        }
        if (!fs.existsSync(assertFile)) throw new Error(`用例 ${id} 缺少 assert.yaml：没有人定义的断言，用例不能运行`);
        const asserts = YAML.parse(fs.readFileSync(assertFile, 'utf8')) || [];
        if (!Array.isArray(asserts) || !asserts.length) throw new Error(`用例 ${id} 的 ${path.basename(assertFile)} 为空`);
        return { dir, intent: draft ? { ...intent, title: `[草稿] ${intent.title || ''}` } : intent, asserts };
      }
    }
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && !e.name.startsWith('.')) stack.push(path.join(dir, e.name));
    }
  }
  throw new Error(`找不到 id 为 ${id} 的用例（cases 下的 intent.yaml）`);
}

/** 调用项目实现的 Fixture 程序：标准输入传 JSON，标准输出返回 JSON。未配置时返回 null。 */
export function callFixture(project: Project, action: string, payload: Record<string, unknown>): any {
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
  try {
    return JSON.parse(res.stdout);
  } catch {
    throw new Error(`Fixture ${action} 输出不是 JSON：${res.stdout.slice(0, 300)}`);
  }
}

/** 登录态：优先由 Fixture 签发；否则使用人工保存的 .auth/<role>.json。 */
export function resolveLogin(project: Project, role: string, target: string): string {
  const file = path.join(project.authDir, `${role}.json`);
  const issued = callFixture(project, 'login', { role, target });
  if (issued) {
    fs.mkdirSync(project.authDir, { recursive: true });
    if (typeof issued.storageState === 'string') return path.resolve(project.projectDir, issued.storageState);
    fs.writeFileSync(file, JSON.stringify(issued.storageState));
    return file;
  }
  return file;
}
