import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const stripAnsi = (s) => String(s || '').replace(/\u001b\[[0-9;]*m/g, '');
const readText = (p) => (p && fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

/** 从最近一次回归报告中收集失败用例的现场（按用例聚合重复执行）。 */
export function collectFailures(project, caseFilter) {
  const reportFile = path.join(project.root, 'runs', 'report.json');
  if (!fs.existsSync(reportFile)) return null;
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const byCase = new Map();
  (function walk(suites) {
    for (const s of suites || []) {
      for (const spec of s.specs || []) {
        for (const t of spec.tests || []) {
          const id = spec.title.split('｜')[0];
          if (caseFilter && id !== caseFilter) continue;
          const entry = byCase.get(id) || { id, title: spec.title, results: [] };
          entry.results.push(...t.results);
          byCase.set(id, entry);
        }
      }
      walk(s.suites);
    }
  })(report.suites);

  const isBad = (r) => r.status === 'failed' || r.status === 'timedOut';
  const failures = [];
  for (const c of byCase.values()) {
    const bad = c.results.filter(isBad);
    if (!bad.length) continue;
    const r = bad[bad.length - 1];
    const attachments = Object.fromEntries((r.attachments || []).filter((a) => a.path).map((a) => [a.name, a.path]));
    const meta = JSON.parse(readText(attachments['e2e-failure.json']) || '{}');
    let intent = null;
    if (meta.caseDir && fs.existsSync(path.join(meta.caseDir, 'intent.yaml'))) {
      intent = YAML.parse(fs.readFileSync(path.join(meta.caseDir, 'intent.yaml'), 'utf8'));
    }
    failures.push({
      id: c.id,
      title: c.title,
      total: c.results.length,
      failed: bad.length,
      meta,
      intent,
      error: stripAnsi((r.errors || []).map((e) => e.message || e.value).join('\n') || r.error?.message),
      pageStructure: readText(attachments['page-structure.txt']),
      network: JSON.parse(readText(attachments['network.json']) || '[]'),
      attachments,
    });
  }
  return { cases: byCase.size, failures };
}
