import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderPage } from '../../test/renderPrototype'
import { DashboardPage } from './DashboardPage'

const progress = () => Number(screen.getByRole('progressbar', { name: 'Run progress' }).getAttribute('aria-valuenow'))

afterEach(() => vi.useRealTimers())

describe('Dashboard', () => {
  it('Start advances progress on the 1500 ms tick and Pause freezes it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage(<DashboardPage />)
    expect(progress()).toBe(0)
    await user.click(screen.getByRole('button', { name: /Start/ }))
    await act(() => vi.advanceTimersByTimeAsync(1500))
    const after = progress()
    expect(after).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /Pause/ }))
    await act(() => vi.advanceTimersByTimeAsync(4500))
    expect(progress()).toBe(after)
    expect(screen.getByText('Agent paused')).toBeInTheDocument()
  })

  it('approving removes the item from Needs attention and shows a Simulated toast', async () => {
    const user = userEvent.setup()
    renderPage(<DashboardPage />)
    const list = screen.getByRole('region', { name: 'Needs attention' })
    const before = within(list).getAllByRole('listitem').length
    await user.click(within(list).getAllByRole('button', { name: 'Approve' })[0])
    expect(within(list).getAllByRole('listitem')).toHaveLength(before - 1)
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(/Simulated/)
  })

  it('shows the onboarding callout in the empty scenario', () => {
    renderPage(<DashboardPage />, { scenario: 'empty' })
    expect(screen.getByRole('link', { name: 'Start onboarding' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start/ })).toBeDisabled()
  })

  it('shows Retry in the error scenario', () => {
    renderPage(<DashboardPage />, { scenario: 'error' })
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
