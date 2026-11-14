import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderPage, seededResume, seedStorage, storedState } from '../../test/appFixture'
import { SAMPLE_TEX } from '../../test/resumeFixture'
import { ResumesPage } from './ResumesPage'

const GOOD = '\\documentclass{article}\n\\begin{document}\nReplaced master\n\\end{document}'
const page = <ResumesPage />

describe('Resumes', () => {
  it('asks for a master resume when there is none', () => {
    renderPage(page, { route: '/resumes' })
    expect(screen.getByRole('heading', { level: 1, name: 'Resumes' })).toBeInTheDocument()
    expect(screen.getByText('No master resume yet')).toBeInTheDocument()
    expect(screen.getByLabelText(/Upload master resume/)).toBeInTheDocument()
  })

  it('rejects a non-.tex upload with an error and saves nothing', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage(page, { route: '/resumes' })
    await user.upload(screen.getByLabelText(/Upload master resume/), new File(['x'], 'cv.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/\.tex/)
    expect(storedState()).toBeNull()
    expect(screen.getByText('No master resume yet')).toBeInTheDocument()
  })

  it('rejects a .tex file that is not a LaTeX resume', async () => {
    const user = userEvent.setup()
    renderPage(page, { route: '/resumes' })
    await user.upload(screen.getByLabelText(/Upload master resume/), new File(['just text'], 'cv.tex'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/documentclass/)
    expect(storedState()).toBeNull()
  })

  it('saves a valid .tex, shows its source with line numbers and the update time', async () => {
    const user = userEvent.setup()
    renderPage(page, { route: '/resumes' })
    await user.upload(screen.getByLabelText(/Upload master resume/), new File([GOOD], 'master.tex'))
    expect(await screen.findByRole('heading', { level: 2, name: 'master.tex' })).toBeInTheDocument()
    const source = screen.getByLabelText('Master resume source')
    expect(within(source).getByText(/Replaced master/)).toBeInTheDocument()
    expect(source.querySelectorAll('.code__no')).toHaveLength(4)
    expect(screen.getByText(/last updated/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Master resume saved in this browser')
    expect(storedState()?.resume).toEqual(expect.objectContaining({ name: 'master.tex', tex: GOOD }))
  })

  it('shows a saved resume after a reload and replaces it', async () => {
    seedStorage({ resume: seededResume() })
    const user = userEvent.setup()
    renderPage(page, { route: '/resumes' })
    expect(screen.getByRole('heading', { level: 2, name: 'master.tex' })).toBeInTheDocument()
    expect(within(screen.getByLabelText('Master resume source')).getByText(/Sample Person/)).toBeInTheDocument()
    await user.upload(screen.getByLabelText(/Replace master resume/), new File([GOOD], 'new-master.tex'))
    expect(await screen.findByRole('heading', { level: 2, name: 'new-master.tex' })).toBeInTheDocument()
    expect(storedState()?.resume?.tex).toBe(GOOD)
    expect(SAMPLE_TEX).not.toBe(GOOD)
  })
})
