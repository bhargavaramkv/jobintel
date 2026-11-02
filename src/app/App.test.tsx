import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { profileRepository } from '../storage/profileRepository'
import { completeProfile, freshDatabase, makeProfile } from '../test/helpers'
import { makeFeed, makeJob, mockFetchFeed } from '../test/feedFixture'
import { resetDatabaseConnection } from '../storage/db'
import { App } from './App'

function renderAt(hash: string) {
  window.location.hash = hash
  return render(<App />)
}

beforeEach(async () => {
  await freshDatabase()
  localStorage.clear()
  globalThis.fetch = mockFetchFeed(null) // no scan published yet
})

describe('Dashboard', () => {
  it('shows honest empty states and zero indicators', async () => {
    renderAt('#/')
    expect(await screen.findByText('No discovery scan has run yet')).toBeInTheDocument()
    const kpis = screen.getByRole('region', { name: 'Key indicators' })
    for (const label of ['New Jobs', 'Shortlisted', 'Referral Leads', 'Follow-ups']) {
      expect(within(kpis).getByText(label)).toBeInTheDocument()
    }
    expect(within(kpis).getAllByText('0')).toHaveLength(4)
    expect(screen.getByTestId('readiness-score')).toHaveTextContent('0%')
    expect(screen.getByText(/Activity will appear here/)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Complete profile/ })).toBeInTheDocument()
  })

  it('marks planned areas as unavailable rather than linking to them', async () => {
    renderAt('#/')
    const nav = await screen.findByRole('navigation', { name: 'Primary' })
    expect(within(nav).getByText(/Referrals, planned for Phase 4/)).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /Referrals/ })).toBeNull()
    expect(within(nav).getByRole('link', { name: 'Job Discovery' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('greets by display name and shows 100% when the profile is complete', async () => {
    await profileRepository.save(completeProfile())
    await resetDatabaseConnection()
    renderAt('#/')
    expect(await screen.findByText(/, Test$/)).toBeInTheDocument()
    expect(screen.getByTestId('readiness-score')).toHaveTextContent('100%')
    expect(screen.getByRole('link', { name: /Edit profile/ })).toBeInTheDocument()
  })
})

describe('Profile editor', () => {
  it('saves a partial profile that survives a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = renderAt('#/profile?section=identity')
    const title = await screen.findByLabelText('Current job title')
    await user.type(title, 'Backend Engineer')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Save profile/ }))
    expect(await screen.findByText(/Saved locally/)).toBeInTheDocument()

    unmount()
    await resetDatabaseConnection()
    renderAt('#/profile?section=identity')
    expect(await screen.findByLabelText('Current job title')).toHaveValue('Backend Engineer')
  })

  it('adds and removes skill tags with the keyboard and blocks duplicates', async () => {
    const user = userEvent.setup()
    renderAt('#/profile?section=skills')
    const input = await screen.findByLabelText('Primary skills')
    await user.type(input, 'React{Enter}Node.js,')
    const list = screen.getByRole('list', { name: 'Primary skills entries' })
    expect(within(list).getByText('React')).toBeInTheDocument()
    expect(within(list).getByText('Node.js')).toBeInTheDocument()

    await user.type(input, 'react{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('already in the list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)

    await user.clear(input)
    await user.type(input, '{Backspace}')
    expect(within(list).queryByText('Node.js')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Remove React' }))
    expect(within(list).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('prevents a skill from being both primary and secondary', async () => {
    const user = userEvent.setup()
    renderAt('#/profile?section=skills')
    await user.type(await screen.findByLabelText('Primary skills'), 'Go{Enter}')
    await user.type(screen.getByLabelText('Secondary skills'), 'go{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('already in primary skills')
  })

  it('shows inline validation errors and does not save invalid data', async () => {
    const user = userEvent.setup()
    renderAt('#/profile?section=identity')
    await user.type(await screen.findByLabelText('Years of experience'), '-3')
    await user.click(screen.getByRole('button', { name: /Save profile/ }))
    expect(await screen.findByText(/must be a non-negative number/)).toBeInTheDocument()
    expect(await profileRepository.get()).toBeNull()
  })

  it('warns before navigating away with unsaved changes', async () => {
    const user = userEvent.setup()
    renderAt('#/profile?section=identity')
    await user.type(await screen.findByLabelText('Current job title'), 'X')
    await user.click(screen.getByRole('link', { name: 'Dashboard' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText('Current job title')).toHaveValue('X')
  })

  it('requires typed confirmation before clearing local data', async () => {
    await profileRepository.save(completeProfile())
    await resetDatabaseConnection()
    const user = userEvent.setup()
    renderAt('#/profile?section=data')
    await user.click(await screen.findByRole('button', { name: /Clear data/ }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete all local data?' })
    const confirm = within(dialog).getByRole('button', { name: 'Delete permanently' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText(/Type DELETE/), 'DELETE')
    await user.click(confirm)
    expect(await screen.findByText(/All local JobIntel data was deleted/)).toBeInTheDocument()
    await waitFor(async () => expect(await profileRepository.get()).toBeNull())
  })
})

describe('Command palette', () => {
  it('opens with Ctrl+K and navigates to the profile', async () => {
    const user = userEvent.setup()
    renderAt('#/')
    await screen.findByText('No discovery scan has run yet')
    await user.keyboard('{Control>}k{/Control}')
    const input = await screen.findByRole('combobox', { name: 'Search commands' })
    await user.type(input, 'backup{Enter}')
    expect(await screen.findByRole('heading', { name: 'Data & privacy' })).toBeInTheDocument()
  })
})

describe('Job Discovery', () => {
  const now = new Date()
  const iso = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString()
  const feed = makeFeed(
    [
      makeJob({ sourceId: 'b1', title: 'Backend Engineer', firstSeenAt: iso(2) }),
      makeJob({ sourceId: 'h1', title: 'Full-Stack Engineer', company: 'Hydro Labs', cities: ['Hyderabad'], locations: ['Hyderabad'], workMode: 'hybrid', firstSeenAt: iso(5) }),
      makeJob({ sourceId: 'p1', title: 'Platform Engineer', cities: ['Pune'], locations: ['Pune'], firstSeenAt: iso(1) }),
      makeJob({ sourceId: 'c1', title: 'Closed Role Engineer', status: 'closed', closedAt: iso(1) }),
    ],
    iso(1),
  )

  beforeEach(async () => {
    globalThis.fetch = mockFetchFeed(feed)
    await profileRepository.save(makeProfile({ preferredLocations: ['Bengaluru', 'Hyderabad'], workModes: ['onsite', 'hybrid', 'remote'] }))
    await resetDatabaseConnection()
  })

  it('lists open jobs that fit profile preferences, with original links', async () => {
    renderAt('#/jobs')
    expect(await screen.findByRole('link', { name: /Backend Engineer/ })).toHaveAttribute('href', 'https://example.com/jobs/b1')
    expect(screen.getByRole('link', { name: /Backend Engineer/ })).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: /Full-Stack Engineer/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Platform Engineer/ })).toBeNull() // Pune not preferred
    expect(screen.queryByRole('link', { name: /Closed Role/ })).toBeNull()
    expect(screen.getByTestId('result-count')).toHaveTextContent('Showing 2 of 2')
  })

  it('can turn off profile preferences, search, and show details', async () => {
    const user = userEvent.setup()
    renderAt('#/jobs')
    await user.click(await screen.findByRole('switch', { name: 'Use my profile preferences' }))
    expect(screen.getByRole('link', { name: /Platform Engineer/ })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search jobs' }), 'hydro')
    expect(screen.getByTestId('result-count')).toHaveTextContent('Showing 1 of 1')
    await user.click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('3+ years C#')).toBeInTheDocument()
  })

  it('shows real new-job counts and jobs on the dashboard', async () => {
    renderAt('#/')
    const kpis = await screen.findByRole('region', { name: 'Key indicators' })
    await waitFor(() => expect(within(kpis).getByText('New Jobs').closest('.kpi')).toHaveTextContent('2'))
    expect(screen.getByText(/Discovery active/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View all 2 in Job Discovery/ })).toBeInTheDocument()
  })

  it('explains an empty feed honestly', async () => {
    globalThis.fetch = mockFetchFeed(null)
    renderAt('#/jobs')
    expect(await screen.findByText('No scan has run yet')).toBeInTheDocument()
  })
})
