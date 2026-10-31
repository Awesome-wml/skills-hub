#!/usr/bin/env node
// 把回归运行时装进被测项目。在被测项目根目录（有 package.json）执行。
//   node <技能>/scripts/init.mjs [--dir e2e] [--base-url http://...] [--env local] [--upgrade]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs, fail } from './lib/project.mjs';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { flags } = parseArgs(process.argv.slice(2));
const projectDir = process.cwd();
const dirName = String(flags.dir || 'e2e');
const root = path.join(projectDir, dirName);
const pkgFile = path.join(projectDir, 'package.json');
if (!fs.existsSync(pkgFile)) fail('当前目录没有 package.json：请在被测项目根目录执行（纯后端项目可先 npm init -y 建一个测试用 package.json）');

const req = createRequire(pkgFile);
const has = (m) => { try { req.resolve(`${m}/package.json`); return true; } catch { return false; } };
const pwModule = has('playwright') ? 'playwright/test' : has('@playwright/test') ? '@playwright/test' : null;
const notes = [];

// 1. 运行时
const runtimeDir = path.join(root, 'runtime');
if (fs.existsSync(runtimeDir) && !flags.upgrade) fail(`${runtimeDir} 已存在。升级运行时请加 --upgrade`);
fs.rmSync(runtimeDir, { recursive: true, force: true });
fs.cpSync(path.join(SKILL, 'runtime'), runtimeDir, { recursive: true });
const pwTs = path.join(runtimeDir, 'pw.ts');
fs.writeFileSync(pwTs, fs.readFileSync(pwTs, 'utf8').replaceAll("'playwright/test'", `'${pwModule || 'playwright/test'}'`));
const version = fs.readFileSync(path.join(runtimeDir, 'VERSION'), 'utf8').trim();

// 2. 配置
const configFile = path.join(root, 'e2e.config.yaml');
if (!fs.existsSync(configFile)) {
  const envName = String(flags.env || 'local');
  const baseURL = String(flags['base-url'] || 'http://127.0.0.1:3000');
  fs.writeFileSync(configFile, `# intent-e2e 配置。字段说明见技能 reference/asset-format.md
casesDir: cases
defaultEnv: ${envName}
environments:
  ${envName}:
    baseURL: ${baseURL}
    allowWrite: false    # true 才允许执行 sideEffect: write 的用例
    aiData: allowed      # forbidden 时探针拒绝把页面内容交给智能体
# 可选：浏览器通道。chromium=完整版 Chromium 的新无头模式；chrome=本机 Chrome
# browser:
#   channel: chromium
# 输出给智能体与失败证据前的脱敏规则
mask:
  - { pattern: "1[3-9]\\\\d{9}", replace: "<手机号>" }
  - { pattern: "\\\\d{17}[\\\\dXx]", replace: "<身份证>" }
# 可选：项目实现的 Fixture 程序（登录态 / 造数 / 清理），协议见 reference/fixture-protocol.md
# fixture:
#   command: node e2e/fixture/index.mjs
# 可选：分诊结论交 TypeSafe Jev 独立复核。会把脱敏后的失败摘要（目标、阶段、报错、页面结构、
# 接口摘要）发给 TypeSafe；需本机已设置 TYPESAFE_API_KEY。aiData: forbidden 的环境始终不发。
# secondOpinion:
#   enabled: true
`);
  notes.push(`已生成 ${path.relative(projectDir, configFile)}，请核对 baseURL 与环境声明`);
}
const pwConfig = path.join(root, 'playwright.config.ts');
if (!fs.existsSync(pwConfig)) {
  fs.writeFileSync(pwConfig, `import { defineConfig } from '${pwModule || 'playwright/test'}';\nimport { e2eConfig } from './runtime/config';\n\nexport default defineConfig(e2eConfig() as any);\n`);
}
fs.mkdirSync(path.join(root, 'cases'), { recursive: true });

// 3. .gitignore
const gi = path.join(projectDir, '.gitignore');
const ignoreLines = [`${dirName}/.auth/`, `${dirName}/runs/`, `${dirName}/.probe/`];
const current = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
const missing = ignoreLines.filter((l) => !current.split('\n').includes(l));
if (missing.length) fs.appendFileSync(gi, `${current.endsWith('\n') || !current ? '' : '\n'}# intent-e2e\n${missing.join('\n')}\n`);

// 4. package.json 脚本
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
pkg.scripts ||= {};
pkg.scripts['e2e:run'] ||= `playwright test -c ${dirName}/playwright.config.ts`;
pkg.scripts['e2e:guard'] ||= `node ${dirName}/runtime/guard.mjs check`;
pkg.scripts['e2e:approve'] ||= `node ${dirName}/runtime/guard.mjs approve`;
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');

// 5. 依赖检查
const deps = [];
if (!pwModule) deps.push('playwright');
if (!has('yaml')) deps.push('yaml');

console.log(`✓ 运行时 v${version} 已安装到 ${path.relative(projectDir, runtimeDir)}`);
console.log('✓ package.json 脚本：e2e:run / e2e:guard / e2e:approve');
for (const n of notes) console.log(`✓ ${n}`);
if (deps.length) console.log(`! 缺少依赖，执行：npm i -D ${deps.join(' ')} && npx playwright install chromium`);
console.log(`\n建议在代码托管平台把 ${dirName}/cases/**/assert.yaml 与 ${dirName}/assert.lock 设为必须人审（CODEOWNERS），并在 CI 中执行 npm run e2e:guard。`);
