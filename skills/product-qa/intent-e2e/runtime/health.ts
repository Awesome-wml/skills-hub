import type { Page } from './pw';
import type { Recorder } from './network';

/**
 * 页面健康检查：每条用例跑完自动执行，不依赖 assert.yaml。
 * 抓的是「断言没写到、但用户一眼就能看到的问题」：接口报错、前端异常、报错提示、表格里的脏值。
 */
export type HealthConfig = {
  enabled?: boolean;
  /** 业务错误码字段（响应体 JSON 顶层），非 0 视为失败；不配则只看 HTTP 状态 */
  codeField?: string;
  /** 只对这些域名检查业务码；第三方接口的码值约定不同（如 code=200 表示成功）。不配则检查全部 */
  apiHosts?: string[];
  /** 报错提示的选择器（如 Element Plus 的 .el-message--error），出现过即失败 */
  errorToastSelector?: string;
  /** 表格单元格里不应出现的文本 */
  badCellText?: string[];
};

const DEFAULT_BAD_TEXT = ['undefined', 'NaN', '[object Object]'];

export async function installHealth(page: Page, cfg: HealthConfig = {}) {
  const jsErrors: string[] = [];
  page.on('pageerror', (e) => jsErrors.push(e.message.split('\n')[0]));
  if (cfg.errorToastSelector) {
    // 报错提示几秒就消失，跑完再查会漏，所以在页面里持续记录
    await page.addInitScript((selector: string) => {
      const seen = ((window as any).__e2eToasts = [] as string[]);
      const scan = () => {
        for (const el of Array.from(document.querySelectorAll(selector))) {
          const text = (el.textContent || '').trim();
          if (text && !seen.includes(text)) seen.push(text);
        }
      };
      new MutationObserver(scan).observe(document, { childList: true, subtree: true });
    }, cfg.errorToastSelector);
  }
  return { jsErrors };
}

export async function healthProblems(
  page: Page,
  recorder: Recorder,
  state: { jsErrors: string[] },
  cfg: HealthConfig = {},
  allowedCodes: Set<string>,
): Promise<string[]> {
  if (cfg.enabled === false) return [];
  await recorder.settled();
  const problems: string[] = [];

  for (const e of recorder.entries) {
    const where = `${e.method} ${e.path}`;
    if (e.status !== null && e.status >= 500) {
      problems.push(`接口 HTTP ${e.status}：${where}`);
      continue;
    }
    if (!cfg.codeField) continue;
    if (cfg.apiHosts?.length && !cfg.apiHosts.includes(e.host)) continue;
    let code: unknown;
    try {
      code = JSON.parse(e.body)?.[cfg.codeField];
    } catch {
      continue;
    }
    if (code === undefined || code === null || String(code) === '0' || allowedCodes.has(String(code))) continue;
    let message = '';
    try {
      message = String(JSON.parse(e.body)?.message ?? '');
    } catch {}
    problems.push(`接口返回 ${cfg.codeField}=${code}${message ? `（${message}）` : ''}：${where}`);
  }

  for (const msg of state.jsErrors) problems.push(`前端脚本异常：${msg}`);

  if (cfg.errorToastSelector) {
    const toasts: string[] = await page.evaluate(() => (window as any).__e2eToasts || []).catch(() => []);
    for (const t of toasts) problems.push(`页面报错提示：${t}`);
  }

  const bad = cfg.badCellText ?? DEFAULT_BAD_TEXT;
  if (bad.length) {
    const cells = await page.getByRole('cell').allInnerTexts().catch(() => [] as string[]);
    const dirty = [...new Set(cells.map((c) => c.trim()).filter((c) => bad.some((b) => c.includes(b))))];
    if (dirty.length) problems.push(`表格出现异常值：${dirty.slice(0, 5).join(' / ')}`);
  }

  return [...new Set(problems)];
}

/** 用例自己预期的业务错误码（反例断言里写的 $.code，以及 intent.constraints.allowApiCodes）不算健康问题。 */
export function expectedCodes(intent: any, asserts: any[], codeField?: string): Set<string> {
  const codes = new Set<string>((intent.constraints?.allowApiCodes || []).map(String));
  if (!codeField) return codes;
  for (const a of asserts) {
    const m = a.type === 'api' ? a.expect?.[`$.${codeField}`] : undefined;
    if (m === undefined) continue;
    const list = typeof m === 'object' && m !== null ? (m.oneOf ?? m.in ?? []) : [m];
    for (const c of list) if (String(c) !== '0') codes.add(String(c));
  }
  return codes;
}
