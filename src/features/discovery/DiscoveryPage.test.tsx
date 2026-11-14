import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { matchJob } from '../../domain/match/score'
import { MOCK_JOBS } from '../../prototype/data/jobs'
import { MOCK_PROFILE } from '../../prototype/data/profile'
import { renderPage } from '../../test/renderPrototype'
import { DiscoveryPage } from './DiscoveryPage'

const page = <DiscoveryPage />
const opts = { path: '/jobs/:jobId?' }

describe('Discovery', () => {
  it('lists verdict tabs with counts', () => {
    renderPage(page, { ...opts, route: '/jobs' })
    expect(screen.getByRole('link', { name: 'Selected (5)' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Needs review (3)' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rejected (4)' })).toBeInTheDocument()
  })

  it('shows the agent reasons on the Rejected tab', async () => {
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/jobs' })
    await user.click(screen.getByRole('link', { name: /^Rejected \(/ }))
    expect(screen.getByText(/Security role; your targets are backend and full-stack/)).toBeInTheDocument()
  })

  it('shows the same score as matchJob for the mock profile', () => {
    renderPage(page, { ...opts, route: '/jobs' })
    const job = MOCK_JOBS.find((j) => j.company === 'Nimbus Ledger')!
    const expected = matchJob(job, MOCK_PROFILE).score
    expect(expected).not.toBeNull()
    const row = screen.getByRole('link', { name: /Nimbus Ledger/ })
    expect(within(row).getByRole('img', { name: `Match score ${expected} out of 100` })).toBeInTheDocument()
  })

  it('shows eligibility and skills in the detail', () => {
    renderPage(page, { ...opts, route: '/jobs/greenhouse%3Akestrel%3A5120?verdict=selected' })
    expect(within(screen.getByRole('list', { name: 'Eligibility' })).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByRole('row', { name: /Kubernetes Missing/ })).toBeInTheDocument()
  })

  it('Queue application creates a queued application', async () => {
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/jobs/lever%3Acorvid%3A93?verdict=rejected' })
    await user.click(screen.getByRole('button', { name: 'Queue application' }))
    expect(screen.getByRole('link', { name: /Already queued/ })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Simulated: application queued/)
  })

  it('shows the empty state for a new user', () => {
    renderPage(page, { ...opts, route: '/jobs', scenario: 'empty' })
    expect(screen.getByText('No jobs discovered yet')).toBeInTheDocument()
  })
})
