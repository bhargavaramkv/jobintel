import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backendProfile, seedStorage, storedState, testFeed } from '../test/appFixture'
import { mockFetchFeed } from '../test/feedFixture'
import { App } from './App'

const ROUTES: Array<[string, string]> = [
  ['#/', 'Dashboard'],
  ['#/onboarding', 'Setup'],
  ['#/resumes', 'Resumes'],
  ['#/jobs', 'Jobs'],
  ['#/applications', 'Applications'],
  ['#/settings', 'Settings'],
]

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetchFeed(testFeed()))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderAt(hash: string) {
  window.location.hash = hash
  return render(<App />)
}

const goTo = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name }))

describe('App routes', () => {
  it.each(ROUTES)('renders %s with its h1', async (hash, title) => {
    renderAt(hash)
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('redirects unknown routes and the removed /activity route to the Dashboard', async () => {
    const view = renderAt('#/nope/never')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    view.unmount()
    renderAt('#/activity')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/')
  })

  it('has the six navigation links and no scenario, reset or prototype controls', async () => {
    renderAt('#/')
    const nav = await screen.findByRole('navigation', { name: 'Primary' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual([
      expect.stringContaining('Dashboard'),
      expect.stringContaining('Setup'),
      expect.stringContaining('Resumes'),
      expect.stringContaining('Jobs'),
      expect.stringContaining('Applications'),
      expect.stringContaining('Settings'),
    ])
    expect(screen.queryByRole('combobox', { name: 'Scenario' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reset/ })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/prototype|simulat|mock|demo/i)
  })

  it('renders when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const user = userEvent.setup()
    renderAt('#/settings')
    await user.type(await screen.findByLabelText('Current title'), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText(/could not be saved in this browser/)).toBeInTheDocument()
  })
})

describe('profile saved in this browser', () => {
  it('survives a reload', async () => {
    const user = userEvent.setup()
    const first = renderAt('#/settings')
    await user.type(await screen.findByLabelText('Current title'), 'Platform Engineer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Settings saved in this browser')).toBeInTheDocument()
    expect(storedState()?.profile?.currentTitle).toBe('Platform Engineer')
    first.unmount()

    renderAt('#/settings')
    expect(await screen.findByLabelText('Current title')).toHaveValue('Platform Engineer')
  })
})

describe('Settings minimum score drives Jobs', () => {
  it('hides jobs below the saved minimum', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 0 } })
    const user = userEvent.setup()
    renderAt('#/jobs')
    expect(await screen.findByText('3 of 3 jobs')).toBeInTheDocument()

    await goTo(user, 'Settings')
    await screen.findByRole('heading', { level: 1, name: 'Settings' })
    const field = await screen.findByLabelText('Minimum match score')
    await user.clear(field)
    await user.type(field, '100')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(storedState()?.prefs.minScore).toBe(100)

    await goTo(user, 'Jobs')
    expect(await screen.findByText('0 of 3 jobs')).toBeInTheDocument()
    expect(screen.getByText('No jobs match these filters')).toBeInTheDocument()
    expect(screen.getByLabelText('Minimum match score')).toHaveValue('100')
  })

  it('rejects a minimum score outside 0 to 100 inline', async () => {
    const user = userEvent.setup()
    renderAt('#/settings')
    const field = await screen.findByLabelText('Minimum match score')
    await user.clear(field)
    await user.type(field, '150')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/0 to 100/)
    expect(storedState()).toBeNull()
  })
})
