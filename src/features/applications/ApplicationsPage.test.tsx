import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { trackedFromJob } from '../../app/appState'
import { renderPage, seedStorage, storedState } from '../../test/appFixture'
import { makeJob } from '../../test/feedFixture'
import { ApplicationsPage } from './ApplicationsPage'

const page = <ApplicationsPage />
const tracked = () => [
  trackedFromJob(makeJob({ sourceId: 'be', title: 'Senior Backend Engineer', company: 'Acme Corp' }), new Date('2026-11-10T00:00:00Z')),
  trackedFromJob(makeJob({ sourceId: 'fe', title: 'Frontend Engineer', company: 'Globex' }), new Date('2026-11-12T00:00:00Z')),
]

describe('Applications', () => {
  it('shows an empty state that links to Jobs', () => {
    renderPage(page, { route: '/applications' })
    expect(screen.getByText('No tracked jobs yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse jobs' })).toHaveAttribute('href', '/jobs')
  })

  it('lists tracked jobs with title, company, date, status and a link to the job', () => {
    seedStorage({ tracked: tracked() })
    renderPage(page, { route: '/applications' })
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Senior Backend Engineer')
    expect(items[0]).toHaveTextContent('Acme Corp')
    expect(items[0]).toHaveTextContent(/Tracked .*2026/)
    expect(screen.getAllByText('Saved', { selector: '.badge' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'View job' })[0]).toHaveAttribute('href', '/jobs/greenhouse%3Aacme%3Abe')
  })

  it('a status change is saved to localStorage and survives a reload', async () => {
    seedStorage({ tracked: tracked() })
    const user = userEvent.setup()
    const first = renderPage(page, { route: '/applications' })
    await user.selectOptions(screen.getByLabelText('Status for Senior Backend Engineer, Acme Corp'), 'interview')
    expect(storedState()?.tracked.find((t) => t.jobId.endsWith(':be'))?.status).toBe('interview')
    expect(screen.getByText('Interview', { selector: '.badge' })).toBeInTheDocument()
    first.unmount()

    renderPage(page, { route: '/applications' })
    expect(screen.getByLabelText('Status for Senior Backend Engineer, Acme Corp')).toHaveValue('interview')
  })

  it('offers exactly the five statuses', () => {
    seedStorage({ tracked: tracked() })
    renderPage(page, { route: '/applications' })
    const select = screen.getByLabelText('Status for Frontend Engineer, Globex') as HTMLSelectElement
    expect([...select.options].map((o) => o.textContent)).toEqual(['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'])
  })

  it('saves notes', async () => {
    seedStorage({ tracked: tracked() })
    const user = userEvent.setup()
    renderPage(page, { route: '/applications' })
    await user.type(screen.getByLabelText('Notes for Frontend Engineer, Globex'), 'Call recruiter')
    expect(storedState()?.tracked.find((t) => t.jobId.endsWith(':fe'))?.notes).toBe('Call recruiter')
  })

  it('removes a job', async () => {
    seedStorage({ tracked: tracked() })
    const user = userEvent.setup()
    renderPage(page, { route: '/applications' })
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(storedState()?.tracked).toHaveLength(1)
    expect(screen.queryByText('Senior Backend Engineer')).not.toBeInTheDocument()
  })
})
