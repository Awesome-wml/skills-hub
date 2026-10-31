// 分诊结论的独立复核（TypeSafe Jev）。纯逻辑，便于用假客户端测试。
// Jev 只看失败现场，不看智能体的结论，避免被结论带偏；比对由代码完成。

export const VERDICT_CRITERIA = {
  UI_CHANGED:
    'The page was redesigned. Decisive evidence: page_url_at_failure is the intended page, and page_structure_at_failure contains an element with the same meaning as the one the script waited for but a different label, text, role or position (for example the script waits for a combobox named "Order status" while the page shows a combobox named "Status"). API responses look normal.',
  PRODUCT_DEFECT:
    'The system produced a wrong business result. Decisive evidence: failed_phase is assert (all script steps completed), and the displayed data or api_calls contradict the expected result in goal, for example records that do not match the requested filter.',
  ENVIRONMENT:
    'A service or infrastructure problem. Decisive evidence: connection refused, DNS or network errors, browser error pages, HTTP 5xx or gateway errors, or the service being unreachable.',
  TEST_DATA:
    'Preconditions on accounts or data were not met. Decisive evidence: page_url_at_failure or page_structure_at_failure shows a login page, an unauthorized or forbidden notice, or an empty state instead of the intended page even though the script navigated to it; or api_calls return 401/403; or records the goal depends on are absent.',
  SCRIPT_BUG:
    'A defect in the test script itself. Decisive evidence: run_stats shows the same test passing in some runs and failing in others against the same page and data, or the script waits with an unrealistically short timeout, or operates an element that the page structure shows was never meant for this step. A single locator timeout on its own is not evidence of a script bug.',
};

export const INSTRUCTIONS =
  'A web end-to-end test failed. Using `goal`, `failed_phase`, `run_stats`, `page_url_at_failure`, `error`, `page_structure_at_failure` and `api_calls`, which cause does the decisive evidence point to?';

// 报错里的调用栈含本机绝对路径，既无助判断也不该外发；接口路径之类不带扩展名的保留。
export const stripStack = (s) =>
  String(s ?? '')
    .split('\n')
    .filter((l) => !/^\s*at\s(.*[\s(])?(\/|file:|[A-Za-z]:\\)/.test(l))
    .join('\n')
    .replace(/(?<![\w.:/])\/(?:[^\s'"():/]+\/)+([^\s'"():/]+\.\w+)/g, '…/$1');

export const CONFIDENCE_FLOOR = 0.6;

const PHASE_TEXT = {
  setup: 'setup: preparing login state or test data, before any page step',
  reach: 'reach: while the script was navigating and operating the page',
  assert: 'assert: after all script steps completed, while checking the expected business result',
};

const cut = (s, n) => {
  const t = String(s ?? '');
  return t.length > n ? `${t.slice(0, n)}…[truncated]` : t;
};

/** 组装发给 Jev 的状态：只含脱敏后的失败摘要，不含截图、登录态与完整响应。 */
export function buildState(failure, mask) {
  return {
    goal: mask(cut(failure.intent?.goal || failure.title, 600)),
    failed_phase: PHASE_TEXT[failure.meta?.phase] || 'unknown',
    run_stats: `${failure.failed} of ${failure.total} runs failed`,
    page_url_at_failure: mask(cut(failure.meta?.url || 'unknown', 300)),
    error: mask(cut(stripStack(failure.error), 1500)),
    page_structure_at_failure: mask(cut(failure.pageStructure || '(none)', 3000)),
    api_calls: (failure.network || []).slice(-8).map((n) => mask(cut(`${n.method} ${n.path}${n.query || ''} -> ${n.status ?? 'no response'} | ${n.body || ''}`, 400))),
  };
}

/** 比对智能体结论与 Jev 结论，给出处置建议。 */
export function decide(agentVerdict, answer) {
  const { choice, confidence } = answer;
  let agreement;
  if (confidence < CONFIDENCE_FLOOR) agreement = 'uncertain';
  else if (choice === agentVerdict) agreement = 'agree';
  else agreement = 'conflict';
  const action = {
    agree: '两边一致，按原结论处理',
    uncertain: 'Jev 没有把握，不影响原结论',
    conflict: '两边结论冲突，需要人确认后再处理（不自动修复、不自动报缺陷）',
  }[agreement];
  return { agreement, needsHumanReview: agreement === 'conflict', action };
}

/** 调用 Jev 一次 Choice。返回 { choice, confidence, probabilities, model }。 */
export async function askJev(client, state) {
  const payload = await client.systemOne({
    state,
    questions: { cause: { type: 'choice', instructions: INSTRUCTIONS, criteria: VERDICT_CRITERIA } },
  });
  const a = payload.answers?.cause;
  if (!a || typeof a.choice !== 'string' || typeof a.confidence !== 'number') {
    throw Object.assign(new Error('Jev 返回缺少 choice/confidence'), { code: 'invalid_response' });
  }
  return { choice: a.choice, confidence: a.confidence, probabilities: a.probabilities || {}, model: payload.model || null };
}
