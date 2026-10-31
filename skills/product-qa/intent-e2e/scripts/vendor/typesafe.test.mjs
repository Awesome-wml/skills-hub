// 复制自 ~/AiProject/shared/typesafe/js/typesafe.test.mjs，日期 2026-10-18。
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TYPESAFE_ENDPOINT,
  TypeSafeError,
  createTypeSafeClient,
  loadTypeSafeConfig,
} from './typesafe.mjs';

const TEST_KEY = 'ts-test-key-not-real';
const CONFIG = { apiKey: TEST_KEY, model: 'jev-latest' };

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('loadTypeSafeConfig reads the user env and ignores placeholders', () => {
  assert.equal(loadTypeSafeConfig({}), null);
  assert.equal(loadTypeSafeConfig({ TYPESAFE_API_KEY: '  ' }), null);
  assert.equal(loadTypeSafeConfig({ TYPESAFE_API_KEY: 'replace-with-a-new-key' }), null);
  assert.deepEqual(
    { ...loadTypeSafeConfig({ TYPESAFE_API_KEY: TEST_KEY }) },
    { apiKey: TEST_KEY, model: 'jev-latest' },
  );
  assert.equal(
    loadTypeSafeConfig({ TYPESAFE_API_KEY: TEST_KEY, TYPESAFE_MODEL: 'jev-1.13' }).model,
    'jev-1.13',
  );
});

test('systemOne posts the documented request shape with bearer auth', async () => {
  const requests = [];
  const client = createTypeSafeClient({
    config: CONFIG,
    fetchImpl: async (url, init) => {
      requests.push({ url, init, body: JSON.parse(init.body) });
      return jsonResponse(200, { model: 'jev-mock', answers: { ok: { type: 'noul', noul: 0.9 } } });
    },
  });
  const payload = await client.systemOne({
    state: 'hello',
    questions: { ok: { type: 'noul', instructions: 'Is this a greeting?' } },
  });
  assert.equal(payload.answers.ok.noul, 0.9);
  assert.equal(requests[0].url, TYPESAFE_ENDPOINT);
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(requests[0].init.headers.authorization, `Bearer ${TEST_KEY}`);
  assert.deepEqual(requests[0].body, {
    model: 'jev-latest',
    state: 'hello',
    questions: { ok: { type: 'noul', instructions: 'Is this a greeting?' } },
  });
});

test('systemOne retries once on 429 and classifies failures', async () => {
  let calls = 0;
  const flaky = createTypeSafeClient({
    config: CONFIG,
    retryDelayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? jsonResponse(429, {}) : jsonResponse(200, { answers: {} });
    },
  });
  await flaky.systemOne({ state: 'x', questions: {} });
  assert.equal(calls, 2);

  const cases = [
    [async () => jsonResponse(401, {}), 'http_error', 401],
    [async () => new Response('not json', { status: 200 }), 'invalid_response', null],
    [async () => { throw new TypeError('fetch failed'); }, 'network_error', null],
  ];
  for (const [fetchImpl, code, status] of cases) {
    const client = createTypeSafeClient({ config: CONFIG, fetchImpl });
    await assert.rejects(
      client.systemOne({ state: 'x', questions: {} }),
      (error) => error instanceof TypeSafeError && error.code === code && error.status === status,
    );
  }
});

test('noulEach asks one request per item and keeps order', async () => {
  const seen = [];
  const client = createTypeSafeClient({
    config: CONFIG,
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      seen.push(body);
      const [key] = Object.keys(body.questions);
      return jsonResponse(200, {
        model: 'jev-mock',
        answers: { [key]: { type: 'noul', noul: body.state.value / 10 } },
      });
    },
  });
  const result = await client.noulEach([3, 9, 1], {
    stateFor: (value) => ({ value }),
    question: { instructions: 'Is `value` large?' },
    concurrency: 2,
  });
  assert.deepEqual(result, { nouls: [0.3, 0.9, 0.1], actualModel: 'jev-mock' });
  assert.equal(seen.length, 3);
  assert.equal(seen.every((body) => Object.values(body.questions)[0].type === 'noul'), true);

  const broken = createTypeSafeClient({
    config: CONFIG,
    fetchImpl: async () => jsonResponse(200, { answers: {} }),
  });
  await assert.rejects(
    broken.noulEach([1], { stateFor: (value) => value, question: { instructions: 'q' } }),
    (error) => error.code === 'invalid_response',
  );
});
