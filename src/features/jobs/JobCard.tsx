import { ChevronDown, ExternalLink, MapPin } from 'lucide-react'
import { useId, useState } from 'react'
import { ATS_LABEL, type Job } from '../../domain/jobs/feedSchema'
import { relativeTime } from '../../domain/jobs/filters'

const WORK_MODE_LABEL = { onsite: 'Onsite', hybrid: 'Hybrid', remote: 'Remote', unknown: 'Work mode not stated' } as const

export function JobCard({ job, now, isNew }: { job: Job; now: Date; isNew: boolean }) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const where = [...job.cities.filter((c) => c !== 'Other India'), ...(job.remoteIndia ? ['Remote (India)'] : [])]
  const locationText = where.length ? where.join(' · ') : job.locations.join(' · ')

  return (
    <article className={job.status === 'closed' ? 'job is-closed' : 'job'} aria-labelledby={`${detailsId}-title`}>
      <div className="job__main">
        <div className="job__head">
          <h3 id={`${detailsId}-title`} className="job__title">
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              {job.title}
              <ExternalLink size={13} aria-hidden="true" />
              <span className="sr-only"> (opens the original posting in a new tab)</span>
            </a>
          </h3>
          <div className="job__badges">
            {isNew && job.status === 'open' && <span className="badge badge--accent">New</span>}
            {job.status === 'closed' && <span className="badge">Closed</span>}
          </div>
        </div>
        <p className="job__company">{job.company}</p>
        <p className="job__meta">
          <span title={job.locations.join(' / ')}>
            <MapPin size={13} aria-hidden="true" /> {locationText}
          </span>
          <span>{WORK_MODE_LABEL[job.workMode]}</span>
          {job.department && <span>{job.department}</span>}
        </p>
        <p className="job__source mono">
          {ATS_LABEL[job.ats]} · {job.postedAt ? `posted ${relativeTime(job.postedAt, now)}` : 'post date not stated'} · first seen{' '}
          {relativeTime(job.firstSeenAt, now)} · verified {relativeTime(job.lastVerifiedAt, now)}
          {job.closedAt && ` · closed ${relativeTime(job.closedAt, now)}`}
        </p>
      </div>
      <button
        type="button"
        className="btn btn--ghost btn--sm job__toggle"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide details' : 'Details'}
        <ChevronDown size={14} aria-hidden="true" className={open ? 'rot' : undefined} />
      </button>
      {open && (
        <div id={detailsId} className="job__details">
          {job.requirements.length > 0 && (
            <>
              <h4 className="eyebrow">Requirements as listed</h4>
              <ul>
                {job.requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}
          <h4 className="eyebrow">Description excerpt</h4>
          <p className="job__desc">{job.description || 'No description provided by the source.'}</p>
          <p className="field__hint">
            Excerpt from the public posting. Read the{' '}
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              original listing
            </a>{' '}
            for full details before applying.
          </p>
        </div>
      )}
    </article>
  )
}
