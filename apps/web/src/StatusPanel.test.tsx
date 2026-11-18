import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { FakeEventSource, emptyStatus, latestSource, stubFetch, task } from './test-helpers';

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StatusPanel', () => {
  it('updates the task list when an SSE event arrives', async () => {
    let tasks = [task({ status: 'QUEUED' })];
    stubFetch({ 'GET /api/tasks': () => ({ body: { tasks } }) });
    render(<App />);
    const panel = await screen.findByLabelText('Execution status');
    await waitFor(() => expect(panel.textContent).toContain('QUEUED'));

    tasks = [task({ status: 'RUNNING', attempts: 1, startedAt: '2026-11-18T10:00:01.000Z' })];
    act(() =>
      latestSource().emit({
        id: 1,
        at: '2026-11-18T10:00:01.000Z',
        type: 'task.status',
        planId: 1,
        taskId: 1,
        data: { key: 'a', from: 'QUEUED', to: 'RUNNING', attempt: 1 },
      }),
    );
    await waitFor(() => expect(panel.textContent).toContain('RUNNING'));
    expect(panel.textContent).not.toContain('QUEUED');
  });

  it('shows task detail on selection and cancels a cancellable task', async () => {
    const running = task({
      id: 4,
      key: 'slow',
      type: 'system.delay',
      status: 'RUNNING',
      attempts: 1,
      startedAt: '2026-11-18T10:00:01.000Z',
    });
    const { calls } = stubFetch({
      'GET /api/tasks': () => ({ body: { tasks: [running] } }),
      'GET /api/tasks/4': () => ({
        body: {
          task: { ...running, result: { sleptMs: 5 }, error: { code: 'X', message: 'broke' } },
          events: [
            {
              id: 9,
              at: '2026-11-18T10:00:02.000Z',
              type: 'task.log',
              planId: 1,
              taskId: 4,
              data: { level: 'info', message: 'hello log' },
            },
          ],
        },
      }),
      'POST /api/tasks/4/cancel': () => ({ status: 202, body: { task: running } }),
    });
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: '#4 slow' }));
    expect(await screen.findByText(/hello log/)).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByLabelText('Task result').textContent).toContain('"sleptMs": 5');
    expect(screen.getByLabelText('Task error').textContent).toContain('X: broke');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel task 4' }));
    await waitFor(() => expect(calls.some((c) => c.key === 'POST /api/tasks/4/cancel')).toBe(true));
  });

  it('does not offer cancel for finished tasks', async () => {
    stubFetch({
      'GET /api/tasks': () => ({ body: { tasks: [task({ status: 'COMPLETED' })] } }),
    });
    render(<App />);
    await screen.findByRole('button', { name: '#1 a' });
    expect(screen.queryByRole('button', { name: /Cancel task/ })).toBeNull();
  });

  it('toggles pause and resume', async () => {
    let paused = false;
    const { calls } = stubFetch({
      'GET /api/system/status': () => ({ body: { ...emptyStatus, paused } }),
      'POST /api/system/pause': () => {
        paused = true;
        return { body: { status: { ...emptyStatus, paused } } };
      },
      'POST /api/system/resume': () => {
        paused = false;
        return { body: { status: { ...emptyStatus, paused } } };
      },
    });
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Pause' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Resume' }));
    expect(calls.map((c) => c.key)).toEqual(
      expect.arrayContaining(['POST /api/system/pause', 'POST /api/system/resume']),
    );
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeTruthy();
  });
});
