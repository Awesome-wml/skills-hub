import assert from 'node:assert/strict';
import test from 'node:test';
import { buildState, decide, askJev, stripStack, VERDICT_CRITERIA, CONFIDENCE_FLOOR } from './second-opinion.mjs';

const failure = {
  title: 'order-list-filter｜订单列表筛选',
  intent: { goal: '筛选已完成订单，联系人 13812345678' },
  meta: { phase: 'reach' },
  total: 3,
  failed: 1,
  error: 'x'.repeat(5000),
  pageStructure: '- button "搜索"',
  network: Array.from({ length: 12 }, (_, i) => ({ method: 'POST', path: `/api/${i}`, query: '', status: 200, body: '{"phone":"13812345678"}' })),
};
const mask = (s) => String(s).replace(/1[3-9]\d{9}/g, '<手机号>');

test('buildState 脱敏、截断，且不包含智能体结论', () => {
  const s = buildState(failure, mask);
  assert.equal(s.goal.includes('13812345678'), false);
  assert.ok(s.error.length < 1600);
  assert.equal(s.api_calls.length, 8);
  assert.ok(s.api_calls.every((c) => !c.includes('13812345678')));
  assert.equal(s.run_stats, '1 of 3 runs failed');
  assert.match(s.failed_phase, /^reach/);
  assert.equal(JSON.stringify(s).includes('UI_CHANGED'), false);
});

test('stripStack 去掉本机路径与调用栈，保留接口路径和网址', () => {
  const raw = [
    "TimeoutError: waiting for getByRole('combobox')",
    "> 11 |   await page.waitForResponse((r) => r.url().includes('/api/order/page'));",
    'navigated to "http://127.0.0.1:5312/static/app.js"',
    'see /Users/me/proj/e2e/cases/x/reach.spec.ts:8:54',
    '    at /Users/me/proj/e2e/runtime/index.ts:55:7',
    '    at async file:///Users/me/proj/e2e/runtime/index.ts:40:3',
    '    at callFixture (/Users/me/proj/e2e/runtime/project.ts:12:9)',
  ].join('\n');
  const out = stripStack(raw);
  assert.equal(out.includes('/Users'), false);
  assert.ok(out.includes("'/api/order/page'"));
  assert.ok(out.includes('http://127.0.0.1:5312/static/app.js'));
  assert.ok(out.includes('…/reach.spec.ts:8:54'));
});

test('decide：一致 / 冲突 / 不确定', () => {
  assert.equal(decide('UI_CHANGED', { choice: 'UI_CHANGED', confidence: 0.9 }).agreement, 'agree');
  const conflict = decide('PRODUCT_DEFECT', { choice: 'UI_CHANGED', confidence: 0.8 });
  assert.equal(conflict.agreement, 'conflict');
  assert.equal(conflict.needsHumanReview, true);
  const unsure = decide('PRODUCT_DEFECT', { choice: 'UI_CHANGED', confidence: CONFIDENCE_FLOOR - 0.01 });
  assert.equal(unsure.agreement, 'uncertain');
  assert.equal(unsure.needsHumanReview, false);
});

test('askJev 发出五选一 Choice 并解析答案', async () => {
  let sent;
  const client = {
    systemOne: async (req) => {
      sent = req;
      return { model: 'jev-test', answers: { cause: { type: 'choice', choice: 'ENVIRONMENT', confidence: 0.7, probabilities: { ENVIRONMENT: 0.8 } } } };
    },
  };
  const a = await askJev(client, { goal: 'g' });
  assert.equal(sent.questions.cause.type, 'choice');
  assert.deepEqual(Object.keys(sent.questions.cause.criteria), Object.keys(VERDICT_CRITERIA));
  assert.deepEqual(a, { choice: 'ENVIRONMENT', confidence: 0.7, probabilities: { ENVIRONMENT: 0.8 }, model: 'jev-test' });
});

test('askJev 遇到缺字段的响应抛 invalid_response', async () => {
  const client = { systemOne: async () => ({ answers: {} }) };
  await assert.rejects(askJev(client, {}), (e) => e.code === 'invalid_response');
});
