import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backendProfile, renderPage, seedStorage, storedState, testFeed } from '../../test/appFixture'
import { mockFetchFeed } from '../../test/feedFixture'
import { DiscoveryPage } from './DiscoveryPage'

const opts = { path: '/jobs/:jobId?' }
const page = <DiscoveryPage />
const rows = () => screen.getAllByRole('link').filter((a) => a.classList.contains('select-row'))
const location = () => screen.getByTestId('location').textContent
const ID = 'greenhouse:acme:be'

describe('Jobs', () => {
  it('shows a loading state, then the open jobs with company, city, mode and score', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    renderPage(page, { ...opts, route: '/jobs' })
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(await screen.findByText('3 of 3 jobs')).toBeInTheDocument()
    const first = rows()[0]
    expect(first).toHaveTextContent('Acme Corp, Senior Backend Engineer')
    expect(first).toHaveTextContent('Bengaluru')
    expect(first).toHaveTextContent('Hybrid')
    expect(within(first).getByRole('img', { name: /Match score \d+ out of 100/ })).toBeInTheDocument()
    expect(screen.queryByText(/Closed Backend/)).not.toBeInTheDocument()
  })

  it('shows an error with Retry when the feed cannot be loaded, and recovers', async () => {
    const user = userEvent.setup()
    let calls = 0
    const fetchImpl = (async (...a: Parameters<typeof fetch>) => mockFetchFeed(calls++ === 0 ? null : testFeed())(...a)) as typeof fetch
    renderPage(page, { ...opts, route: '/jobs', fetchImpl })
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be downloaded/)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('3 of 3 jobs')).toBeInTheDocument()
  })

  it('searches title, company and description', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/jobs' })
    const search = await screen.findByLabelText('Search')
    await user.type(search, 'globex')
    expect(rows()).toHaveLength(1)
    expect(location()).toBe('/jobs?q=globex')
    await user.clear(search)
    await user.type(search, 'PYTHON')
    expect(rows()[0]).toHaveTextContent('Data Scientist')
    await user.clear(search)
    await user.type(search, 'sql server')
    expect(rows()[0]).toHaveTextContent('Senior Backend Engineer')
  })

  it('filters by city and work mode and keeps them in the URL', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/jobs' })
    await user.selectOptions(await screen.findByLabelText('City'), 'Hyderabad')
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('Frontend Engineer')
    await user.selectOptions(screen.getByLabelText('City'), '')
    await user.selectOptions(screen.getByLabelText('Work mode'), 'onsite')
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('Data Scientist')
    expect(location()).toBe('/jobs?mode=onsite')
  })

  it('reads the filters from the URL', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    renderPage(page, { ...opts, route: '/jobs?q=engineer&city=Hyderabad&mode=remote&sort=newest&min=0' })
    expect(await screen.findByText('1 of 3 jobs')).toBeInTheDocument()
    expect(screen.getByLabelText('Search')).toHaveValue('engineer')
    expect(screen.getByLabelText('City')).toHaveValue('Hyderabad')
    expect(screen.getByLabelText('Work mode')).toHaveValue('remote')
    expect(screen.getByLabelText('Sort by')).toHaveValue('newest')
  })

  it('sorts by newest', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/jobs' })
    await user.selectOptions(await screen.findByLabelText('Sort by'), 'newest')
    expect(rows().map((r) => r.textContent)).toEqual([
      expect.stringContaining('Frontend Engineer'),
      expect.stringContaining('Data Scientist'),
      expect.stringContaining('Senior Backend Engineer'),
    ])
  })

  it('filters by minimum score and applies the saved minimum by default', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 100 } })
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/jobs' })
    expect(await screen.findByText('No jobs match these filters')).toBeInTheDocument()
    expect(screen.getByText(/Your minimum match score is 100/)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Minimum match score'), '0')
    expect(rows()).toHaveLength(3)
  })

  it('shows an empty result with a Clear filters button that works', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/jobs?q=nothing-matches-this' })
    expect(await screen.findByText('No jobs match these filters')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' }).at(-1)!)
    expect(rows()).toHaveLength(3)
    expect(location()).toBe('/jobs')
  })

  it('shows the detail with the breakdown, skills and a safe external posting link', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    renderPage(page, { ...opts, route: `/jobs/${encodeURIComponent(ID)}` })
    expect(await screen.findByRole('heading', { level: 2, name: 'Senior Backend Engineer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Match breakdown' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Technical skills' })).toBeInTheDocument()
    expect(screen.getByText('Matched skills')).toBeInTheDocument()
    expect(screen.getByText('Missing skills')).toBeInTheDocument()
    expect(screen.getByText(/payment services in C#/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Open posting/ })
    expect(link).toHaveAttribute('href', 'https://example.com/jobs/be')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('says so when the job is not in the feed', async () => {
    renderPage(page, { ...opts, route: '/jobs/gone' })
    expect(await screen.findByText(/not in the current feed/)).toBeInTheDocument()
  })

  it('Track adds a Saved application once', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: `/jobs/${encodeURIComponent(ID)}` })
    await user.click(await screen.findByRole('button', { name: 'Track' }))
    expect(storedState()?.tracked).toEqual([expect.objectContaining({ jobId: ID, title: 'Senior Backend Engineer', company: 'Acme Corp', status: 'saved' })])
    expect(screen.getByRole('link', { name: 'Tracked: view in Applications' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Track' })).not.toBeInTheDocument()
  })

  it('invites the user to Setup when there is no profile, and still lists jobs', async () => {
    renderPage(page, { ...opts, route: '/jobs' })
    expect(await screen.findByText('3 of 3 jobs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Setup' })).toBeInTheDocument()
    expect(screen.getAllByText('No score').length).toBe(3)
  })
})
