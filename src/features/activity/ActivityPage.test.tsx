import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrototype } from '../../prototype/usePrototype'
import { renderPage } from '../../test/renderPrototype'
import { ActivityPage } from './ActivityPage'

function Controls() {
  const { dispatch } = usePrototype()
  return <button type="button" onClick={() => dispatch({ type: 'agent/start' })}>Test start</button>
}

const items = () => within(screen.getByRole('list', { name: 'Activity timeline' })).getAllByRole('listitem')

afterEach(() => vi.useRealTimers())

describe('Activity', () => {
  it('shows counters and filters by failure', async () => {
    const user = userEvent.setup()
    renderPage(<ActivityPage />)
    expect(screen.getByRole('region', { name: 'Counters' })).toHaveTextContent('Failures')
    await user.click(screen.getByRole('button', { name: 'Failure' }))
    const rows = items()
    expect(rows.length).toBe(2)
    for (const r of rows) expect(within(r).getByText('Failure', { selector: '.badge' })).toBeInTheDocument()
  })

  it('expands a log in monospace and resolves an intervention', async () => {
    const user = userEvent.setup()
    renderPage(<ActivityPage />, { route: '/activity?kind=failure' })
    await user.click(screen.getAllByRole('button', { name: 'Show log' })[0])
    expect(screen.getByText(/detected CAPTCHA challenge|HTTP 504/, { selector: 'pre' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Resolve' })[0])
    expect(screen.getAllByText('Resolved', { selector: '.badge' }).length).toBeGreaterThan(0)
  })

  it('shows a new event at the top when the agent ticks', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage(
      <>
        <Controls />
        <ActivityPage />
      </>,
    )
    const before = items().length
    await user.click(screen.getByRole('button', { name: 'Test start' }))
    await act(() => vi.advanceTimersByTimeAsync(1500))
    expect(items().length).toBeGreaterThan(before)
    expect(items()[0]).toHaveTextContent('Scanning job sources')
  })
})
