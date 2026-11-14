import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../../test/renderPrototype'
import { ResumesPage } from './ResumesPage'

const GOOD = '\\documentclass{article}\n\\begin{document}\nReplaced master\n\\end{document}'

describe('Resumes', () => {
  it('rejects a non-.tex upload with an error', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage(<ResumesPage />, { route: '/resumes', path: '/resumes/:resumeId?' })
    await user.upload(screen.getByLabelText(/Replace master resume/), new File(['x'], 'cv.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/\.tex/)
  })

  it('replaces the master with a valid .tex and confirms with a Simulated toast', async () => {
    const user = userEvent.setup()
    renderPage(<ResumesPage />, { route: '/resumes', path: '/resumes/:resumeId?' })
    await user.upload(screen.getByLabelText(/Replace master resume/), new File([GOOD], 'new-master.tex'))
    expect(await screen.findByText(/new-master\.tex, /)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Simulated/)
    expect(within(screen.getByLabelText('Master resume LaTeX source')).getByText(/Replaced master/)).toBeInTheDocument()
  })

  it('shows variant tabs and generates version n+1', async () => {
    const user = userEvent.setup()
    renderPage(<ResumesPage />, { route: '/resumes/res-nimbus', path: '/resumes/:resumeId?' })
    expect(screen.getByText('Prototype preview, not compiled')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Changes' }))
    expect(screen.getByRole('columnheader', { name: 'Reason' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'History' }))
    expect(screen.getByText('Version 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generate new version' }))
    expect(await screen.findByText('Version 3')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Simulated: version 3/)
  })
})
