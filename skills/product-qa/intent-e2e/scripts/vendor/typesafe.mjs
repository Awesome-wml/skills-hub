// 复制自 ~/AiProject/shared/typesafe/js/typesafe.mjs，日期 2026-10-18。改动请先改源头再同步。
// Shared zero-dependency client for TypeSafe System One (Jev).
//
// The API key is read from ONE place: the user environment variable
// TYPESAFE_API_KEY (exported in ~/.zshrc). Projects should not keep copies in
// their own .env files. Node's fetch only honours HTTPS_PROXY when
// NODE_USE_ENV_PROXY=1 is set; that is configured globally, not here.
//
// API contract: https://docs.typesafe.ai/api.md

export const TYPESAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const DEFAULT_TYPESAFE_MODEL = 'jev-latest';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 5;
const RETRYABLE_STATUSES = new Set([429, 529]);

export class TypeSafeError extends Error {
  constructor(code, message, { status = null } = {}) {
    super(message);
    this.name = 'TypeSafeError';
    this.code = code;
    this.status = status;
  }
}

function usableSecret(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  if (
    !trimmed
    || normalized.startsWith('replace-')
    || normalized.startsWith('your-')
    || /^<.+>$/u.test(normalized)
  ) return null;
  return trimmed;
}

// Returns null when no usable key is configured, so callers can degrade
// gracefully instead of failing.
export function loadTypeSafeConfig(env = process.env) {
  const apiKey = usableSecret(env.TYPESAFE_API_KEY);
  if (!apiKey) return null;
  return Object.freeze({
    apiKey,
    model: env.TYPESAFE_MODEL?.trim() || DEFAULT_TYPESAFE_MODEL,
  });
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function createTypeSafeClient({
  config,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retryDelayMs = 500,
} = {}) {
  if (!config?.apiKey) throw new TypeError('TypeSafe config with apiKey is required');

  // One POST /v1/systemone. Retries once on 429/529; never logs the key or body.
  async function systemOne({ state, questions, model = config.model }) {
    const body = JSON.stringify({ model, state, questions });
    for (let attempt = 0; ; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(TYPESAFE_ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            'content-type': 'application/json',
          },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const code = error?.name === 'TimeoutError' ? 'timeout' : 'network_error';
        throw new TypeSafeError(code, 'TypeSafe request did not complete');
      }
      if (RETRYABLE_STATUSES.has(response.status) && attempt === 0) {
        await wait(retryDelayMs);
        continue;
      }
      if (!response.ok) {
        throw new TypeSafeError('http_error', 'TypeSafe returned an error status', {
          status: response.status,
        });
      }
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new TypeSafeError('invalid_response', 'TypeSafe returned invalid JSON');
      }
      if (payload === null || typeof payload !== 'object' || typeof payload.answers !== 'object') {
        throw new TypeSafeError('invalid_response', 'TypeSafe response has no answers');
      }
      return payload;
    }
  }

  // Asks the same Noul once per item (one request each, as in the re-ranking
  // cookbook) with bounded concurrency. Resolves to { nouls, actualModel } with
  // nouls aligned to items; any failure rejects the whole call so callers never
  // act on a partial set.
  async function noulEach(items, { stateFor, question, concurrency = DEFAULT_CONCURRENCY }) {
    const nouls = new Array(items.length);
    let actualModel = null;
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        const payload = await systemOne({
          state: stateFor(items[index]),
          questions: { answer: { type: 'noul', ...question } },
        });
        const noul = payload.answers.answer?.noul;
        if (typeof noul !== 'number' || !Number.isFinite(noul)) {
          throw new TypeSafeError('invalid_response', 'TypeSafe answer is missing a noul');
        }
        nouls[index] = noul;
        actualModel ??= typeof payload.model === 'string' ? payload.model : null;
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, worker),
    );
    return { nouls, actualModel };
  }

  return { model: config.model, systemOne, noulEach };
}
