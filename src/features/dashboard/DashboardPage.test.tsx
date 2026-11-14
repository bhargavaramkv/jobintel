import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { trackedFromJob } from '../../app/appState'
import { backendProfile, renderPage, seedStorage } from '../../test/appFixture'
import { makeFeed, makeJob, mockFetchFeed } from '../../test/feedFixture'
import { DashboardPage } from './DashboardPage'

const page = <DashboardPage />
const kpi = (label: RegExp | string) => screen.getByText(label).closest('.kpi') as HTMLElement

describe('Dashboard', () => {
  it('invites a new user to Setup and shows feed numbers without matches', async () => {
    renderPage(page)
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Set up your profile to get started')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start setup' })).toHaveAttribute('href', '/onboarding')
    expect(await screen.findByText('Complete Setup to see your best matches.')).toBeInTheDocument()
    expect(within(kpi('Open jobs')).getByText('3')).toBeInTheDocument()
    expect(kpi('Tracked applications')).toHaveTextContent('0')
  })

  it('shows feed stats, readiness, top matches and tracked count for a user with a profile', async () => {
    seedStorage({
      profile: backendProfile(),
      prefs: { minScore: 0 },
      tracked: [trackedFromJob(makeJob({ sourceId: 'be' })), trackedFromJob(makeJob({ sourceId: 'fe' }))],
    })
    renderPage(page)
    expect(screen.queryByText('Set up your profile to get started')).not.toBeInTheDocument()
    const top = await screen.findByRole('heading', { name: 'Top matches' })
    const list = within(top.closest('section')!).getByRole('list')
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(0)
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Senior Backend Engineer')
    expect(within(list).getAllByRole('link')[0]).toHaveAttribute('href', '/jobs/greenhouse%3Aacme%3Abe')
    expect(kpi('Open jobs')).toHaveTextContent('3')
    expect(kpi(/^Matching/)).toHaveTextContent('3')
    expect(kpi('Tracked applications')).toHaveTextContent('2')
    expect(kpi('Last scan')).not.toHaveTextContent('Unknown')
    expect(screen.getByRole('progressbar', { name: 'Profile readiness' })).toHaveAttribute('aria-valuenow', '100')
  })

  it('counts only jobs at or above the minimum score', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 100 } })
    renderPage(page)
    expect(await screen.findByText(/No jobs score 100 or higher/)).toBeInTheDocument()
    expect(kpi(/^Matching \(score 100\+\)/)).toHaveTextContent('0')
  })

  it('shows at most five top matches', async () => {
    const jobs = Array.from({ length: 8 }, (_, i) => makeJob({ sourceId: `j${i}`, title: `Backend Engineer ${i}`, requirements: ['C#', '.NET'] }))
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    renderPage(page, { fetchImpl: mockFetchFeed(makeFeed(jobs)) })
    const top = await screen.findByRole('heading', { name: 'Top matches' })
    expect(within(top.closest('section')!).getAllByRole('listitem')).toHaveLength(5)
  })

  it('shows an error with Retry when the feed is unavailable', async () => {
    renderPage(page, { feed: null })
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be downloaded/)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
