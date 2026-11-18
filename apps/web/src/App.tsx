import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { executionEventSchema } from '@jobintel/contracts';
import { formatEvent, postCommand } from './api';
import { StatusPanel } from './StatusPanel';

type Line = { id: number; kind: 'input' | 'output' | 'error' | 'event'; text: string };
type Connection = 'connecting' | 'live' | 'reconnecting';

const MAX_LINES = 500;

export function App() {
  const [lines, setLines] = useState<Line[]>([
    { id: 0, kind: 'output', text: 'Type /help to list commands.' },
  ]);
  const [value, setValue] = useState('');
  const [connection, setConnection] = useState<Connection>('connecting');
  const [tick, setTick] = useState(0);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const lastEventIdRef = useRef(0);
  const history = useRef<string[]>([]);
  const historyPos = useRef(0);
  const draft = useRef('');

  const addLine = (kind: Line['kind'], text: string) =>
    setLines((prev) => [...prev, { id: nextId.current++, kind, text }].slice(-MAX_LINES));

  useEffect(() => {
    logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight });
  }, [lines]);

  // The browser's EventSource reconnects by itself and resends Last-Event-ID.
  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onopen = () => {
      setConnection('live');
      setTick((n) => n + 1);
    };
    source.onerror = () => setConnection('reconnecting');
    source.onmessage = (message: MessageEvent<string>) => {
      let parsed;
      try {
        parsed = executionEventSchema.safeParse(JSON.parse(message.data));
      } catch {
        return;
      }
      if (!parsed.success || parsed.data.id <= lastEventIdRef.current) return;
      lastEventIdRef.current = parsed.data.id;
      addLine('event', formatEvent(parsed.data));
      setTick((n) => n + 1);
    };
    return () => source.close();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const command = value.trim();
    if (!command) return;
    setValue('');
    if (history.current[history.current.length - 1] !== command) history.current.push(command);
    historyPos.current = history.current.length;
    draft.current = '';
    addLine('input', `> ${command}`);
    const result = await postCommand(command);
    addLine(result.ok ? 'output' : 'error', result.ok ? result.output : result.text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const past = history.current;
    if (event.key === 'ArrowUp' && historyPos.current > 0) {
      event.preventDefault();
      if (historyPos.current === past.length) draft.current = value;
      historyPos.current -= 1;
      setValue(past[historyPos.current] ?? '');
    } else if (event.key === 'ArrowDown' && historyPos.current < past.length) {
      event.preventDefault();
      historyPos.current += 1;
      setValue(
        historyPos.current === past.length ? draft.current : (past[historyPos.current] ?? ''),
      );
    }
  }

  return (
    <div className="app">
      <header className="header">
        <span>JobIntel</span>
        <span className="conn" data-state={connection} role="status">
          {connection}
        </span>
      </header>
      <div className="log" ref={logRef} role="log" aria-label="Output" aria-live="polite">
        {lines.map((line) => (
          <pre key={line.id} className={`line ${line.kind}`}>
            {line.text}
          </pre>
        ))}
      </div>
      <form className="prompt" onSubmit={onSubmit}>
        <input
          aria-label="Command"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Enter a command, for example /help"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
        />
      </form>
      <StatusPanel tick={tick} />
    </div>
  );
}
