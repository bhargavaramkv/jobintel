import { createHashRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../features/dashboard/DashboardPage'

/**
 * Hash routing keeps deep links working on GitHub Pages project sites,
 * which cannot rewrite unknown paths to index.html.
 * The dashboard ships in the main bundle; other screens load on first visit.
 */
const lazyPage = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => async () => ({
  Component: (await load())[name],
})

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'onboarding', lazy: lazyPage(() => import('../features/onboarding/OnboardingPage'), 'OnboardingPage') },
      { path: 'resumes', lazy: lazyPage(() => import('../features/resumes/ResumesPage'), 'ResumesPage') },
      { path: 'jobs/:jobId?', lazy: lazyPage(() => import('../features/discovery/DiscoveryPage'), 'DiscoveryPage') },
      { path: 'applications', lazy: lazyPage(() => import('../features/applications/ApplicationsPage'), 'ApplicationsPage') },
      { path: 'settings', lazy: lazyPage(() => import('../features/settings/SettingsPage'), 'SettingsPage') },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

export const createAppRouter = () => createHashRouter(routes)
