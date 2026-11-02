import { BAND_LABEL, type MatchResult } from '../../domain/match/score'

/** Compact score pill shown on each job card. */
export function MatchPill({ match }: { match: MatchResult }) {
  if (match.score === null) return <span className="badge" title="Not enough data to score this job">Fit: n/a</span>
  return (
    <span
      className={`badge match-pill match-pill--${match.band}`}
      title={`${BAND_LABEL[match.band]} · based on ${match.coverage}% of the weighted factors`}
    >
      Fit {match.score}
      {match.band === 'unknown' && '?'}
    </span>
  )
}

/** Full, explained breakdown: every factor with its weight, value and evidence. */
export function MatchBreakdown({ match }: { match: MatchResult }) {
  return (
    <section className="match" aria-label="Fit breakdown">
      <p className="match__head">
        <strong>{match.score === null ? 'Not scored' : `${match.score}/100 · ${BAND_LABEL[match.band]}`}</strong>
        <span className="mono muted"> · evidence for {match.coverage}% of the weight</span>
      </p>
      <ul className="match__factors">
        {match.factors.map((f) => (
          <li key={f.id} className={f.value === null ? 'is-unknown' : undefined}>
            <span className="match__label">
              {f.label} <span className="mono muted">{f.weight}%</span>
            </span>
            <span className="match__bar" aria-hidden="true">
              <span style={{ width: `${Math.round((f.value ?? 0) * 100)}%` }} />
            </span>
            <span className="mono match__val">{f.value === null ? 'no data' : `${Math.round(f.value * 100)}%`}</span>
            <span className="match__summary">
              {f.summary}
              {f.matched.length > 0 && f.id === 'skills' && <span className="match__ok"> · Have: {f.matched.join(', ')}</span>}
              {f.missing.length > 0 && <span className="match__miss"> · Missing: {f.missing.join(', ')}</span>}
            </span>
          </li>
        ))}
      </ul>
      {match.notes.map((n) => (
        <p key={n} className="field__hint match__note">
          {n}
        </p>
      ))}
      <p className="field__hint">
        Calculated in your browser from your profile and the posting text. Factors marked “no data” are left out of the score,
        not counted as a match. Skills are matched by name, so read the posting before deciding.
      </p>
    </section>
  )
}
