#!/usr/bin/env node
// 把最近一次回归的失败现场压缩成智能体可读的分诊材料。
//   node <技能>/scripts/pack-failure.mjs [--case <id>]
// 输出写到 <e2e>/runs/triage/<id>.md，并打印到标准输出。
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, parseArgs, fail } from './lib/project.mjs';
import { collectFailures } from './lib/failures.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const project = loadProject({ env: flags.env });
const collected = collectFailures(project, flags.case);
if (!collected) fail('没有回归报告：先执行 npm run e2e:run');
const triageDir = path.join(project.root, 'runs', 'triage');
fs.mkdirSync(triageDir, { recursive: true });

const { failures } = collected;
if (!failures.length) {
  console.log(collected.cases ? `✓ 没有失败用例（共 ${collected.cases} 个）` : '报告中没有匹配的用例');
  process.exit(0);
}

const clip = (s, n, ref) => (s && s.length > n ? s.slice(0, n) + `\n…（已截断，完整内容见 ${ref}）` : s);
const HINTS = {
  setup: '失败在「准备」阶段（登录态 / 造数）：优先考虑 ENVIRONMENT 或 TEST_DATA',
  reach: '失败在「到达」阶段：脚本没能走到目标状态。优先考虑 UI_CHANGED（页面改版）或 SCRIPT_BUG，也可能是 ENVIRONMENT（接口报错 / 超时）',
  assert: '失败在「判定」阶段：脚本已走完。先确认确实到达了目标状态，若是则倾向 PRODUCT_DEFECT',
};

for (const f of failures) {
  const { meta, attachments: att } = f;
  const flaky = f.failed < f.total ? `\n> ⚠ 同一用例 ${f.total} 次执行中 ${f.failed} 次失败：存在偶发，考虑 SCRIPT_BUG（等待不足）或 ENVIRONMENT。` : '';
  const md = `# 分诊材料：${f.title}

- 用例目录：${meta.caseDir || '未知'}
- 失败阶段：**${meta.phase || '未知'}**${meta.failedAssert ? `（首个失败断言：${meta.failedAssert}）` : ''}
- 失败时 URL：${meta.url || '未知'}
- 执行次数：${f.total}，失败 ${f.failed}
- 提示：${HINTS[meta.phase] || '未记录阶段（可能是超时或运行时异常），按报错判断'}${flaky}

## 报错
\`\`\`
${f.error.slice(0, 3000)}
\`\`\`

## 失败时的页面结构（无障碍树）
\`\`\`
${clip(f.pageStructure, 4000, att['page-structure.txt']) || '（无）'}
\`\`\`

## 流程中的接口
${f.network.length ? f.network.slice(-15).map((n) => `- ${n.method} ${n.path}${n.query} → ${n.status ?? '无响应'}｜${(n.body || '').slice(0, 300).replace(/\n/g, ' ')}`).join('\n') : '（无）'}

## 原始证据
- 截图：${att.screenshot || '（无）'}
- 录屏：${att.video || '（无）'}
- 操作轨迹：${att.trace || '（无）'}${att.trace ? `（查看：npx playwright show-trace ${att.trace}）` : ''}
- 完整接口记录：${att['network.json'] || '（无）'}

## 结论写到
${path.join(triageDir, `${f.id}.verdict.json`)}（格式见 workflows/triage.md，写完执行 guard verdict 校验）
`;
  fs.writeFileSync(path.join(triageDir, `${f.id}.md`), md);
  console.log(md);
}
console.log(`\n共 ${failures.length} 个失败用例，分诊材料在 ${triageDir}`);
