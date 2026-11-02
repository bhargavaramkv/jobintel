import { createHashRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../features/dashboard/DashboardPage'

/**
 * Hash routing keeps deep links working on GitHub Pages project sites,
 * which cannot rewrite unknown paths to index.html.
 * The dashboard ships in the main bundle; other screens load on first visit.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'jobs', lazy: async () => ({ Component: (await import('../features/jobs/JobsPage')).JobsPage }) },
      { path: 'referrals', lazy: async () => ({ Component: (await import('../features/referrals/ReferralsPage')).ReferralsPage }) },
      { path: 'outreach', lazy: async () => ({ Component: (await import('../features/outreach/OutreachPage')).OutreachPage }) },
      { path: 'applications', lazy: async () => ({ Component: (await import('../features/applications/ApplicationsPage')).ApplicationsPage }) },
      { path: 'analytics', lazy: async () => ({ Component: (await import('../features/analytics/AnalyticsPage')).AnalyticsPage }) },
      { path: 'profile', lazy: async () => ({ Component: (await import('../features/profile/ProfilePage')).ProfilePage }) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

export const createAppRouter = () => createHashRouter(routes)
