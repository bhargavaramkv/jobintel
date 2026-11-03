import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { JobActionsProvider } from '../features/jobs/JobActionsProvider'
import { JobFeedProvider } from '../features/jobs/JobFeedProvider'
import { ProfileProvider } from '../features/profile/ProfileProvider'
import { ContactsProvider } from '../features/referrals/contactsContext'
import { OutreachProvider } from '../features/outreach/outreachContext'
import { createAppRouter } from './router'

export function App() {
  const [router] = useState(createAppRouter)
  return (
    <ProfileProvider>
      <JobActionsProvider>
        <ContactsProvider>
          <OutreachProvider>
            <JobFeedProvider>
              <RouterProvider router={router} />
            </JobFeedProvider>
          </OutreachProvider>
        </ContactsProvider>
      </JobActionsProvider>
    </ProfileProvider>
  )
}
