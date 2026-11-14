import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderPage, seededResume, seedStorage, storedState } from '../../test/appFixture'
import { makeProfile } from '../../test/helpers'
import { SAMPLE_TEX } from '../../test/resumeFixture'
import { DashboardPage } from '../dashboard/DashboardPage'
import { OnboardingPage } from './OnboardingPage'

const dashboard = <Route path="/" element={<DashboardPage />} />
const location = () => screen.getByTestId('location').textContent
const page = <OnboardingPage />

describe('Setup', () => {
  it('has six steps and no automation step', () => {
    renderPage(page, { route: '/onboarding', path: '/onboarding' })
    expect(screen.getByRole('heading', { level: 1, name: 'Setup' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Step 1 of 6: Resume/ })).toBeInTheDocument()
    expect(screen.queryByText(/Automation/)).not.toBeInTheDocument()
  })

  it('shows an error for invalid years and does not advance', async () => {
    const user = userEvent.setup()
    renderPage(page, { route: '/onboarding?step=candidate', path: '/onboarding' })
    await user.type(screen.getByLabelText(/Years of experience/), 'abc')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/non-negative number/)
    expect(location()).toBe('/onboarding?step=candidate')
  })

  it('supports a deep link to a step', () => {
    renderPage(page, { route: '/onboarding?step=salary', path: '/onboarding' })
    expect(screen.getByRole('heading', { level: 2, name: /Step 6 of 6: Salary/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/Notice period/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
  })

  it('suggests roles and skills from the uploaded resume', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage(page, { route: '/onboarding', path: '/onboarding' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File([SAMPLE_TEX], 'master.tex'))
    await user.click(await screen.findByRole('button', { name: 'Next' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Sample Person')
    expect(screen.getByLabelText('Current title')).toHaveValue('Software Engineer II')
    expect(screen.getByLabelText(/Years of experience/)).toHaveValue('4')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Full-stack Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Suggested from your resume/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('prefills roles and skills from an already saved resume on a deep link', () => {
    seedStorage({ resume: seededResume() })
    renderPage(page, { route: '/onboarding?step=skills', path: '/onboarding' })
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('walks the steps, Finish saves the profile in localStorage and opens the Dashboard', async () => {
    const user = userEvent.setup()
    renderPage(page, { route: '/onboarding', path: '/onboarding', others: dashboard })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.type(screen.getByLabelText('Name'), 'Test Person')
    await user.type(screen.getByLabelText('Current title'), 'Software Engineer')
    await user.type(screen.getByLabelText(/Years of experience/), '4')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('checkbox', { name: 'SDE-2' }))
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { level: 2, name: /Step 6 of 6/ })).toBeInTheDocument()
    expect(storedState()).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(location()).toBe('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(storedState()?.profile).toEqual(
      expect.objectContaining({ displayName: 'Test Person', currentTitle: 'Software Engineer', yearsExperience: 4, targetSeniority: ['SDE-2'] }),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Profile saved in this browser')
  })

  it('starts from the saved profile when Setup is opened again', () => {
    seedStorage({ profile: makeProfile({ displayName: 'Saved Name' }) })
    renderPage(page, { route: '/onboarding?step=candidate', path: '/onboarding' })
    expect(screen.getByLabelText('Name')).toHaveValue('Saved Name')
  })
})
