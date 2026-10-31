import type { Page } from './pw';

export type Entry = { method: string; host: string; path: string; query: string; status: number | null; requestBody: string; body: string };
export type Recorder = { entries: Entry[]; settled: () => Promise<void> };

/** 记录流程中的接口请求与响应，供 api 断言和失败证据使用。 */
export function recordNetwork(page: Page): Recorder {
  const entries: Entry[] = [];
  const pending = new Set<Promise<void>>();
  page.on('request', (req) => {
    const type = req.resourceType();
    if (type !== 'fetch' && type !== 'xhr') return;
    const u = new URL(req.url());
    const entry: Entry = { method: req.method(), host: u.host, path: u.pathname, query: u.search, status: null, requestBody: req.postData() || '', body: '' };
    entries.push(entry);
    const p = req
      .response()
      .then(async (res) => {
        if (!res) return;
        entry.status = res.status();
        entry.body = await res.text().catch(() => '');
      })
      .catch(() => {})
      .finally(() => pending.delete(p));
    pending.add(p);
  });
  return {
    entries,
    settled: async () => {
      await Promise.race([Promise.all([...pending]), new Promise((r) => setTimeout(r, 10_000))]);
    },
  };
}
