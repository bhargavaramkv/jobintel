import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/** Every request that leaves the local preview origin, and Content-Security-Policy violations. */
function watch(page: Page) {
  const external: string[] = []
  const problems: string[] = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol !== 'data:' && url.protocol !== 'blob:') external.push(req.url())
  })
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(e.message))
  return { external, problems }
}

const localDay = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

test('AI hand-off: consent → export → import Claude’s answer → accept → survives backup and restore', async ({ page }) => {
  test.slow()
  const { external, problems } = watch(page)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

  // A real job from the published feed for Claude to "recommend". The page is served at /jobintel/.
  await page.goto('./')
  const job = await page.evaluate(async () => {
    const feed = await (await fetch('./data/jobs.json')).json()
    const j = feed.jobs.find((x: { status: string }) => x.status === 'open')
    return { id: j.id as string, title: j.title as string }
  })

  // A profile with an identifying name that must NOT be exported by default.
  await page.goto('./#/profile?section=identity')
  await page.getByLabel('Display name').fill('E2E Private Person')
  await page.getByLabel('Current job title').fill('Backend Engineer')
  await page.getByRole('button', { name: /Save profile/ }).click()
  await expect(page.getByText(/Saved locally/)).toBeVisible()

  // 1. Preview and consent gate the export.
  await page.goto('./#/assistant?tab=bridge')
  await expect(page.getByRole('heading', { name: /Preview exactly what leaves/ })).toBeVisible()
  const download = page.getByRole('button', { name: /Download context file/ })
  await expect(download).toBeDisabled()
  await page.getByRole('checkbox', { name: /I have reviewed the data above/ }).check()
  await expect(download).toBeEnabled()

  // 2. The downloaded file excludes the name and carries the contract.
  const dl = page.waitForEvent('download')
  await download.click()
  const file = await (await dl).path()
  const exported = readFileSync(file, 'utf8')
  expect(exported).not.toContain('E2E Private Person')
  const context = JSON.parse(exported) as { format: string; contextId: string; resultSchema: unknown; candidate?: { currentTitle?: string } }
  expect(context.format).toBe('jobintel-ai-context')
  expect(context.candidate?.currentTitle).toBe('Backend Engineer')
  expect(JSON.stringify(context.resultSchema)).toContain('jobintel-ai-result')
  await expect(page.getByText(/Downloaded jobintel-ai-context-/)).toBeVisible()

  // The chat-prompt route also works (clipboard).
  await page.getByRole('checkbox', { name: /I have reviewed the data above/ }).check()
  await page.getByRole('button', { name: /Copy as chat prompt/ }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('"format": "jobintel-ai-context"')

  // 3. A hand-written "Claude answer" for the first export is imported through validation.
  const answer = {
    format: 'jobintel-ai-result',
    schemaVersion: 1,
    contextId: context.contextId,
    generatedAt: new Date().toISOString(),
    generator: { name: 'Claude', model: 'e2e-fixture' },
    recommendations: [
      {
        id: 'e2e-fit-1',
        kind: 'job-fit',
        title: `Shortlist: ${job.title}`,
        summary: 'Title matches the target role.',
        jobId: job.id,
        priority: 'high',
        confidence: 0.8,
        evidence: [{ source: 'job', ref: job.id, detail: 'Title matches your target role' }],
        action: { type: 'shortlist' },
      },
      { id: 'broken-1', kind: 'job-fit', title: 'x', summary: 'y', priority: 'high', confidence: 4, evidence: [] },
    ],
    briefing: {
      date: localDay(),
      headline: 'E2E headline: start with one shortlist',
      summary: 'One concrete step today.',
      priorities: [
        { title: 'Shortlist the best fit', detail: 'It is the strongest match.', jobId: job.id, recommendationId: 'e2e-fit-1', confidence: 0.8, evidence: [{ source: 'job', detail: 'Title match' }] },
      ],
      watchouts: [],
    },
  }
  await page.getByRole('button', { name: /^Import Claude/ }).click()
  const dialog = page.getByRole('dialog', { name: /Import Claude/ })
  await dialog.getByLabel(/Or load a saved/).setInputFiles({ name: 'answer.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(answer)) })
  await expect(dialog.getByText(/passed validation/)).toContainText('1')
  await expect(dialog.getByText(/broken-1/)).toBeVisible() // the invalid item is reported, not silently dropped
  await dialog.getByRole('button', { name: /Add 1 to inbox and save briefing/ }).click()

  // 4. It arrives as Generated and changes nothing until accepted.
  await expect(page).toHaveURL(/tab=inbox/)
  await expect(page.getByRole('article').first().locator('.ai-status')).toHaveText(/Generated/)
  await page.goto('./#/applications')
  await expect(page.getByRole('article').filter({ hasText: job.title })).toHaveCount(0)

  await page.goto('./#/assistant?tab=inbox')
  await page.getByRole('article').first().getByRole('button', { name: /Accept and apply/ }).click()
  await page.getByRole('tab', { name: /Accepted/ }).click()
  await expect(page.getByRole('article').first().locator('.ai-status')).toHaveText(/Accepted/)
  await page.goto('./#/applications')
  await expect(page.getByRole('article').filter({ hasText: job.title }).first()).toBeVisible()

  // 5. The briefing is shown, and the accepted state is part of encrypted backups.
  await page.goto('./#/assistant')
  await expect(page.getByRole('heading', { name: 'E2E headline: start with one shortlist' })).toBeVisible()
  const passphrase = 'e2e ai passphrase only'
  await page.goto('./#/profile?section=data')
  await page.getByRole('button', { name: /^Export$/ }).click()
  const exp = page.getByRole('dialog', { name: 'Export encrypted backup' })
  await exp.getByLabel('Passphrase', { exact: true }).fill(passphrase)
  await exp.getByLabel('Confirm passphrase').fill(passphrase)
  await exp.getByRole('checkbox').check()
  const backup = page.waitForEvent('download')
  await exp.getByRole('button', { name: /Encrypt & download/ }).click()
  const backupFile = await (await backup).path()
  expect(readFileSync(backupFile, 'utf8')).not.toContain('E2E headline') // encrypted, not plaintext

  await page.getByRole('button', { name: /Clear data/ }).click()
  const clear = page.getByRole('alertdialog', { name: 'Delete all local data?' })
  await clear.getByLabel(/Type DELETE/).fill('DELETE')
  await clear.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByText(/All local JobIntel data was deleted/)).toBeVisible()
  await page.goto('./#/assistant')
  await expect(page.getByRole('heading', { name: 'No AI briefing yet' })).toBeVisible() // cleared with everything else

  await page.goto('./#/profile?section=data')
  await page.getByRole('button', { name: /^Import$/ }).click()
  const imp = page.getByRole('dialog', { name: 'Import encrypted backup' })
  await imp.getByLabel('Backup file').setInputFiles(backupFile)
  await imp.getByLabel('Passphrase').fill(passphrase)
  await imp.getByRole('button', { name: /Decrypt & replace/ }).click()
  await expect(page.getByText(/Backup restored/)).toBeVisible()

  await page.goto('./#/assistant')
  await expect(page.getByRole('heading', { name: 'E2E headline: start with one shortlist' })).toBeVisible()
  await page.goto('./#/assistant?tab=inbox')
  await page.getByRole('tab', { name: /Accepted/ }).click()
  await expect(page.getByRole('article').first().locator('.ai-status')).toHaveText(/Accepted/)

  // Nothing was ever sent anywhere, and the AI screens pass the accessibility audit.
  for (const tab of ['briefing', 'inbox', 'bridge']) {
    await page.goto(`./#/assistant?tab=${tab}`)
    await expect(page.locator('main h1')).toBeVisible()
    const serious = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([])
  }
  expect(external).toEqual([])
  expect(problems).toEqual([])
})
