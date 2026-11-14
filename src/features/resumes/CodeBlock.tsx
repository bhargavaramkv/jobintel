/** Read-only, line-numbered source listing. */
export function CodeBlock({ source, label }: { source: string; label: string }) {
  const lines = source.replace(/\n$/, '').split('\n')
  return (
    <pre className="code" aria-label={label} tabIndex={0}>
      {lines.map((line, i) => (
        <span key={i} className="code__line">
          <span className="code__no" aria-hidden="true">{i + 1}</span>
          {line}
        </span>
      ))}
    </pre>
  )
}
