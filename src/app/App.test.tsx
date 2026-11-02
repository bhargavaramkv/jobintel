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
    for (const label of ['New Jobs', 'Applied', 'Referral Leads', 'Follow-ups']) {
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
    expect(within(nav).getByText(/Analytics, planned for Phase 8/)).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /Analytics/ })).toBeNull()
    expect(within(nav).getByRole('link', { name: 'Referrals' })).toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: /Review all 2 in Job Discovery/ })).toBeInTheDocument()
  })

  it('explains an empty feed honestly', async () => {
    globalThis.fetch = mockFetchFeed(null)
    renderAt('#/jobs')
    expect(await screen.findByText('No scan has run yet')).toBeInTheDocument()
  })
})

describe('Applied / Not interested / notes', () => {
  const now = new Date()
  const iso = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString()
  const feed = makeFeed(
    [
      makeJob({ sourceId: 'k1', title: 'Software Engineer 2', company: 'Kong', firstSeenAt: iso(1) }),
      makeJob({ sourceId: 'd1', title: 'Data Engineer', company: 'DataCo', firstSeenAt: iso(2) }),
      makeJob({ sourceId: 'd2', title: 'Senior Data Engineer', company: 'Other Co', firstSeenAt: iso(3) }),
      makeJob({ sourceId: 'b1', title: 'Backend Engineer', company: 'Other Co', firstSeenAt: iso(4) }),
      makeJob({ sourceId: 'x1', title: 'Platform Engineer', company: 'NopeCorp', firstSeenAt: iso(5) }),
    ],
    iso(1),
  )

  beforeEach(() => {
    globalThis.fetch = mockFetchFeed(feed)
  })

  const card = (title: RegExp) => screen.getByRole('link', { name: title }).closest('article') as HTMLElement

  it('marks a job applied, keeps it after reload, and lists it under Applied', async () => {
    const user = userEvent.setup()
    const { unmount } = renderAt('#/jobs')
    await screen.findByRole('link', { name: /Software Engineer 2/ })
    await user.click(within(card(/Software Engineer 2/)).getByRole('button', { name: /Mark applied/ }))
    // Leaves "To review"
    await waitFor(() => expect(screen.queryByRole('link', { name: /Software Engineer 2/ })).toBeNull())
    expect(screen.getByRole('tab', { name: /Applied/ })).toHaveTextContent('1')

    unmount()
    await resetDatabaseConnection()
    renderAt('#/jobs')
    await user.click(await screen.findByRole('tab', { name: /Applied/ }))
    const applied = card(/Software Engineer 2/)
    expect(within(applied).getByText(/Applied ·/)).toBeInTheDocument()

    // Add a private note
    await user.click(within(applied).getByRole('button', { name: /Add note/ }))
    await user.type(within(applied).getByLabelText('Private note'), 'Applied via careers page')
    await user.click(within(applied).getByRole('button', { name: 'Save note' }))
    expect(await within(applied).findByText(/Applied via careers page/)).toBeInTheDocument()

    // Undo returns it to review
    await user.click(within(applied).getByRole('button', { name: /Undo applied/ }))
    await user.click(screen.getByRole('tab', { name: /To review/ }))
    expect(await screen.findByRole('link', { name: /Software Engineer 2/ })).toBeInTheDocument()
  })

  it('learns from "not interested" reasons: hides a company and demotes similar roles', async () => {
    const user = userEvent.setup()
    renderAt('#/jobs')
    await screen.findByRole('link', { name: /Platform Engineer/ })

    await user.click(within(card(/Platform Engineer/)).getByRole('button', { name: /Not interested/ }))
    let dialog = await screen.findByRole('dialog', { name: 'Not interested' })
    await user.click(within(dialog).getByRole('checkbox', { name: /Not interested in this company/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Mark not interested' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await user.click(within(card(/^Data Engineer/)).getByRole('button', { name: /Not interested/ }))
    dialog = await screen.findByRole('dialog', { name: 'Not interested' })
    await user.click(within(dialog).getByRole('checkbox', { name: /Not my kind of role/ }))
    await user.type(within(dialog).getByLabelText(/Note/), 'No data roles')
    await user.click(within(dialog).getByRole('button', { name: 'Mark not interested' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Learned panel explains the rules; the similar "Senior Data Engineer" now ranks below Backend.
    expect(await screen.findByText(/Learned from your 2 decisions/)).toBeInTheDocument()
    const titles = screen.getAllByRole('article').map((a) => within(a).getByRole('heading').textContent ?? '')
    expect(titles.findIndex((t) => t.includes('Backend Engineer'))).toBeLessThan(titles.findIndex((t) => t.includes('Senior Data Engineer')))
    expect(within(card(/Senior Data Engineer/)).getByText(/Like roles you passed on: data/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Not interested/ }))
    expect(screen.getByRole('link', { name: /Platform Engineer/ })).toBeInTheDocument()
    expect(screen.getByText(/No data roles/)).toBeInTheDocument()
  })
})

describe('Matching and shortlist (Phase 3)', () => {
  const now = new Date()
  const iso = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString()
  const feed = makeFeed(
    [
      makeJob({ sourceId: 'm1', title: 'Backend Engineer II', requirements: ['3+ years with C# and .NET', 'SQL Server'], firstSeenAt: iso(3) }),
      makeJob({ sourceId: 'm2', title: 'Senior Frontend Engineer', requirements: ['7+ years with React and TypeScript'], firstSeenAt: iso(1) }),
    ],
    iso(1),
  )

  beforeEach(async () => {
    globalThis.fetch = mockFetchFeed(feed)
    await profileRepository.save(
      makeProfile({
        yearsExperience: 4,
        primarySkills: [{ name: 'C#' }, { name: 'ASP.NET Core' }, { name: 'SQL Server' }],
        targetRoles: ['Backend Engineer'],
        targetSeniority: ['SDE-2'],
        preferredLocations: ['Bengaluru'],
      }),
    )
    await resetDatabaseConnection()
  })

  const card = (title: RegExp) => screen.getByRole('link', { name: title }).closest('article') as HTMLElement

  it('ranks by fit and explains the score', async () => {
    const user = userEvent.setup()
    renderAt('#/jobs')
    await screen.findByRole('link', { name: /Backend Engineer II/ })
    const titles = screen.getAllByRole('article').map((a) => within(a).getByRole('heading').textContent ?? '')
    expect(titles[0]).toMatch(/Backend Engineer II/) // older but better fit
    expect(within(card(/Backend Engineer II/)).getByText(/Fit \d+/)).toBeInTheDocument()
    await user.click(within(card(/Senior Frontend/)).getByRole('button', { name: /Details/ }))
    const breakdown = within(card(/Senior Frontend/)).getByRole('region', { name: 'Fit breakdown' })
    expect(within(breakdown).getByText(/Missing: .*React/)).toBeInTheDocument()
    expect(within(breakdown).getByText(/you have 4 \(3 short\)/)).toBeInTheDocument()
  })

  it('shortlists a job and lists it under Shortlisted', async () => {
    const user = userEvent.setup()
    renderAt('#/jobs')
    await screen.findByRole('link', { name: /Backend Engineer II/ })
    await user.click(within(card(/Backend Engineer II/)).getByRole('button', { name: /Shortlist/ }))
    await waitFor(() => expect(screen.queryByRole('link', { name: /Backend Engineer II/ })).toBeNull())
    await user.click(screen.getByRole('tab', { name: /Shortlisted/ }))
    expect(within(card(/Backend Engineer II/)).getAllByText(/Shortlisted/).length).toBeGreaterThan(0)
  })
})

describe('Referral leads (Phase 4)', () => {
  beforeEach(async () => {
    await profileRepository.save(makeProfile({ currentCompany: 'Globex', pastEmployers: ['Initech'], targetCompanies: ['Acme Corp'] }))
    await resetDatabaseConnection()
  })

  it('requires a source, derives relationships from evidence, and persists leads', async () => {
    const user = userEvent.setup()
    const { unmount } = renderAt('#/referrals')
    expect(await screen.findByText('No referral leads yet')).toBeInTheDocument()
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument() // target company to cover

    await user.click(screen.getAllByRole('button', { name: /Add lead/ })[1])
    const dialog = await screen.findByRole('dialog', { name: 'Add referral lead' })
    expect(within(dialog).getByLabelText('Company')).toHaveValue('Acme Corp')
    await user.type(within(dialog).getByLabelText('Name'), 'Test Lead')
    // "Worked together" can't be ticked without a shared employer.
    expect(within(dialog).getByRole('checkbox', { name: /actually worked together/ })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: 'Save lead' }))
    expect(await within(dialog).findByText(/Add the link where you found this person/)).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/Where you found them/), 'https://example.com/team')
    await user.type(within(dialog).getByRole('textbox', { name: /Companies they list/ }), 'Initech{Enter}')
    expect(within(dialog).getByRole('checkbox', { name: /actually worked together/ })).toBeEnabled()
    await user.click(within(dialog).getByRole('button', { name: 'Save lead' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const lead = screen.getByRole('heading', { name: 'Test Lead' }).closest('article') as HTMLElement
    expect(within(lead).getByText('Former colleague')).toBeInTheDocument()
    expect(within(lead).getByText('Inferred')).toBeInTheDocument()
    expect(within(lead).getByRole('link', { name: 'example.com' })).toHaveAttribute('href', 'https://example.com/team')

    unmount()
    await resetDatabaseConnection()
    renderAt('#/referrals')
    expect(await screen.findByRole('heading', { name: 'Test Lead' })).toBeInTheDocument()
  })
})

describe('Outreach (Phase 5)', () => {
  const lead = {
    id: 'lead-1',
    name: 'Asha Rao',
    company: 'Acme Corp',
    role: 'Senior Backend Engineer',
    sourceUrl: 'https://example.com/team',
    pastCompanies: [],
    schools: ['State University'],
    knowsPersonally: false,
    workedTogether: false,
    status: 'new' as const,
    note: '',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }

  beforeEach(async () => {
    await profileRepository.save(makeProfile({ displayName: 'Test User', currentTitle: 'Software Engineer', schools: ['State University'] }))
    const { contactsRepository } = await import('../storage/contactsRepository')
    await contactsRepository.put(lead)
    await resetDatabaseConnection()
  })

  it('drafts from recorded context, copies, logs a sent message and schedules a follow-up', async () => {
    const user = userEvent.setup()
    renderAt('#/outreach?lead=lead-1')
    expect(await screen.findByRole('heading', { name: 'Why Asha Rao' })).toBeInTheDocument()
    expect(screen.getByText(/Alumni: ask for advice first\./)).toBeInTheDocument()
    const box = screen.getByLabelText(/Message \(edit freely\)/) as HTMLTextAreaElement
    await waitFor(() => expect(box.value).toContain('studied at State University'))
    expect(box.value).not.toMatch(/refer/i)

    await user.click(screen.getByRole('button', { name: /Copy/ }))
    expect(await screen.findByText(/Copied/)).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toContain('Hi Asha')

    await user.click(screen.getByRole('button', { name: /I sent it/ }))
    expect(await screen.findByText(/Logged as sent/)).toBeInTheDocument()
    expect(screen.getByText(/Next follow-up due/)).toBeInTheDocument()
    expect(screen.getByText(/Sent \d{4}-\d{2}-\d{2} · first message/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /They replied/ }))
    expect(await screen.findByText(/They replied: continue the conversation/)).toBeInTheDocument()
  })
})

describe('Applications (Phase 6)', () => {
  it('adds a manual application, blocks duplicates, records stage history and details', async () => {
    const user = userEvent.setup()
    const { unmount } = renderAt('#/applications')
    expect(await screen.findByText('No applications yet')).toBeInTheDocument()

    const add = async (title: string) => {
      await user.click(screen.getByRole('button', { name: /Add application/ }))
      const d = await screen.findByRole('dialog', { name: 'Add application' })
      await user.type(within(d).getByLabelText('Job title'), title)
      await user.type(within(d).getByLabelText('Company'), 'Example Co')
      await user.type(within(d).getByLabelText('Posting link'), 'https://example.com/jobs/9')
      await user.click(within(d).getByRole('button', { name: 'Add' }))
      return d
    }
    await add('Backend Engineer')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const app = () => screen.getByRole('heading', { name: /Backend Engineer/ }).closest('article') as HTMLElement
    expect(within(app()).getByText('added by you')).toBeInTheDocument()

    // Same company + title again is refused.
    const d = await add('backend engineer')
    expect(await within(d).findByText(/You already track/)).toBeInTheDocument()
    await user.click(within(d).getByRole('button', { name: 'Cancel' }))

    await user.selectOptions(within(app()).getByRole('combobox', { name: /Stage for/ }), 'interview')
    expect(await screen.findByRole('heading', { name: /Interviewing/ })).toBeInTheDocument()
    await user.click(within(app()).getByRole('button', { name: /History/ }))
    const timeline = within(app()).getByRole('list', { name: /Status history/ })
    expect(within(timeline).getByText(/Applied/)).toBeInTheDocument()
    expect(within(timeline).getByText(/Interviewing/)).toBeInTheDocument()

    await user.click(within(app()).getByRole('button', { name: /Edit details/ }))
    await user.type(within(app()).getByLabelText(/Next action/), 'Prepare system design')
    await user.type(within(app()).getByLabelText(/Resume version/), 'backend-v3')
    await user.click(within(app()).getByRole('button', { name: /Add interview/ }))
    await user.click(within(app()).getByRole('button', { name: 'Save details' }))
    expect(await within(app()).findByText(/Next: Prepare system design/)).toBeInTheDocument()
    expect(within(app()).getByText(/resume: backend-v3/)).toBeInTheDocument()
    expect(within(app()).getByText(/1 interview/)).toBeInTheDocument()

    unmount()
    await resetDatabaseConnection()
    renderAt('#/applications')
    expect(await screen.findByText(/Next: Prepare system design/)).toBeInTheDocument()
  })
})
