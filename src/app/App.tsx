import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ProfileProvider } from '../features/profile/ProfileProvider'
import { createAppRouter } from './router'

export function App() {
  const [router] = useState(createAppRouter)
  return (
    <ProfileProvider>
      <RouterProvider router={router} />
    </ProfileProvider>
  )
}
