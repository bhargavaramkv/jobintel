import { useEffect, useRef, useState, type FormEvent } from 'react';
import { healthResponseSchema } from '@jobintel/contracts';

type Line = { id: number; kind: 'input' | 'output' | 'error'; text: string };

const HELP = [
  'Commands:',
  '  help    list commands',
  '  status  check API and database health',
].join('\n');

async function runCommand(command: string): Promise<{ text: string; error?: boolean }> {
  switch (command) {
    case 'help':
      return { text: HELP };
    case 'status':
      try {
        const res = await fetch('/api/health');
        const health = healthResponseSchema.parse(await res.json());
        return {
          text: `api: ${health.status}\ndatabase: ${health.database}\nversion: ${health.version}\ntime: ${health.time}`,
          error: health.database !== 'ok',
        };
      } catch {
        return {
          text: 'status failed: API unreachable or returned an invalid response',
          error: true,
        };
      }
    default:
      return { text: `Unknown command: ${command}. Type "help" for commands.`, error: true };
  }
}

export function App() {
  const [lines, setLines] = useState<Line[]>([
    { id: 0, kind: 'output', text: 'Type "help" to list commands.' },
  ]);
  const [value, setValue] = useState('');
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight });
  }, [lines]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const command = value.trim().toLowerCase();
    if (!command) return;
    setValue('');
    const inputId = nextId.current++;
    setLines((prev) => [...prev, { id: inputId, kind: 'input', text: `> ${command}` }]);
    const result = await runCommand(command);
    const outId = nextId.current++;
    setLines((prev) => [
      ...prev,
      { id: outId, kind: result.error ? 'error' : 'output', text: result.text },
    ]);
  }

  return (
    <div className="app">
      <header className="header">JobIntel</header>
      <div className="log" ref={logRef} role="log" aria-live="polite">
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
          placeholder="Enter a command"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
        />
      </form>
    </div>
  );
}
