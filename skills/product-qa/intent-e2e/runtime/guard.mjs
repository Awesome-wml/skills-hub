#!/usr/bin/env node
// 红线守卫。CI 必须执行 `node <e2e目录>/runtime/guard.mjs check`。
//   check            校验全部用例：意图/断言格式、脚本内无断言、断言与 assert.lock 一致
//   approve [id...]  人批准断言（仅限交互式终端），更新 assert.lock
//   verdict <file>   校验分诊结论格式
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = YAML.parse(fs.readFileSync(path.join(ROOT, 'e2e.config.yaml'), 'utf8')) || {};
const CASES = path.join(ROOT, CONFIG.casesDir || 'cases');
const LOCK = path.join(ROOT, 'assert.lock');

const TARGETS = ['web', 'api', 'miniprogram'];
const UI_CHECKS = {
  url_matches: ['pattern'],
  text_visible: ['text'],
  text_absent: ['text'],
  all_rows_text: ['column'],
  row_count: [],
};
const VERDICTS = ['UI_CHANGED', 'PRODUCT_DEFECT', 'ENVIRONMENT', 'TEST_DATA', 'SCRIPT_BUG'];
const EVIDENCE_TYPES = ['trace', 'screenshot', 'api_response', 'page_structure', 'log', 'probe'];

const [cmd = 'check', ...rest] = process.argv.slice(2);
const commands = { check, approve, verdict };
if (!commands[cmd]) {
  console.error(`未知命令 ${cmd}，可用：check | approve [id...] | verdict <file>`);
  process.exit(2);
}
await commands[cmd](rest);

function* caseDirs(dir) {
  if (!fs.existsSync(dir)) return;
  if (fs.existsSync(path.join(dir, 'intent.yaml'))) yield dir;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && !e.name.startsWith('.')) yield* caseDirs(path.join(dir, e.name));
  }
}

function readLock() {
  return fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : {};
}

function hashAssert(file) {
  const normalized = JSON.stringify(YAML.parse(fs.readFileSync(file, 'utf8')));
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function loadCases() {
  return [...caseDirs(CASES)].map((dir) => {
    const rel = path.relative(ROOT, dir);
    let intent;
    try {
      intent = YAML.parse(fs.readFileSync(path.join(dir, 'intent.yaml'), 'utf8')) || {};
    } catch (e) {
      intent = { __error: e.message };
    }
    return { dir, rel, intent, id: intent.id };
  });
}

function validateIntent(c, errors) {
  const i = c.intent;
  if (i.__error) return errors.push(`${c.rel}/intent.yaml 解析失败：${i.__error}`);
  if (!i.id) errors.push(`${c.rel}/intent.yaml 缺少 id`);
  if (!i.title) errors.push(`${c.rel}/intent.yaml 缺少 title`);
  if (!i.goal) errors.push(`${c.rel}/intent.yaml 缺少 goal（业务目标）`);
  if (i.target && !TARGETS.includes(i.target)) errors.push(`${c.rel}/intent.yaml 的 target 只能是 ${TARGETS.join('/')}`);
  const se = i.constraints?.sideEffect;
  if (se && !['none', 'write'].includes(se)) errors.push(`${c.rel}/intent.yaml 的 constraints.sideEffect 只能是 none/write`);
}

function validateAsserts(c, errors) {
  const file = path.join(c.dir, 'assert.yaml');
  if (!fs.existsSync(file)) return errors.push(`${c.rel} 缺少 assert.yaml（断言必须由人定义）`);
  let list;
  try {
    list = YAML.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return errors.push(`${c.rel}/assert.yaml 解析失败：${e.message}`);
  }
  if (!Array.isArray(list) || !list.length) return errors.push(`${c.rel}/assert.yaml 必须是非空列表`);
  list.forEach((a, n) => {
    const at = `${c.rel}/assert.yaml 第 ${n + 1} 条`;
    if (!a?.name) errors.push(`${at} 缺少 name`);
    if (a?.type === 'ui') {
      const required = UI_CHECKS[a.check];
      if (!required) return errors.push(`${at} 的 check 不支持：${a.check}`);
      for (const k of required) if (a[k] === undefined) errors.push(`${at} 缺少 ${k}`);
      if (a.check === 'all_rows_text' && a.equals === undefined && a.contains === undefined) errors.push(`${at} 需要 equals 或 contains`);
    } else if (a?.type === 'api') {
      if (!a.match?.path) errors.push(`${at} 缺少 match.path`);
      if (!a.expect || !Object.keys(a.expect).length) errors.push(`${at} 缺少 expect`);
    } else errors.push(`${at} 的 type 只能是 ui 或 api`);
  });
}

function validateScript(c, errors, warnings) {
  const file = path.join(c.dir, 'reach.spec.ts');
  if (!fs.existsSync(file)) return warnings.push(`${c.rel} 还没有生成 reach.spec.ts`);
  const src = fs.readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  if (/\bexpect\s*[.(]/.test(src) || /import\s*{[^}]*\bexpect\b/.test(src)) errors.push(`${c.rel}/reach.spec.ts 含有断言（expect）：判定只能写在 assert.yaml`);
  if (/\btest\s*[.(]/.test(src)) errors.push(`${c.rel}/reach.spec.ts 直接使用了 test：必须通过 reach() 定义用例`);
  if (/\.locator\(\s*['"`](\/\/|xpath=|css=|\.|#)/.test(src)) errors.push(`${c.rel}/reach.spec.ts 使用了 CSS/XPath 定位：改用 getByRole / getByLabel / getByText`);
  const m = src.match(/reach\(\s*['"`]([^'"`]+)['"`]/);
  if (!m) errors.push(`${c.rel}/reach.spec.ts 没有调用 reach('<id>', ...)`);
  else if (c.id && m[1] !== c.id) errors.push(`${c.rel}/reach.spec.ts 的 reach id「${m[1]}」与 intent.yaml 的 id「${c.id}」不一致`);
}

async function check() {
  const errors = [];
  const warnings = [];
  const lock = readLock();
  const cases = loadCases();
  const ids = new Map();
  for (const c of cases) {
    validateIntent(c, errors);
    if (c.id) {
      if (ids.has(c.id)) errors.push(`用例 id 重复：${c.id}（${ids.get(c.id)} 与 ${c.rel}）`);
      ids.set(c.id, c.rel);
    }
    validateAsserts(c, errors);
    validateScript(c, errors, warnings);
    const assertFile = path.join(c.dir, 'assert.yaml');
    if (c.id && fs.existsSync(assertFile)) {
      const h = (() => { try { return hashAssert(assertFile); } catch { return null; } })();
      if (!lock[c.id]) errors.push(`${c.rel} 的断言尚未经人批准（执行 guard approve ${c.id}）`);
      else if (h && lock[c.id] !== h) errors.push(`${c.rel} 的断言在批准后被修改过（与 assert.lock 不一致）`);
    }
    if (fs.existsSync(path.join(c.dir, 'assert.draft.yaml'))) warnings.push(`${c.rel} 有待人确认的断言草稿 assert.draft.yaml`);
  }
  for (const id of Object.keys(lock)) if (!ids.has(id)) warnings.push(`assert.lock 中的 ${id} 已没有对应用例`);
  for (const w of warnings) console.log(`! ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    console.error(`\n守卫未通过：${errors.length} 个问题`);
    process.exit(1);
  }
  console.log(`✓ 守卫通过：${cases.length} 个用例`);
}

async function approve(ids) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('✗ approve 只能由人在交互式终端中执行（智能体不得批准断言）');
    process.exit(1);
  }
  const lock = readLock();
  const cases = loadCases().filter((c) => c.id && (!ids.length || ids.includes(c.id)));
  const changed = cases.filter((c) => {
    const f = path.join(c.dir, 'assert.yaml');
    return fs.existsSync(f) && lock[c.id] !== hashAssert(f);
  });
  if (!changed.length) return console.log('没有需要批准的断言变更');
  for (const c of changed) {
    console.log(`\n── ${c.id}（${c.rel}/assert.yaml）${lock[c.id] ? '已修改' : '新增'} ──`);
    console.log(fs.readFileSync(path.join(c.dir, 'assert.yaml'), 'utf8'));
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`确认以上 ${changed.length} 个用例的断言符合业务要求？输入 yes 批准：`).catch(() => '');
  rl.close();
  if (answer.trim() !== 'yes') return console.log('未批准');
  for (const c of changed) lock[c.id] = hashAssert(path.join(c.dir, 'assert.yaml'));
  fs.writeFileSync(LOCK, JSON.stringify(Object.fromEntries(Object.entries(lock).sort()), null, 2) + '\n');
  console.log(`✓ 已批准并更新 ${path.relative(process.cwd(), LOCK)}，请一并提交`);
}

async function verdict([file]) {
  if (!file) {
    console.error('用法：guard verdict <verdict.json>');
    process.exit(2);
  }
  const v = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];
  if (!v.caseId) errors.push('缺少 caseId');
  if (!VERDICTS.includes(v.verdict)) errors.push(`verdict 只能是 ${VERDICTS.join(' / ')}`);
  if (typeof v.confidence !== 'number' || v.confidence < 0 || v.confidence > 1) errors.push('confidence 必须是 0~1 的数字');
  if (!v.summary) errors.push('缺少 summary（一句话结论）');
  if (!Array.isArray(v.evidence) || !v.evidence.length) errors.push('evidence 不能为空：结论必须有证据');
  else v.evidence.forEach((e, i) => {
    if (!EVIDENCE_TYPES.includes(e.type)) errors.push(`evidence[${i}].type 只能是 ${EVIDENCE_TYPES.join(' / ')}`);
    if (!e.ref) errors.push(`evidence[${i}] 缺少 ref（文件路径或接口）`);
    if (!e.note) errors.push(`evidence[${i}] 缺少 note（这条证据说明了什么）`);
  });
  if (v.verdict === 'PRODUCT_DEFECT' && !v.reachConfirmed) errors.push('判为 PRODUCT_DEFECT 时必须设置 reachConfirmed: true（已确认脚本确实到达了目标状态）');
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }
  console.log(`✓ 分诊结论格式正确：${v.caseId} → ${v.verdict}（置信度 ${v.confidence}）`);
}
