// 断言引擎：只执行 assert.yaml 中人定义的规则。脚本（reach.spec.ts）不包含任何断言。
import { expect, type Page } from './pw';
import type { Recorder } from './network';

export type Assertion = Record<string, any> & { name: string; type: 'ui' | 'api' };

export const UI_CHECKS = ['url_matches', 'text_visible', 'text_absent', 'all_rows_text', 'row_count'] as const;
const DEFAULT_TIMEOUT = 5000;

export async function runAssertion(a: Assertion, ctx: { page: Page; recorder: Recorder; mask: (s: string) => string }) {
  if (a.type === 'ui') return runUi(a, ctx.page);
  if (a.type === 'api') return runApi(a, ctx.recorder, ctx.mask);
  throw new Error(`断言「${a.name}」的 type 只能是 ui 或 api`);
}

// ───────────── UI ─────────────

function region(page: Page, r?: { role: string; name?: string }) {
  if (!r) return page.locator('body');
  return page.getByRole(r.role as any, r.name ? { name: r.name } : {});
}

async function runUi(a: Assertion, page: Page) {
  const timeout = a.timeout ?? DEFAULT_TIMEOUT;
  switch (a.check) {
    case 'url_matches':
      await expect(page, `URL 应匹配 /${a.pattern}/`).toHaveURL(new RegExp(a.pattern), { timeout });
      return;
    case 'text_visible':
      await expect(region(page, a.region).getByText(a.text, { exact: Boolean(a.exact) }).first(), `应显示「${a.text}」`).toBeVisible({ timeout });
      return;
    case 'text_absent':
      await expect(region(page, a.region).getByText(a.text, { exact: Boolean(a.exact) }), `不应出现「${a.text}」`).toHaveCount(0, { timeout });
      return;
    case 'all_rows_text': {
      const minRows = a.min_rows ?? 1;
      await expect
        .poll(async () => columnMismatch(page, a), { timeout, message: `「${a.column}」列应全部${a.equals !== undefined ? `等于「${a.equals}」` : `包含「${a.contains}」`}，且至少 ${minRows} 行` })
        .toBe('');
      return;
    }
    case 'row_count': {
      const count = async () => (await region(page, a.region).getByRole('row').count()) - 1;
      if (a.equals !== undefined) await expect.poll(count, { timeout, message: `数据行数应为 ${a.equals}` }).toBe(a.equals);
      if (a.min !== undefined) await expect.poll(count, { timeout, message: `数据行数应 ≥ ${a.min}` }).toBeGreaterThanOrEqual(a.min);
      if (a.max !== undefined) await expect.poll(count, { timeout, message: `数据行数应 ≤ ${a.max}` }).toBeLessThanOrEqual(a.max);
      return;
    }
    default:
      throw new Error(`断言「${a.name}」的 check 不支持：${a.check}（可用：${UI_CHECKS.join(', ')}）`);
  }
}

/** 返回空串表示通过；否则返回不符合的描述（用于 poll 失败时展示）。 */
async function columnMismatch(page: Page, a: Assertion): Promise<string> {
  const table = region(page, a.region ?? { role: 'table' });
  const headers = await table.getByRole('columnheader').allInnerTexts();
  const idx = headers.findIndex((h) => h.trim() === a.column);
  if (idx < 0) return `找不到列「${a.column}」，现有列：${headers.join(' / ')}`;
  const rows = table.getByRole('row');
  const values: string[] = [];
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const cells = rows.nth(i).getByRole('cell');
    if ((await cells.count()) === 0) continue;
    values.push((await cells.nth(idx).innerText()).trim());
  }
  const minRows = a.min_rows ?? 1;
  if (values.length < minRows) return `只有 ${values.length} 行数据`;
  const bad = values.filter((v) => (a.equals !== undefined ? v !== String(a.equals) : !v.includes(String(a.contains))));
  return bad.length ? `不符合的值：${bad.join(', ')}（共 ${values.length} 行）` : '';
}

// ───────────── API ─────────────

async function runApi(a: Assertion, recorder: Recorder, mask: (s: string) => string) {
  await recorder.settled();
  const m = a.match || {};
  if (!m.path) throw new Error(`断言「${a.name}」缺少 match.path`);
  const hits = recorder.entries.filter((e) => e.path.includes(m.path) && (!m.method || e.method === String(m.method).toUpperCase()));
  if (!hits.length) throw new Error(`断言「${a.name}」：流程中没有出现接口 ${m.method || ''} ${m.path}。本次出现的接口：${[...new Set(recorder.entries.map((e) => e.path))].join(', ') || '（无）'}`);
  const pick = a.pick || 'last';
  const targets = pick === 'all' ? hits : [pick === 'first' ? hits[0] : hits[hits.length - 1]];
  for (const hit of targets) {
    const expectSpec = a.expect || {};
    const failures: string[] = [];
    for (const [key, matcher] of Object.entries(expectSpec)) {
      if (key === 'status') {
        if (hit.status !== matcher) failures.push(`HTTP 状态应为 ${matcher}，实际 ${hit.status}`);
        continue;
      }
      let body: unknown;
      try {
        body = JSON.parse(hit.body);
      } catch {
        failures.push(`响应不是 JSON，无法检查 ${key}`);
        continue;
      }
      const values = jsonPath(body, key);
      const msg = matchValues(key, values, matcher);
      if (msg) failures.push(msg);
    }
    if (failures.length) {
      throw new Error(mask(`断言「${a.name}」失败（${hit.method} ${hit.path}${hit.query}）：\n- ${failures.join('\n- ')}\n响应体：${hit.body.slice(0, 1500)}`));
    }
  }
}

/** JSONPath 子集：$.a.b[0].c、$.list[*].x */
export function jsonPath(data: unknown, expr: string): { found: boolean; values: unknown[]; wildcard: boolean } {
  if (!expr.startsWith('$')) throw new Error(`JSON 路径必须以 $ 开头：${expr}`);
  const tokens = expr.slice(1).match(/\.[^.[\]]+|\[\*\]|\[\d+\]/g) || [];
  let current: unknown[] = [data];
  let wildcard = false;
  for (const t of tokens) {
    const next: unknown[] = [];
    for (const v of current) {
      if (t === '[*]') {
        wildcard = true;
        if (Array.isArray(v)) next.push(...v);
      } else if (t.startsWith('[')) {
        if (Array.isArray(v)) {
          const i = Number(t.slice(1, -1));
          if (i < v.length) next.push(v[i]);
        }
      } else if (v && typeof v === 'object' && t.slice(1) in (v as object)) {
        next.push((v as any)[t.slice(1)]);
      }
    }
    current = next;
  }
  return { found: current.length > 0, values: current, wildcard };
}

const show = (v: unknown) => JSON.stringify(v);

function matchOne(actual: unknown, m: any): boolean {
  if (m === null || typeof m !== 'object' || Array.isArray(m)) return actual === m;
  if ('equals' in m) return actual === m.equals;
  if ('contains' in m) return typeof actual === 'string' && actual.includes(String(m.contains));
  if ('matches' in m) return typeof actual === 'string' && new RegExp(m.matches).test(actual);
  if ('oneOf' in m) return (m.oneOf as unknown[]).includes(actual);
  if ('type' in m) return (Array.isArray(actual) ? 'array' : actual === null ? 'null' : typeof actual) === m.type;
  throw new Error(`不支持的匹配写法：${show(m)}`);
}

function matchValues(key: string, r: ReturnType<typeof jsonPath>, m: any): string | null {
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    if ('exists' in m) return r.found === Boolean(m.exists) ? null : `${key} ${m.exists ? '应存在' : '不应存在'}`;
    if ('length' in m || 'minLength' in m) {
      const arr = r.wildcard ? r.values : (r.values[0] as unknown[]);
      const len = Array.isArray(arr) ? arr.length : -1;
      if ('length' in m && len !== m.length) return `${key} 长度应为 ${m.length}，实际 ${len}`;
      if ('minLength' in m && len < m.minLength) return `${key} 长度应 ≥ ${m.minLength}，实际 ${len}`;
      return null;
    }
    if ('all' in m) {
      if (!r.values.length) return `${key} 没有任何值（空列表不算通过）`;
      const bad = r.values.filter((v) => !matchOne(v, m.all));
      return bad.length ? `${key} 应全部满足 ${show(m.all)}，不符合的值：${bad.map(show).join(', ')}` : null;
    }
    if ('any' in m) return r.values.some((v) => matchOne(v, m.any)) ? null : `${key} 至少一个应满足 ${show(m.any)}，实际 ${show(r.values)}`;
  }
  if (!r.found) return `${key} 不存在`;
  const actual = r.wildcard ? r.values : r.values[0];
  if (r.wildcard) return `${key} 含 [*]，请用 all / any / length 匹配`;
  return matchOne(actual, m) ? null : `${key} 应为 ${show(m)}，实际 ${show(actual)}`;
}
