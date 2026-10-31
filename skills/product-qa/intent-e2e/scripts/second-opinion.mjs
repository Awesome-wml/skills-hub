#!/usr/bin/env node
// 用 TypeSafe Jev 独立复核一条分诊结论，结果写回 <e2e>/runs/triage/<id>.verdict.json 的 secondOpinion 字段。
//   node <技能>/scripts/second-opinion.mjs --case <id>
// 默认关闭：需在 e2e.config.yaml 设置 secondOpinion.enabled: true，且当前环境不是 aiData: forbidden。
// 外发内容：脱敏后的失败摘要（目标、失败阶段、报错、页面结构、接口摘要），已截断；不发截图、登录态。
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, parseArgs, fail } from './lib/project.mjs';
import { collectFailures } from './lib/failures.mjs';
import { buildState, askJev, decide } from './lib/second-opinion.mjs';
import { loadTypeSafeConfig, createTypeSafeClient } from './vendor/typesafe.mjs';

const { flags } = parseArgs(process.argv.slice(2));
if (!flags.case) fail('用法：second-opinion.mjs --case <用例id>');
const project = loadProject({ env: flags.env });
const verdictFile = path.join(project.root, 'runs', 'triage', `${flags.case}.verdict.json`);
if (!fs.existsSync(verdictFile)) fail(`先完成分诊并写出 ${verdictFile}，再做复核`);
const verdict = JSON.parse(fs.readFileSync(verdictFile, 'utf8'));

function save(secondOpinion, message) {
  verdict.secondOpinion = { ...secondOpinion, at: new Date().toISOString() };
  fs.writeFileSync(verdictFile, JSON.stringify(verdict, null, 2) + '\n');
  console.log(message);
}

if (project.config.secondOpinion?.enabled !== true) {
  save({ status: 'disabled' }, '- Jev 复核未开启（e2e.config.yaml 中 secondOpinion.enabled 不为 true），跳过');
  process.exit(0);
}
if (project.env.aiData === 'forbidden') {
  save({ status: 'blocked', reason: 'aiData_forbidden' }, `- 环境 ${project.envName} 声明了 aiData: forbidden，不外发，跳过复核`);
  process.exit(0);
}
const config = loadTypeSafeConfig();
if (!config) {
  save({ status: 'unavailable', reason: 'no_key' }, '! 未读到 TYPESAFE_API_KEY，跳过复核（命令前加 zsh -ic 加载 ~/.zshrc，或在 CI 中配置该环境变量）');
  process.exit(0);
}

const collected = collectFailures(project, flags.case);
const failure = collected?.failures[0];
if (!failure) fail(`最近一次回归报告里没有用例 ${flags.case} 的失败记录`);

const state = buildState(failure, project.mask);
try {
  const answer = await askJev(createTypeSafeClient({ config, timeoutMs: 20_000 }), state);
  const result = decide(verdict.verdict, answer);
  const top = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v.toFixed(2)}`).join('，');
  save(
    { status: 'done', model: answer.model, choice: answer.choice, confidence: answer.confidence, probabilities: answer.probabilities, ...result, sentFields: Object.keys(state) },
    `${result.agreement === 'conflict' ? '!' : '✓'} 智能体结论 ${verdict.verdict}｜Jev 结论 ${answer.choice}（置信度 ${answer.confidence.toFixed(2)}；${top}）\n  → ${result.action}`,
  );
} catch (e) {
  save({ status: 'unavailable', reason: e.code || 'error', httpStatus: e.status ?? null }, `! Jev 调用失败（${e.code || 'error'}${e.status ? ' HTTP ' + e.status : ''}），复核跳过，不影响原结论`);
}
