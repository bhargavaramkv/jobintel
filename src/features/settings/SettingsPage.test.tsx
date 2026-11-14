import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backendProfile, renderPage, seedStorage, storedState } from '../../test/appFixture'
import { SettingsPage } from './SettingsPage'

const page = <SettingsPage />

describe('Settings', () => {
  it('has only the profile and match preference sections', () => {
    renderPage(page)
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Match preferences' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Profile' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2)
    expect(screen.getByLabelText('Minimum match score')).toHaveValue('50')
  })

  it('loads the saved profile and preferences', () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 65 } })
    renderPage(page)
    expect(screen.getByLabelText('Current title')).toHaveValue('Software Engineer')
    expect(screen.getByLabelText('Minimum match score')).toHaveValue('65')
    expect(screen.getByRole('checkbox', { name: 'Hybrid' })).toBeChecked()
    expect(screen.getByText('Bengaluru')).toBeInTheDocument()
  })

  it('shows inline validation and saves nothing when the profile is invalid', async () => {
    const user = userEvent.setup()
    renderPage(page)
    await user.type(screen.getByLabelText(/Years of experience/), 'abc')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/non-negative number/)
    expect(storedState()).toBeNull()
  })

  it('saves profile edits, preferred work modes and the minimum score together', async () => {
    seedStorage({ profile: backendProfile(), prefs: { minScore: 65 } })
    const user = userEvent.setup()
    renderPage(page)
    await user.clear(screen.getByLabelText('Current title'))
    await user.type(screen.getByLabelText('Current title'), 'Staff Engineer')
    await user.click(screen.getByRole('checkbox', { name: 'Onsite' }))
    await user.clear(screen.getByLabelText('Minimum match score'))
    await user.type(screen.getByLabelText('Minimum match score'), '80')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    const saved = storedState()!
    expect(saved.profile?.currentTitle).toBe('Staff Engineer')
    expect(saved.profile?.workModes).toEqual(['hybrid', 'remote'])
    expect(saved.prefs.minScore).toBe(80)
    expect(screen.getByRole('status')).toHaveTextContent('Settings saved in this browser')
  })
})
