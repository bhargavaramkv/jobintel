import { useApp } from '../../app/appContext'
import { PageHeader } from '../../components/layout/PageHeader'
import { CodeBlock } from './CodeBlock'
import { MasterUpload } from './MasterUpload'

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function ResumesPage() {
  const { resume } = useApp()
  return (
    <div className="stack">
      <PageHeader title="Resumes" subtitle="Your master resume as LaTeX, saved in this browser only." />
      {!resume ? (
        <div className="empty">
          <p className="empty__title">No master resume yet</p>
          <p className="empty__text">Upload your resume as a .tex file. Setup uses it to suggest roles and skills.</p>
          <MasterUpload />
        </div>
      ) : (
        <section className="panel" aria-labelledby="master-title">
          <div className="panel__header">
            <h2 id="master-title" className="panel__title">{resume.name}</h2>
          </div>
          <div className="panel__body stack">
            <p className="muted mono">
              {(resume.size / 1024).toFixed(1)} KB, last updated {formatDateTime(resume.uploadedAt)}
            </p>
            <MasterUpload replace />
            <CodeBlock source={resume.tex} label="Master resume source" />
          </div>
        </section>
      )}
    </div>
  )
}
