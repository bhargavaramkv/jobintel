import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { FakeEventSource, latestSource, stubFetch } from './test-helpers';

const event = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  at: '2026-11-18T10:00:00.000Z',
  type: 'task.status',
  planId: 3,
  taskId: 7,
  data: { key: 'wait-a', from: 'QUEUED', to: 'RUNNING', attempt: 1 },
  ...over,
});

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const input = () => screen.getByLabelText('Command');
const log = () => screen.getByRole('log');

describe('App commands', () => {
  it('posts a command to the API with an idempotency key and prints the output', async () => {
    const { calls } = stubFetch({
      'POST /api/commands': () => ({ body: { output: 'Commands:\n  /plans create' } }),
    });
    render(<App />);
    await userEvent.type(input(), '/help{Enter}');
    expect(await within(log()).findByText(/\/plans create/)).toBeTruthy();
    const post = calls.find((c) => c.key === 'POST /api/commands')!;
    expect(JSON.parse(String(post.init?.body))).toEqual({ command: '/help' });
    const headers = new Headers(post.init?.headers);
    expect(headers.get('idempotency-key')).toBeTruthy();
    expect((input() as HTMLInputElement).value).toBe('');
  });

  it('prints the message and details of an API error envelope as an error', async () => {
    stubFetch({
      'POST /api/commands': () => ({
        status: 400,
        body: {
          error: {
            code: 'PLAN_INVALID',
            message: 'the plan is not valid',
            details: [{ path: 'tasks.0.type', message: 'unknown type' }],
          },
        },
      }),
    });
    render(<App />);
    await userEvent.type(input(), '/plans create {{}{Enter}');
    const message = await within(log()).findByText(/the plan is not valid/);
    expect(message.className).toContain('error');
    expect(message.textContent).toContain('tasks.0.type: unknown type');
  });

  it('shows the server rejection of natural language', async () => {
    stubFetch({
      'POST /api/commands': () => ({
        status: 400,
        body: { error: { code: 'NOT_A_COMMAND', message: 'JobIntel only understands commands' } },
      }),
    });
    render(<App />);
    await userEvent.type(input(), 'find me some jobs{Enter}');
    expect(await within(log()).findByText(/only understands commands/)).toBeTruthy();
  });

  it('reports an unreachable API', async () => {
    stubFetch({
      'POST /api/commands': () => {
        throw new TypeError('network');
      },
    });
    render(<App />);
    await userEvent.type(input(), '/status{Enter}');
    expect(await within(log()).findByText('API unreachable')).toBeTruthy();
  });

  it('recalls history with the arrow keys and restores the draft', async () => {
    stubFetch({ 'POST /api/commands': () => ({ body: { output: 'ok' } }) });
    render(<App />);
    const field = input() as HTMLInputElement;
    await userEvent.type(field, '/status{Enter}');
    await userEvent.type(field, '/tasks{Enter}');
    await within(log()).findAllByText('ok');
    await userEvent.type(field, 'draft');
    await userEvent.keyboard('{ArrowUp}');
    expect(field.value).toBe('/tasks');
    await userEvent.keyboard('{ArrowUp}');
    expect(field.value).toBe('/status');
    await userEvent.keyboard('{ArrowUp}');
    expect(field.value).toBe('/status');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(field.value).toBe('draft');
  });
});

describe('App event stream', () => {
  it('opens one EventSource on /api/events and closes it on unmount', () => {
    stubFetch();
    const { unmount } = render(<App />);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latestSource().url).toBe('/api/events');
    unmount();
    expect(latestSource().closed).toBe(true);
  });

  it('renders an event line, ignores duplicate ids and bad payloads', async () => {
    stubFetch();
    render(<App />);
    act(() => {
      latestSource().emit(event(5));
      latestSource().emit(event(5));
      latestSource().emit(event(4));
      latestSource().onmessage?.({ data: 'not json' } as MessageEvent<string>);
      latestSource().emit(
        event(6, { type: 'plan.status', data: { from: 'ACTIVE', to: 'COMPLETED' } }),
      );
      latestSource().emit(event(7, { type: 'system.status', data: { paused: true } }));
    });
    expect(within(log()).getAllByText('task 7 wait-a QUEUED -> RUNNING (attempt 1)')).toHaveLength(
      1,
    );
    expect(within(log()).getByText('plan 3 COMPLETED')).toBeTruthy();
    expect(within(log()).getByText('engine paused')).toBeTruthy();
  });

  it('switches the indicator between live and reconnecting', () => {
    stubFetch();
    render(<App />);
    const indicator = screen.getByRole('status');
    expect(indicator.textContent).toBe('connecting');
    act(() => latestSource().open());
    expect(indicator.textContent).toBe('live');
    act(() => latestSource().fail());
    expect(indicator.textContent).toBe('reconnecting');
    act(() => latestSource().open());
    expect(indicator.textContent).toBe('live');
  });
});
