import path from 'node:path';
import { loadProject } from './project';

/** 生成 Playwright 配置。重试固定为 0：偶发失败必须暴露出来交给分诊，不能被重试掩盖。 */
export function e2eConfig(overrides: Record<string, unknown> = {}) {
  const p = loadProject();
  // e2e.config.yaml 的 noProxy：这些域名不走本机代理。worker 和 Fixture 子进程都继承这里的环境变量
  for (const key of ['NO_PROXY', 'no_proxy']) {
    const hosts = [process.env[key], ...(p.config.noProxy || [])].filter(Boolean);
    if (hosts.length) process.env[key] = hosts.join(',');
  }
  return {
    testDir: p.casesDir,
    testMatch: '**/reach.spec.ts',
    outputDir: path.join(p.runsDir, 'artifacts'),
    timeout: 60_000,
    retries: 0,
    reporter: [
      ['list'],
      ['json', { outputFile: path.join(p.runsDir, 'report.json') }],
      ['html', { outputFolder: path.join(p.runsDir, 'html'), open: 'never' }],
    ],
    use: {
      ...(p.config.browser?.channel ? { channel: p.config.browser.channel } : {}),
      baseURL: p.env.baseURL,
      locale: 'zh-CN',
      viewport: { width: 1440, height: 900 },
      // 单步超时远小于用例超时：元素找不到时尽快失败，页面仍在，才能采集失败时的页面结构作为分诊证据
      actionTimeout: 10_000,
      navigationTimeout: 20_000,
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    ...overrides,
  };
}
