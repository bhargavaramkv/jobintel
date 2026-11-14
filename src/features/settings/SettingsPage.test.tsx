import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../../test/renderPrototype'
import { DiscoveryPage } from '../discovery/DiscoveryPage'
import { SettingsPage } from './SettingsPage'

const opts = { path: '/settings' }

describe('Settings', () => {
  it.each(['0', '101'])('rejects a daily limit of %s', async (value) => {
    const user = userEvent.setup()
    renderPage(<SettingsPage />, { ...opts, route: '/settings?section=limits' })
    const field = screen.getByLabelText(/Daily application limit/)
    await user.clear(field)
    await user.type(field, value)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/between 1 and 100/)
    expect(screen.queryByText(/Simulated/)).not.toBeInTheDocument()
  })

  it('saves valid limits with a Simulated toast', async () => {
    const user = userEvent.setup()
    renderPage(<SettingsPage />, { ...opts, route: '/settings?section=limits' })
    const field = screen.getByLabelText(/Daily application limit/)
    await user.clear(field)
    await user.type(field, '12')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Simulated: limits settings saved/)
  })

  it('shows each permission with its implied mode', () => {
    renderPage(<SettingsPage />, { ...opts, route: '/settings?section=permissions' })
    expect(screen.getAllByRole('switch')).toHaveLength(4)
    expect(screen.getByText(/Blocked until you sign in/)).toBeInTheDocument()
  })

  it('validates automation scores', async () => {
    const user = userEvent.setup()
    renderPage(<SettingsPage />, { ...opts, route: '/settings?section=automation' })
    const field = screen.getByLabelText(/Minimum match score/)
    await user.clear(field)
    await user.type(field, '150')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/between 0 and 100/)
  })

  it('a newly saved skill raises the affected job score in Discovery', async () => {
    const user = userEvent.setup()
    renderPage(
      <>
        <SettingsPage />
        <DiscoveryPage />
      </>,
      { route: '/settings?section=profile', path: '/settings' },
    )
    const score = () => {
      const row = screen.getByRole('link', { name: /Kestrel Cloud/ })
      return Number(/Match score (\d+)/.exec(within(row).getByRole('img').getAttribute('aria-label')!)![1])
    }
    const before = score()
    const input = screen.getAllByRole('textbox', { name: /Primary skills/ })[0]
    await user.type(input, 'Kubernetes{Enter}')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(score()).toBeGreaterThan(before)
  })
})
