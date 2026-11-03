import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { refOf, withRejected } from '../../domain/jobs/actions'
import { aiBriefingsRepository, aiRecommendationsRepository } from '../../storage/aiRepository'
import { jobActionsRepository } from '../../storage/jobActionsRepository'
import { profileRepository } from '../../storage/profileRepository'
import { json, NOW, rawRecommendation, rawResult, storedBriefing, storedRec } from '../../test/aiFixture'
import { makeFeed, makeJob, mockFetchFeed } from '../../test/feedFixture'
import { completeProfile, freshDatabase } from '../../test/helpers'

const job = makeJob({ sourceId: '1', company: 'Acme Corp', title: 'Backend Engineer', requirements: ['C#', 'SQL'] })

function renderAt(hash: string) {
  window.location.hash = hash
  return render(<App />)
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  await freshDatabase()
  localStorage.clear()
  globalThis.fetch = mockFetchFeed(makeFeed([job]))
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AI assistant: empty states', () => {
  it('is in the primary navigation and starts with honest empty states', async () => {
    const user = userEvent.setup()
    renderAt('#/assistant')
    const nav = await screen.findByRole('navigation', { name: 'Primary' })
    expect(within(nav).getByRole('link', { name: 'AI Assistant' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'No AI briefing yet' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Recommendations/ }))
    expect(await screen.findByRole('heading', { name: 'No recommendations yet' })).toBeInTheDocument()
  })

  it('says plainly that nothing is automatic', async () => {
    renderAt('#/assistant')
    expect(await screen.findByText(/changes your records only if you accept it/)).toBeInTheDocument()
  })
})

describe('AI assistant: consent and data preview', () => {
  let blobs: Blob[]
  beforeEach(async () => {
    blobs = []
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:test')) as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await profileRepository.save(completeProfile())
  })

  it('shows what will be shared, with sensitive items off, and blocks export until consent', async () => {
    const user = userEvent.setup()
    renderAt('#/assistant?tab=bridge')
    await screen.findByRole('heading', { name: /Preview exactly what leaves/ })

    for (const name of [/Identifying details/, /Compensation and notice period/, /Your private notes/, /Names of referral leads/]) {
      expect(screen.getByRole('checkbox', { name })).not.toBeChecked()
    }
    expect(screen.getByRole('checkbox', { name: /Profile preferences/ })).toBeChecked()
    expect(screen.getByRole('button', { name: /Download context file/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Copy as chat prompt/ })).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: /I have reviewed the data above/ }))
    expect(screen.getByRole('button', { name: /Download context file/ })).toBeEnabled()
  })

  it('lists what is never included and can show the exact file', async () => {
    const user = userEvent.setup()
    renderAt('#/assistant?tab=bridge')
    await screen.findByRole('heading', { name: /Preview exactly what leaves/ })
    await user.click(screen.getByText(/Never included, whatever you choose/))
    expect(screen.getByText(/Message text and drafts/)).toBeInTheDocument()
    expect(screen.getByText(/Your resume or any file/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Show the full file/ }))
    const raw = screen.getByLabelText('Full context file contents')
    expect(raw.textContent).toContain('"format": "jobintel-ai-context"')
    expect(raw.textContent).not.toContain('Test User')
  })

  it('asks for consent again whenever what is shared changes', async () => {
    const user = userEvent.setup()
    renderAt('#/assistant?tab=bridge')
    await screen.findByRole('heading', { name: /Preview exactly what leaves/ })
    await user.click(screen.getByRole('checkbox', { name: /I have reviewed the data above/ }))
    await user.click(screen.getByRole('checkbox', { name: /Your private notes/ }))
    expect(screen.getByRole('checkbox', { name: /I have reviewed the data above/ })).not.toBeChecked()
    expect(screen.getByRole('button', { name: /Download context file/ })).toBeDisabled()
  })

  it('downloads exactly the previewed file, without the name, and logs counts only', async () => {
    const user = userEvent.setup()
    renderAt('#/assistant?tab=bridge')
    await screen.findByRole('heading', { name: /Preview exactly what leaves/ })
    await user.click(screen.getByRole('button', { name: /Show the full file/ }))
    const previewed = screen.getByLabelText('Full context file contents').textContent!
    await user.click(screen.getByRole('checkbox', { name: /I have reviewed the data above/ }))
    await user.click(screen.getByRole('button', { name: /Download context file/ }))

    expect(await screen.findByText(/Downloaded jobintel-ai-context-2026-11-03\.json/)).toBeInTheDocument()
    expect(blobs).toHaveLength(1)
    const downloaded = await blobs[0].text()
    expect(downloaded).toBe(previewed)
    expect(downloaded).not.toContain('Test User')
    // Consent is spent: the next export needs a fresh confirmation and a new id.
    expect(screen.getByRole('checkbox', { name: /I have reviewed the data above/ })).not.toBeChecked()
  })
})

describe('AI assistant: importing and reviewing', () => {
  async function importText(user: ReturnType<typeof userEvent.setup>, text: string) {
    await user.click(await screen.findByRole('button', { name: /^Import Claude/ }))
    const dialog = await screen.findByRole('dialog', { name: /Import Claude/ })
    fireEvent.change(within(dialog).getByLabelText(/Paste Claude/), { target: { value: text } })
    await user.click(within(dialog).getByRole('button', { name: 'Check answer' }))
    return dialog
  }

  it('rejects malformed output with a clear reason and stores nothing', async () => {
    const user = userEvent.setup()
    renderAt('#/assistant?tab=bridge')
    const dialog = await importText(user, 'Sorry, I could not do that.')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/not valid JSON/)
    expect(within(dialog).queryByRole('button', { name: /to inbox/ })).toBeNull()
    expect((await aiRecommendationsRepository.getAll()).rows).toEqual([])
  })

  it('rejects a result in the wrong format or from a newer schema version', async () => {
    const user = userEvent.setup()
    renderAt('#/assistant?tab=bridge')
    let dialog = await importText(user, json({ hello: 'world' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/not a JobIntel AI result/)
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    dialog = await importText(user, json(rawResult({ schemaVersion: 7 })))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/schema version 7/)
    expect((await aiRecommendationsRepository.getAll()).rows).toEqual([])
  })

  it('imports valid items, reports invalid ones, and adds everything as Generated', async () => {
    const user = userEvent.setup()
    renderAt('#/assistant?tab=bridge')
    const text = json(rawResult({}, [rawRecommendation(), rawRecommendation({ id: 'broken-1', confidence: 9 })]))
    const dialog = await importText(user, text)

    expect(await within(dialog).findByText(/passed validation/)).toHaveTextContent(/1.*passed validation.*1.*rejected/)
    expect(within(dialog).getByText(/not linked to any export made in this browser/)).toBeInTheDocument()
    expect(within(dialog).getByText(/broken-1/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /Add 1 to inbox and save briefing/ }))
    expect(await screen.findByRole('heading', { name: 'Shortlist the Acme backend role' })).toBeInTheDocument()
    const card = screen.getByRole('article')
    expect(within(card).getByText('Generated', { selector: '.ai-status' })).toBeInTheDocument()
    // Nothing was applied by importing.
    expect((await jobActionsRepository.getAll()).actions).toEqual([])
  })

  it('walks a recommendation through generated → reviewed → accepted and applies exactly its change', async () => {
    await aiRecommendationsRepository.put(storedRec())
    const user = userEvent.setup()
    renderAt('#/assistant?tab=inbox')
    const card = await screen.findByRole('article')
    expect(within(card).getByText(/If you accept:/).parentElement).toHaveTextContent('Shortlist this job.')

    await user.click(within(card).getByRole('button', { name: /Mark reviewed/ }))
    expect(await within(card).findByText('Reviewed', { selector: '.ai-status' })).toBeInTheDocument()
    expect((await jobActionsRepository.getAll()).actions).toEqual([])

    await user.click(within(card).getByRole('button', { name: /Accept and apply/ }))
    // A decided recommendation leaves the "To review" list...
    await waitFor(() => expect(screen.queryByRole('article')).toBeNull())
    expect(await screen.findByText('Nothing left to review. Nice.')).toBeInTheDocument()

    // ...and is found under Accepted, with what it changed.
    await user.click(screen.getByRole('tab', { name: /Accepted/ }))
    const accepted = await screen.findByRole('article')
    expect(within(accepted).getByText('Accepted', { selector: '.ai-status' })).toBeInTheDocument()
    expect(within(accepted).getByText(/Shortlisted Backend Engineer at Acme Corp/)).toBeInTheDocument()

    const { actions } = await jobActionsRepository.getAll()
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({ jobId: job.id, stage: 'shortlisted' })
    expect(actions[0].history?.[0].note).toMatch(/AI recommendation/)
    // An accepted recommendation has no further buttons: it cannot be re-applied or rejected.
    expect(within(accepted).queryByRole('button', { name: /Accept|Reject|Reconsider/ })).toBeNull()
  })

  it('rejecting changes no record and can be reconsidered', async () => {
    await aiRecommendationsRepository.put(storedRec())
    const user = userEvent.setup()
    renderAt('#/assistant?tab=inbox')
    const card = await screen.findByRole('article')
    await user.click(within(card).getByRole('button', { name: /Reject/ }))
    await user.click(await screen.findByRole('tab', { name: /Rejected/ }))
    const rejected = await screen.findByRole('article')
    expect(within(rejected).getByText('Rejected', { selector: '.ai-status' })).toBeInTheDocument()
    expect((await jobActionsRepository.getAll()).actions).toEqual([])
    await user.click(within(rejected).getByRole('button', { name: /Reconsider/ }))
    await user.click(await screen.findByRole('tab', { name: /To review/ }))
    const back = await screen.findByRole('article')
    expect(within(back).getByText('Reviewed', { selector: '.ai-status' })).toBeInTheDocument()
  })

  it('refuses to apply a stale recommendation over a decision made since', async () => {
    await jobActionsRepository.put(withRejected(refOf(job), undefined, ['company'], NOW))
    await aiRecommendationsRepository.put(storedRec())
    const user = userEvent.setup()
    renderAt('#/assistant?tab=inbox')
    const card = await screen.findByRole('article')
    expect(within(card).getByText(/Can’t be applied now/)).toBeInTheDocument()
    expect(within(card).getByText(/marked this Not interested/)).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: /Accept and apply/ })).toBeDisabled()
    // The user's own decision is untouched, and they can still reject the suggestion.
    await user.click(within(card).getByRole('button', { name: /Reject/ }))
    expect((await jobActionsRepository.getAll()).actions[0].decision).toBe('rejected')
  })

  it('shows evidence, confidence and caveats on every card', async () => {
    await aiRecommendationsRepository.put(storedRec({ caveats: ['Compensation is not stated'], confidence: 0.72 }))
    const user = userEvent.setup()
    renderAt('#/assistant?tab=inbox')
    const card = await screen.findByRole('article')
    expect(within(card).getByText(/72% confident/)).toBeInTheDocument()
    await user.click(within(card).getByText(/Evidence \(1\)/))
    expect(within(card).getByText('Match engine')).toBeInTheDocument()
    expect(within(card).getByText('Compensation is not stated')).toBeInTheDocument()
  })

  it('does not import the same answer twice and keeps earlier decisions', async () => {
    const user = userEvent.setup()
    const text = json(rawResult({ contextId: 'ctx-test-1' }))
    renderAt('#/assistant?tab=bridge')
    let dialog = await importText(user, text)
    await user.click(await within(dialog).findByRole('button', { name: /Add 1 to inbox/ }))
    await user.click(await screen.findByRole('button', { name: /^Reject:/ }))
    await waitFor(async () => expect((await aiRecommendationsRepository.getAll()).rows[0].status).toBe('rejected'))

    await user.click(screen.getByRole('tab', { name: /Export & import/ }))
    dialog = await importText(user, text)
    expect(await within(dialog).findByText(/already imported earlier/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /^Add 0 to inbox/ }))
    await waitFor(async () => expect((await aiRecommendationsRepository.getAll()).rows).toHaveLength(1))
    expect((await aiRecommendationsRepository.getAll()).rows[0].status).toBe('rejected')
  })
})

describe('AI assistant: daily briefing', () => {
  it('shows the latest briefing with its priorities, evidence and inbox status', async () => {
    const user = userEvent.setup()
    await aiRecommendationsRepository.put(storedRec({ status: 'accepted', decidedAt: '2026-11-03T09:00:00.000Z' }))
    await aiBriefingsRepository.put(
      storedBriefing({
        headline: 'Focus on the Acme role',
        summary: 'One strong fit this week.',
        watchouts: ['No referral contact yet'],
        priorities: [
          {
            title: 'Shortlist Acme',
            detail: 'Best deterministic match.',
            jobId: job.id,
            recommendationId: 'fit-acme-1',
            confidence: 0.7,
            evidence: [{ source: 'match', detail: 'Score 82' }],
          },
        ],
      }),
    )
    renderAt('#/assistant')
    expect(await screen.findByRole('heading', { name: 'Focus on the Acme role' })).toBeInTheDocument()
    expect(screen.getByText('One strong fit this week.')).toBeInTheDocument()
    expect(screen.getByText('Shortlist Acme')).toBeInTheDocument()
    expect(screen.getByText('Backend Engineer · Acme Corp')).toBeInTheDocument()
    expect(screen.getByText(/Accepted in inbox/)).toBeInTheDocument()
    expect(screen.getByText('No referral contact yet')).toBeInTheDocument()
    await user.click(screen.getByText(/Evidence \(1\)/))
    expect(screen.getByText('Score 82')).toBeInTheDocument()
  })

  it('warns when the briefing is not from today', async () => {
    await aiBriefingsRepository.put(storedBriefing({ date: '2026-10-30' }))
    renderAt('#/assistant')
    expect(await screen.findByText(/This briefing is from 2026-10-30, not today/)).toBeInTheDocument()
  })

  it('surfaces the briefing and the inbox count on the dashboard', async () => {
    await aiBriefingsRepository.put(storedBriefing({ headline: 'Start with Acme' }))
    await aiRecommendationsRepository.put(storedRec())
    renderAt('#/')
    expect(await screen.findByText('Start with Acme')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '1 recommendation to review' })).toHaveAttribute('href', '#/assistant?tab=inbox')
  })
})
