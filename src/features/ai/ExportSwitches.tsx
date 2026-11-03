import { useId } from 'react'
import { MAX_TOP_MATCHES, type ExportOptions } from '../../domain/ai/context'

type Switch = Exclude<keyof ExportOptions, 'topMatches'>
const SWITCHES: Array<{ key: Switch; label: string; hint: string; sensitive?: boolean; needs?: Switch }> = [
  { key: 'profile', label: 'Profile preferences', hint: 'Skills, target roles and seniority, locations, work modes, company types, target companies, years of experience, summary.' },
  { key: 'identity', label: 'Identifying details', hint: 'Your name, current and past employers, schools. Off by default.', sensitive: true, needs: 'profile' },
  { key: 'compensation', label: 'Compensation and notice period', hint: 'Off by default.', sensitive: true, needs: 'profile' },
  { key: 'pipeline', label: 'Jobs in your pipeline', hint: 'Shortlisted through offer: the public posting text and the match breakdown.' },
  { key: 'applications', label: 'Application history', hint: 'Stages, dates, interviews, follow-up dates and Not-interested reasons. No notes.' },
  { key: 'notes', label: 'Your private notes', hint: 'Free-text notes, next actions, interview notes and company feedback. Off by default.', sensitive: true },
  { key: 'referrals', label: 'Referral leads', hint: 'Relationship type and confidence plus message counts, only for leads at companies in your pipeline or targets. No contact details, notes or messages.' },
  { key: 'resume', label: 'Your resume', hint: 'The resume stored under Automation. Used for fit and tailoring suggestions.' },
  { key: 'referralNames', label: 'Names of referral leads', hint: 'Off by default. Recommendations rarely need names.', sensitive: true, needs: 'referrals' },
]

/** The "what to share" switches, used by the manual export and by automation. */
export function ExportSwitches({
  options,
  onChange,
  className,
}: {
  options: ExportOptions
  onChange: <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => void
  className?: string
}) {
  const idPrefix = useId()
  return (
    <fieldset className={`ai-switches ${className ?? ''}`}>
      <legend className="sr-only">Data to include in the AI context</legend>
      {SWITCHES.map((s) => {
        const blocked = s.needs ? !options[s.needs] : false
        return (
          <label key={s.key} className={`ai-switch${blocked ? ' is-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={options[s.key] && !blocked}
              disabled={blocked}
              onChange={(e) => onChange(s.key, e.target.checked)}
            />
            <span>
              <strong>{s.label}</strong>
              {s.sensitive && <span className="badge badge--warning ai-switch__tag">Sensitive</span>}
              <span className="field__hint">{s.hint}</span>
            </span>
          </label>
        )
      })}
      <div className="ai-switch ai-switch--number">
        <label htmlFor={`${idPrefix}-top-matches`}>
          <strong>Best-fit open jobs to include</strong>
          <span className="field__hint">Undecided open jobs ranked by the deterministic match engine. 0 shares none.</span>
        </label>
        <input
          id={`${idPrefix}-top-matches`}
          className="input ai-number"
          type="number"
          min={0}
          max={MAX_TOP_MATCHES}
          value={options.topMatches}
          onChange={(e) => onChange('topMatches', Math.max(0, Math.min(MAX_TOP_MATCHES, Math.floor(Number(e.target.value) || 0))))}
        />
      </div>
    </fieldset>
  )
}
