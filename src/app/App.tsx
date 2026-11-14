import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { PrototypeProvider } from '../prototype/PrototypeProvider'
import { createAppRouter } from './router'

export function App() {
  const [router] = useState(createAppRouter)
  return (
    <PrototypeProvider>
      <RouterProvider router={router} />
    </PrototypeProvider>
  )
}
