export function ScoreMeter({ score }: { score: number | null }) {
  if (score === null) return <span className="muted mono">No score</span>
  const band = score >= 85 ? 'high' : score >= 70 ? 'mid' : 'low'
  return (
    <span className="score-meter" role="img" aria-label={`Match score ${score} out of 100`}>
      <span className="score-meter__track" aria-hidden="true">
        <span className="score-meter__fill" data-band={band} style={{ width: `${score}%` }} />
      </span>
      <span className="score-meter__value" aria-hidden="true">{score}</span>
    </span>
  )
}
