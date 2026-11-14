import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastRegion } from '../components/ui/Toast'
import { PrototypeProvider } from '../prototype/PrototypeProvider'
import type { Scenario } from '../prototype/types'
import { Location } from './Location'

interface Options {
  route?: string
  /** Route pattern the page is mounted on (default: matches everything). */
  path?: string
  scenario?: Scenario
  /** Extra routes, e.g. the Dashboard to land on after a flow. */
  others?: ReactNode
}

/** Renders a screen inside the prototype provider and a memory router. */
export function renderPage(page: ReactElement, { route = '/', path = '*', scenario = 'demo', others }: Options = {}) {
  return render(
    <PrototypeProvider scenario={scenario}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path={path}
            element={page}
          />
          {others}
        </Routes>
        <ToastRegion />
        <Location />
      </MemoryRouter>
    </PrototypeProvider>,
  )
}
