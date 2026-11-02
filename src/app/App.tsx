import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { JobFeedProvider } from '../features/jobs/JobFeedProvider'
import { ProfileProvider } from '../features/profile/ProfileProvider'
import { createAppRouter } from './router'

export function App() {
  const [router] = useState(createAppRouter)
  return (
    <ProfileProvider>
      <JobFeedProvider>
        <RouterProvider router={router} />
      </JobFeedProvider>
    </ProfileProvider>
  )
}
