import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { MASTER_TEX } from '../../prototype/data/resumes'
import { renderPage } from '../../test/renderPrototype'
import { DashboardPage } from '../dashboard/DashboardPage'
import { OnboardingPage } from './OnboardingPage'

const dashboard = <Route path="/" element={<DashboardPage />} />
const location = () => screen.getByTestId('location').textContent

describe('Onboarding', () => {
  it('shows an error for invalid years and does not advance', async () => {
    const user = userEvent.setup()
    renderPage(<OnboardingPage />, { route: '/onboarding?step=candidate', path: '/onboarding', scenario: 'empty' })
    await user.type(screen.getByLabelText(/Years of experience/), 'abc')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/non-negative number/)
    expect(location()).toBe('/onboarding?step=candidate')
  })

  it('supports a deep link to a step', () => {
    renderPage(<OnboardingPage />, { route: '/onboarding?step=salary', path: '/onboarding', scenario: 'empty' })
    expect(screen.getByRole('heading', { level: 2, name: /Step 6 of 7: Salary/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/Notice period/)).toBeInTheDocument()
  })

  it('suggests roles and skills from the uploaded resume', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage(<OnboardingPage />, { route: '/onboarding', path: '/onboarding', scenario: 'empty' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File([MASTER_TEX], 'master.tex'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.type(screen.getByLabelText('Name'), 'Test Person')
    await user.type(screen.getByLabelText(/Years of experience/), '4')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Full-stack Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Suggested from your resume/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('walks all seven steps and lands on the Dashboard', async () => {
    const user = userEvent.setup()
    renderPage(<OnboardingPage />, { route: '/onboarding', path: '/onboarding', scenario: 'empty', others: dashboard })
    expect(screen.getByRole('heading', { level: 2, name: /Step 1 of 7/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.type(screen.getByLabelText('Name'), 'Test Person')
    await user.type(screen.getByLabelText(/Years of experience/), '4')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('checkbox', { name: 'SDE-2' }))
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { level: 2, name: /Step 7 of 7/ })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Ask me before every application/ }))
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(location()).toBe('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Start onboarding' })).not.toBeInTheDocument()
  })
})
