import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AppProvider } from './AppProvider'
import { FeedProvider } from './FeedProvider'
import { createAppRouter } from './router'

export function App() {
  const [router] = useState(createAppRouter)
  return (
    <AppProvider>
      <FeedProvider>
        <RouterProvider router={router} />
      </FeedProvider>
    </AppProvider>
  )
}
