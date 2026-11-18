import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ExecutionEvent,
  PlanSummary,
  SystemStatus,
  Task,
  TaskStatus,
} from '@jobintel/contracts';
import { cancelTask, fetchPlans, fetchStatus, fetchTaskDetail, fetchTasks, setPaused } from './api';

const CANCELLABLE: TaskStatus[] = ['PENDING', 'BLOCKED', 'QUEUED', 'RETRYING', 'RUNNING'];
const REFRESH_DELAY_MS = 250;

const time = (iso: string | null) => (iso ? iso.replace('T', ' ').slice(0, 19) : '-');

function duration(task: Task): string {
  if (!task.startedAt) return '-';
  const end = task.completedAt ? Date.parse(task.completedAt) : Date.now();
  return `${((end - Date.parse(task.startedAt)) / 1000).toFixed(1)}s`;
}

function counts(c: Record<string, number>): string {
  return (
    Object.entries(c)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k.toLowerCase()} ${n}`)
      .join(' · ') || 'none'
  );
}

/** Minimal status view. `tick` changes whenever the event stream delivers something. */
export function StatusPanel({ tick }: { tick: number }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ task: Task; events: ExecutionEvent[] } | null>(null);
  const [problem, setProblem] = useState('');
  const selectedRef = useRef<number | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const refresh = useCallback(async () => {
    try {
      const id = selectedRef.current;
      const [s, p, t, d] = await Promise.all([
        fetchStatus(),
        fetchPlans(),
        fetchTasks(),
        id === null ? Promise.resolve(null) : fetchTaskDetail(id).catch(() => null),
      ]);
      setStatus(s);
      setPlans(p);
      setTasks(t);
      if (id !== null && id === selectedRef.current) setDetail(d);
      setProblem('');
    } catch {
      setProblem('status unavailable');
    }
  }, []);

  // Coalesce bursts of events into one refresh.
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), tick === 0 ? 0 : REFRESH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [tick, selected, refresh]);

  async function act(run: () => Promise<void>) {
    try {
      await run();
    } catch {
      setProblem('action failed');
    }
    await refresh();
  }

  function select(id: number) {
    setDetail(null);
    setSelected((cur) => (cur === id ? null : id));
  }

  return (
    <aside className="panel" aria-label="Execution status">
      <section>
        <div className="panel-head">
          <h2>Engine</h2>
          {status && (
            <button type="button" onClick={() => void act(() => setPaused(!status.paused))}>
              {status.paused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
        <p className="muted">
          {status
            ? `${status.paused ? 'paused' : 'running'} · active ${status.active}/${status.concurrency} · ${counts(status.counts)}`
            : 'loading'}
        </p>
        {problem && <p className="error">{problem}</p>}
      </section>

      <section>
        <h2>Plans</h2>
        {plans.length === 0 ? (
          <p className="muted">none</p>
        ) : (
          <ul className="rows">
            {plans.map((p) => (
              <li key={p.id}>
                #{p.id} {p.name ?? '(unnamed)'}{' '}
                <span className={`tag ${p.status}`}>{p.status}</span>
                <span className="muted"> {counts(p.counts)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Tasks</h2>
        {tasks.length === 0 ? (
          <p className="muted">none</p>
        ) : (
          <ul className="rows">
            {tasks.map((t) => (
              <li key={t.id} className="task-row">
                <button
                  type="button"
                  className="link"
                  aria-pressed={selected === t.id}
                  onClick={() => select(t.id)}
                >
                  #{t.id} {t.key}
                </button>
                <span className={`tag ${t.status}`}>{t.status}</span>
                {CANCELLABLE.includes(t.status) && !t.cancelRequested && (
                  <button
                    type="button"
                    aria-label={`Cancel task ${t.id}`}
                    onClick={() => void act(() => cancelTask(t.id))}
                  >
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail && (
        <section aria-label={`Task ${detail.task.id} detail`}>
          <h2>
            Task #{detail.task.id} {detail.task.key}
          </h2>
          <dl>
            <dt>type</dt>
            <dd>{detail.task.type}</dd>
            <dt>status</dt>
            <dd>
              {detail.task.status}
              {detail.task.cancelRequested ? ' (cancel requested)' : ''}
            </dd>
            <dt>attempts</dt>
            <dd>
              {detail.task.attempts}/{detail.task.maxAttempts}
            </dd>
            <dt>created</dt>
            <dd>{time(detail.task.createdAt)}</dd>
            <dt>started</dt>
            <dd>{time(detail.task.startedAt)}</dd>
            <dt>completed</dt>
            <dd>{time(detail.task.completedAt)}</dd>
            <dt>duration</dt>
            <dd>{duration(detail.task)}</dd>
            {detail.task.dependsOn.length > 0 && (
              <>
                <dt>depends on</dt>
                <dd>{detail.task.dependsOn.map((d) => `#${d}`).join(', ')}</dd>
              </>
            )}
          </dl>
          {detail.task.result !== null && (
            <pre className="block" aria-label="Task result">
              result: {JSON.stringify(detail.task.result, null, 2)}
            </pre>
          )}
          {detail.task.error && (
            <pre className="block error" aria-label="Task error">
              error: {detail.task.error.code}: {detail.task.error.message}
            </pre>
          )}
          <pre className="block" aria-label="Task logs">
            {detail.events
              .map((e) =>
                e.type === 'task.log'
                  ? `${time(e.at)} log ${String(e.data.level)}: ${String(e.data.message)}`
                  : `${time(e.at)} ${String(e.data.from)} -> ${String(e.data.to)}`,
              )
              .join('\n') || 'no events'}
          </pre>
        </section>
      )}
    </aside>
  );
}
