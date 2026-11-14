import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProvider } from '../app/AppProvider'
import { emptyState, type StoredState } from '../app/appState'
import { FeedProvider } from '../app/FeedProvider'
import { STORAGE_KEY } from '../app/storage-local'
import { ToastRegion } from '../components/ui/Toast'
import type { JobFeed } from '../domain/jobs/feedSchema'
import { makeFeed, makeJob, mockFetchFeed } from './feedFixture'
import { makeProfile } from './helpers'
import { Location } from './Location'
import { SAMPLE_TEX } from './resumeFixture'

/** A profile that fits the Acme backend job below and not the data job. */
export const backendProfile = () =>
  makeProfile({
    displayName: 'Test User',
    currentTitle: 'Software Engineer',
    yearsExperience: 4,
    professionalSummary: 'Builds backend services.',
    primarySkills: [{ name: 'C#' }, { name: '.NET' }, { name: 'SQL Server' }],
    secondarySkills: [{ name: 'Docker' }],
    targetRoles: ['Backend Engineer'],
    targetSeniority: ['SDE-2'],
    preferredLocations: ['Bengaluru'],
    workModes: ['hybrid', 'onsite', 'remote'],
    companyTypes: ['product'],
  })

export const testFeed = (): JobFeed =>
  makeFeed([
    makeJob({
      sourceId: 'be',
      company: 'Acme Corp',
      title: 'Senior Backend Engineer',
      workMode: 'hybrid',
      description: 'Build payment services in C# and .NET on SQL Server.',
      requirements: ['4+ years of C#', '.NET', 'SQL Server'],
      firstSeenAt: '2026-11-01T00:00:00.000Z',
      postedAt: '2026-11-01T00:00:00.000Z',
    }),
    makeJob({
      sourceId: 'fe',
      company: 'Globex',
      title: 'Frontend Engineer',
      cities: ['Hyderabad'],
      locations: ['Hyderabad, India'],
      workMode: 'remote',
      description: 'Build interfaces in React.',
      requirements: ['React', 'TypeScript'],
      firstSeenAt: '2026-11-10T00:00:00.000Z',
      postedAt: '2026-11-10T00:00:00.000Z',
    }),
    makeJob({
      sourceId: 'ds',
      company: 'Initech',
      title: 'Data Scientist',
      workMode: 'onsite',
      description: 'Train models with Python.',
      requirements: ['Python', 'Machine learning'],
      firstSeenAt: '2026-11-05T00:00:00.000Z',
      postedAt: '2026-11-05T00:00:00.000Z',
    }),
    makeJob({ sourceId: 'old', company: 'Hooli', title: 'Closed Backend Engineer', status: 'closed' }),
  ])

/** Saves state to localStorage before a screen is rendered, as if the user had used the app earlier. */
export function seedStorage(partial: Partial<StoredState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyState(), ...partial }))
}

export const seededResume = () => ({ name: 'master.tex', size: SAMPLE_TEX.length, uploadedAt: '2026-11-12T10:00:00.000Z', tex: SAMPLE_TEX })

export const storedState = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredState | null

interface Options {
  route?: string
  /** Route pattern the page is mounted on (default: matches everything). */
  path?: string
  /** The feed to serve, or null for an HTTP 404. Defaults to `testFeed()`. */
  feed?: JobFeed | null
  fetchImpl?: typeof fetch
  /** Extra routes, e.g. the Dashboard to land on after a flow. */
  others?: ReactNode
}

/** Renders a screen inside the app providers and a memory router. */
export function renderPage(page: ReactElement, { route = '/', path = '*', feed, fetchImpl, others }: Options = {}) {
  return render(
    <AppProvider>
      <FeedProvider fetchImpl={fetchImpl ?? mockFetchFeed(feed === undefined ? testFeed() : feed)}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={page} />
            {others}
          </Routes>
          <ToastRegion />
          <Location />
        </MemoryRouter>
      </FeedProvider>
    </AppProvider>,
  )
}
