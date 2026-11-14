import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../../test/renderPrototype'
import { ApplicationsPage } from './ApplicationsPage'

const opts = { path: '/applications/:appId?' }
const page = <ApplicationsPage />

describe('Applications', () => {
  it('groups by status with mode badges', () => {
    renderPage(page, { ...opts, route: '/applications' })
    expect(screen.getByRole('heading', { name: 'Awaiting approval (2)' })).toBeInTheDocument()
    expect(screen.getAllByText('Needs approval').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Blocked', { selector: '.badge' })).toBeInTheDocument()
  })

  it('approve moves the application to Submitted and adds a history row', async () => {
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/applications/app-quillpay' })
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0)
    const history = screen.getByRole('list', { name: 'Application history' })
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent(/You approved it/)
    expect(screen.getByText(/Not verified/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Simulated/)
  })

  it('Retry moves a failed application back to the queue', async () => {
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/applications/app-tessera' })
    expect(screen.getByText(/Safe to retry/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(screen.getAllByText('Queued').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('shows the blocker text and lets the user mark it resolved', async () => {
    const user = userEvent.setup()
    renderPage(page, { ...opts, route: '/applications/app-lumen' })
    expect(screen.getByText(/never solves CAPTCHAs/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /I've resolved it/ }))
    expect(screen.queryByText(/never solves CAPTCHAs/)).not.toBeInTheDocument()
  })

  it('links a verified application to its resume version and shows evidence', () => {
    renderPage(page, { ...opts, route: '/applications/app-nimbus' })
    expect(screen.getByRole('link', { name: 'Resume version v2' })).toHaveAttribute('href', '/resumes/res-nimbus')
    expect(screen.getByText('Confirmation email')).toBeInTheDocument()
  })
})
