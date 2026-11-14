import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

const ROUTES: Array<[string, string]> = [
  ['#/', 'Dashboard'],
  ['#/onboarding', 'Onboarding'],
  ['#/resumes', 'Resumes'],
  ['#/jobs', 'Discovery'],
  ['#/applications', 'Applications'],
  ['#/activity', 'Activity'],
  ['#/settings', 'Settings'],
]

function renderAt(hash: string) {
  window.location.hash = hash
  return render(<App />)
}

describe('App routes', () => {
  it.each(ROUTES)('renders %s with its h1 and the prototype tag', async (hash, title) => {
    renderAt(hash)
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getAllByText('Prototype data').length).toBeGreaterThan(0)
  })

  it('redirects an unknown route to the Dashboard', async () => {
    renderAt('#/nope/never')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
  })

  it('shows the prototype chip and scenario switcher', async () => {
    renderAt('#/')
    expect(await screen.findByText(/simulated agent, no real applications are sent/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Scenario' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset/ })).toBeInTheDocument()
  })
})
