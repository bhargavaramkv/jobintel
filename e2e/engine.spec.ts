import type { Page } from '@playwright/test';
import { expect, test, type ApiProcess } from './api-process';

interface TaskDto {
  id: number;
  key: string;
  status: string;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  result: unknown;
}

async function getJson<T>(api: ApiProcess, path: string): Promise<T> {
  const res = await fetch(`${api.url}${path}`);
  expect(res.status).toBe(200);
  return (await res.json()) as T;
}

const planTasks = async (api: ApiProcess, planId: number) =>
  (await getJson<{ tasks: TaskDto[] }>(api, `/api/plans/${planId}`)).tasks;

function workspace(page: Page) {
  const log = page.getByRole('log');
  return {
    log,
    async run(command: string) {
      await page.getByLabel('Command').fill(command);
      await page.getByLabel('Command').press('Enter');
    },
    /** The single log line matching `pattern` (waits for it). */
    async line(pattern: RegExp, timeout = 15_000) {
      const el = log.getByText(pattern);
      await expect(el).toHaveCount(1, { timeout });
      return (await el.textContent()) ?? '';
    },
  };
}

test('execution engine: plan, dependencies, hard kill, recovery, pause, cancel', async ({
  page,
  api,
}) => {
  test.setTimeout(150_000);
  const ws = workspace(page);

  // 1. header shows live
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('live');

  // 2. /help lists plan creation
  await ws.run('/help');
  await expect(ws.log.getByText(/\/plans create <json>/)).toBeVisible();

  // 3. natural language is rejected by the server
  await ws.run('find me some jobs');
  await expect(ws.log.getByText(/only understands commands/)).toBeVisible();

  // 4. a three-task chain: a -> b (4 s delay) -> c
  const spec = {
    name: 'chain',
    tasks: [
      { key: 'a', type: 'system.echo', input: { message: 'hi' } },
      { key: 'b', type: 'system.delay', input: { ms: 4000 }, dependsOn: ['a'] },
      { key: 'c', type: 'system.echo', input: { message: 'done' }, dependsOn: ['b'] },
    ],
  };
  await ws.run(`/plans create ${JSON.stringify(spec)}`);
  const created = await ws.line(/^plan \d+ created \(3 tasks\)$/);
  const planId = Number(/plan (\d+)/.exec(created)![1]);

  // 5. a completes, then b starts
  const aId = Number(/task (\d+)/.exec(await ws.line(/^task \d+ a RUNNING -> COMPLETED$/))![1]);
  const bLine = await ws.line(/^task \d+ b QUEUED -> RUNNING \(attempt 1\)$/);
  const bId = Number(/task (\d+)/.exec(bLine)![1]);
  const before = (await planTasks(api, planId)).find((t) => t.id === aId)!;
  expect(before.status).toBe('COMPLETED');

  // 6. kill the API hard while b is RUNNING; the UI notices and recovers the stream by itself
  expect((await planTasks(api, planId)).find((t) => t.id === bId)!.status).toBe('RUNNING');
  await api.kill();
  await expect(page.getByRole('status')).toHaveText('reconnecting');
  await api.start();
  await expect(page.getByRole('status')).toHaveText('live', { timeout: 20_000 });

  // 7. recovery: b was interrupted and re-run, then c and the plan finish; no line is duplicated
  await ws.line(new RegExp(`^task ${bId} b RUNNING -> RETRYING$`));
  await ws.line(new RegExp(`^task ${bId} b RETRYING -> QUEUED$`));
  await ws.line(new RegExp(`^task ${bId} b QUEUED -> RUNNING \\(attempt 2\\)$`));
  await ws.line(new RegExp(`^task ${bId} b RUNNING -> COMPLETED$`), 30_000);
  const cId = Number(/task (\d+)/.exec(await ws.line(/^task \d+ c RUNNING -> COMPLETED$/))![1]);
  await ws.line(new RegExp(`^plan ${planId} COMPLETED$`));

  // History survived the restart: a is untouched, and dependencies held on the event order.
  const after = await planTasks(api, planId);
  const byKey = Object.fromEntries(after.map((t) => [t.key, t]));
  expect(after.map((t) => t.status)).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED']);
  expect(byKey.a).toMatchObject({ attempts: 1, completedAt: before.completedAt });
  expect(byKey.b!.attempts).toBe(2);
  expect(Date.parse(byKey.b!.startedAt!)).toBeGreaterThanOrEqual(Date.parse(byKey.a!.completedAt!));
  expect(Date.parse(byKey.c!.startedAt!)).toBeGreaterThanOrEqual(Date.parse(byKey.b!.completedAt!));

  type Ev = { id: number; type: string; data: { from?: string; to?: string } };
  const events = async (id: number) =>
    (await getJson<{ events: Ev[] }>(api, `/api/tasks/${id}`)).events.filter(
      (e) => e.type === 'task.status',
    );
  const firstId = (evs: Ev[], to: string) => evs.find((e) => e.data.to === to)!.id;
  const [ea, eb, ec] = [await events(aId), await events(bId), await events(cId)];
  expect(firstId(eb, 'RUNNING')).toBeGreaterThan(firstId(ea, 'COMPLETED'));
  expect(firstId(ec, 'RUNNING')).toBeGreaterThan(eb.findLast((e) => e.data.to === 'COMPLETED')!.id);
  expect(eb.map((e) => e.data.to).slice(-5)).toEqual([
    'RUNNING',
    'RETRYING',
    'QUEUED',
    'RUNNING',
    'COMPLETED',
  ]);

  // 8. history through the command line, and a task result through the status panel
  await ws.run(`/tasks show ${bId}`);
  await expect(
    ws.log.getByText(new RegExp(`#${bId} plan ${planId} b .*COMPLETED attempt 2/3`)),
  ).toBeVisible();
  await page.getByRole('button', { name: `#${bId} b` }).click();
  await expect(page.getByLabel('Task result')).toContainText('"sleptMs": 4000');
  await page.getByRole('button', { name: `#${cId} c` }).click();
  await expect(page.getByLabel('Task result')).toContainText('"message": "done"');

  // 9. pause: the demo plan stays queued; resume from the panel and it completes
  await ws.run('/pause');
  await ws.line(/^engine paused$/);
  await ws.run('/plans demo');
  const demo = await ws.line(/^plan \d+ created \(4 tasks\)$/);
  const demoId = Number(/plan (\d+)/.exec(demo)![1]);
  await expect
    .poll(async () => (await planTasks(api, demoId)).find((t) => t.key === 'hello')?.status)
    .toBe('QUEUED');
  await page.waitForTimeout(1500);
  expect((await planTasks(api, demoId)).find((t) => t.key === 'hello')!.status).toBe('QUEUED');
  await ws.run('/tasks list queued');
  await expect(ws.log.getByText(/ hello \(system\.echo\) QUEUED/)).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await ws.line(/^engine running$/);
  await ws.line(new RegExp(`^plan ${demoId} COMPLETED$`), 30_000);

  // 10. cancel a running task
  await ws.run(
    `/plans create ${JSON.stringify({ tasks: [{ key: 'slow', type: 'system.delay', input: { ms: 30000 } }] })}`,
  );
  const slowId = Number(
    /task (\d+)/.exec(await ws.line(/^task \d+ slow QUEUED -> RUNNING \(attempt 1\)$/))![1],
  );
  await ws.run(`/tasks cancel ${slowId}`);
  await expect(ws.log.getByText(/cancellation requested/)).toBeVisible();
  await ws.line(new RegExp(`^task ${slowId} slow RUNNING -> CANCELLED$`), 5000);

  // 11. status
  await ws.run('/status');
  await expect(ws.log.getByText(/database: ok/)).toBeVisible();
  await expect(ws.log.getByText(/engine: running/)).toBeVisible();
});
