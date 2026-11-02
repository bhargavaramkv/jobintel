import { createHashRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { JobsPage } from '../features/jobs/JobsPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { ReferralsPage } from '../features/referrals/ReferralsPage'
import { OutreachPage } from '../features/outreach/OutreachPage'

/**
 * Hash routing keeps deep links working on GitHub Pages project sites,
 * which cannot rewrite unknown paths to index.html.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'referrals', element: <ReferralsPage /> },
      { path: 'outreach', element: <OutreachPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

export const createAppRouter = () => createHashRouter(routes)
