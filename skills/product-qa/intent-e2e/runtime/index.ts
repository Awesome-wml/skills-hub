// 回归运行时入口。由 intent-e2e 技能的 init 安装，CI 只依赖这里，不依赖技能和任何智能体。
// 不要手改：升级请重新执行 init --upgrade。
import fs from 'node:fs';
import { test, type Page } from './pw';
import { loadProject, findCase, resolveLogin, callFixture } from './project';
import { recordNetwork } from './network';
import { runAssertion } from './asserts';
import { installHealth, healthProblems, expectedCodes } from './health';

export type ReachContext = { page: Page; data: any };
type Phase = 'setup' | 'reach' | 'assert';

/**
 * 定义一个用例：body 只负责把系统带到可断言的状态（导航、填写、点击、等待），
 * 判定由运行时读取同目录 assert.yaml 执行。body 内不允许写 expect。
 */
export function reach(id: string, body: (ctx: ReachContext) => Promise<void>) {
  const project = loadProject();
  const kase = findCase(project, id);
  const { intent, asserts } = kase;
  const role: string | undefined = intent.precondition?.login?.role;
  const target: string = intent.target || 'web';
  let loginFile: string | undefined;
  let loginError: string | undefined;
  try {
    loginFile = role ? resolveLogin(project, role, target) : undefined;
  } catch (e: any) {
    loginError = String(e?.message || e);
  }
  if (loginFile && fs.existsSync(loginFile)) test.use({ storageState: loginFile });

  test(`${id}｜${intent.title || ''}`, async ({ page }, testInfo) => {
    const writes = intent.constraints?.sideEffect === 'write';
    test.skip(writes && !project.env.allowWrite, `用例会写数据，但环境 ${project.envName} 未声明 allowWrite: true`);

    let phase: Phase = 'setup';
    let failedAssert: string | null = null;
    let batchId: string | null = null;
    const recorder = recordNetwork(page);
    const healthCfg = project.config.health || {};
    const health = await installHealth(page, healthCfg);

    try {
      if (loginError) throw new Error(`签发登录态 ${role} 失败：${loginError}`);
      if (loginFile && !fs.existsSync(loginFile)) {
        throw new Error(`登录态 ${role} 不存在（${loginFile}）。配置 Fixture 的 login，或人工登录后用探针 save-login --as ${role}`);
      }
      let data: any = undefined;
      const seedName = intent.precondition?.data?.seed;
      if (seedName) {
        const seeded = callFixture(project, 'seed', { name: seedName, params: intent.precondition.data.params || {} });
        if (!seeded) throw new Error(`用例声明了造数 ${seedName}，但 e2e.config.yaml 未配置 fixture.command`);
        batchId = seeded.batchId ?? null;
        data = seeded.data;
      }

      phase = 'reach';
      await test.step(`到达：${intent.title || id}`, () => body({ page, data }));

      phase = 'assert';
      const errors: string[] = [];
      for (const a of asserts) {
        try {
          await test.step(`判定：${a.name}`, () => runAssertion(a, { page, recorder, mask: project.mask }));
        } catch (e: any) {
          failedAssert ??= a.name;
          errors.push(`【${a.name}】${String(e?.message || e)}`);
        }
      }
      const problems = await test.step('判定：页面健康检查', () =>
        healthProblems(page, recorder, health, healthCfg, expectedCodes(intent, asserts, healthCfg.codeField)),
      );
      if (problems.length) {
        failedAssert ??= '页面健康检查';
        errors.push(`【页面健康检查】\n- ${problems.join('\n- ')}`);
      }
      if (errors.length) throw new Error(`判定失败 ${errors.length} 项：\n${errors.join('\n')}`);
    } catch (e) {
      await attachEvidence(page, recorder, testInfo, { caseId: id, caseDir: kase.dir, phase, failedAssert }, project.mask);
      throw e;
    } finally {
      if (batchId) callFixture(project, 'cleanup', { batchId });
    }
  });
}

async function attachEvidence(page: Page, recorder: ReturnType<typeof recordNetwork>, testInfo: any, meta: Record<string, unknown>, mask: (s: string) => string) {
  const write = async (name: string, content: string, contentType: string) => {
    const file = testInfo.outputPath(name);
    fs.writeFileSync(file, content);
    await testInfo.attach(name, { path: file, contentType });
  };
  await write('e2e-failure.json', JSON.stringify({ ...meta, url: page.url() }, null, 2), 'application/json');
  const tree = await page.locator('body').ariaSnapshot({ timeout: 3000 }).catch(() => '<页面不可用，无法获取结构>');
  await write('page-structure.txt', mask(tree), 'text/plain');
  await recorder.settled();
  const net = recorder.entries.map((e) => ({ ...e, requestBody: mask(e.requestBody).slice(0, 2000), body: mask(e.body).slice(0, 4000) }));
  await write('network.json', JSON.stringify(net, null, 2), 'application/json');
}
