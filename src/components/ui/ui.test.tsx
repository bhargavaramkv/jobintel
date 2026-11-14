import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AsyncView } from './AsyncView'
import { ModeBadge } from './ModeBadge'
import { ScoreMeter } from './ScoreMeter'

describe('AsyncView', () => {
  const view = (status: 'loading' | 'error' | 'empty' | 'ready', onRetry = () => {}) =>
    render(
      <AsyncView status={status} onRetry={onRetry} emptyTitle="Nothing here">
        <p>Content</p>
      </AsyncView>,
    )

  it('shows a loading state', () => {
    view('loading')
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })
  it('shows an error with a working Retry', async () => {
    const retry = vi.fn()
    view('error', retry)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledOnce()
  })
  it('shows the empty state', () => {
    view('empty')
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
  it('renders children when ready', () => {
    view('ready')
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})

describe('ModeBadge', () => {
  it('names each mode in text', () => {
    render(
      <>
        <ModeBadge mode="auto" />
        <ModeBadge mode="approval" />
        <ModeBadge mode="blocked" />
      </>,
    )
    for (const name of ['Automatic', 'Needs approval', 'Blocked']) expect(screen.getByText(name)).toBeInTheDocument()
  })
})

describe('ScoreMeter', () => {
  it('exposes the score to assistive tech', () => {
    render(<ScoreMeter score={82} />)
    expect(screen.getByRole('img', { name: 'Match score 82 out of 100' })).toBeInTheDocument()
  })
})
