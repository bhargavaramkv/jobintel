import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const PAGES = ['', 'jobs', 'referrals', 'outreach', 'applications', 'analytics', 'profile', 'assistant', 'assistant?tab=inbox', 'assistant?tab=bridge', 'assistant?tab=automation']

/** Collect Content-Security-Policy violations and uncaught errors. */
function watchProblems(page: Page) {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(e.message))
  return problems
}

for (const route of PAGES) {
  test(`#/${route} has no serious accessibility violations, CSP errors or horizontal scroll`, async ({ page }) => {
    const problems = watchProblems(page)
    await page.goto(`./#/${route}`)
    await expect(page.locator('main h1')).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} node(s) e.g. ${v.nodes[0]?.target}`)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
    expect(problems).toEqual([])
  })
}

test('full workflow: shortlist → referral lead → outreach → application → analytics, then backup restore', async ({ page }) => {
  test.slow()
  const problems = watchProblems(page)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

  // Shortlist the first job in the real feed.
  await page.goto('./#/jobs')
  const first = page.getByRole('article').first()
  const title = (await first.getByRole('heading').innerText()).replace(/\s*\(opens.*$/, '').trim()
  const company = (await first.locator('.job__company').innerText()).trim()
  await first.getByRole('button', { name: /^Shortlist$/ }).click()
  await page.getByRole('tab', { name: /Shortlisted/ }).click()
  await expect(page.getByRole('heading', { name: title }).first()).toBeVisible()

  // Add a referral lead at that company.
  await page.goto('./#/referrals')
  await page.getByRole('listitem').filter({ hasText: company }).getByRole('button', { name: /Add lead/ }).click()
  const form = page.getByRole('dialog', { name: 'Add referral lead' })
  await form.getByLabel('Name').fill('E2E Lead')
  await form.getByLabel('Role', { exact: false }).first().fill('Senior Software Engineer')
  await form.getByLabel(/Where you found them/).fill('https://example.com/team')
  await form.getByLabel(/I know this person personally/).check()
  await form.getByRole('button', { name: 'Save lead' }).click()
  await expect(page.getByRole('heading', { name: 'E2E Lead' })).toBeVisible()
  await expect(page.getByText('Direct connection')).toBeVisible()

  // Draft outreach for the shortlisted job and log it as sent.
  await page.getByRole('link', { name: /Draft outreach/ }).click()
  await expect(page.getByRole('heading', { name: 'Why E2E Lead' })).toBeVisible()
  await page.getByLabel('Job').selectOption({ label: `${title} (in your pipeline)` })
  await expect(page.getByLabel(/Message \(edit freely\)/)).toHaveValue(/referring me/)
  await page.getByRole('button', { name: /I sent it/ }).click()
  await expect(page.getByText(/Logged as sent/)).toBeVisible()

  // The shortlisted job moved to "Referral requested"; advance it to Applied.
  await page.goto('./#/applications')
  const app = page.getByRole('article').filter({ hasText: title }).first()
  await expect(app.getByRole('combobox', { name: /Stage for/ })).toHaveValue('referral-requested')
  await app.getByRole('combobox', { name: /Stage for/ }).selectOption('applied')
  await expect(page.getByRole('heading', { name: /^Applied/ })).toBeVisible()

  // Analytics reflect the records.
  await page.goto('./#/analytics')
  const funnel = page.getByRole('region', { name: 'Application funnel' })
  await expect(funnel.getByRole('listitem').filter({ hasText: /^Applied/ })).toContainText('1')
  await expect(page.getByText('Referral requests').locator('..')).toContainText('1')

  // Backup everything, clear, restore: leads and outreach come back too.
  const passphrase = 'e2e workflow passphrase'
  await page.goto('./#/profile?section=data')
  await page.getByRole('button', { name: /^Export$/ }).click()
  const exp = page.getByRole('dialog', { name: 'Export encrypted backup' })
  await exp.getByLabel('Passphrase', { exact: true }).fill(passphrase)
  await exp.getByLabel('Confirm passphrase').fill(passphrase)
  await exp.getByRole('checkbox').check()
  const dl = page.waitForEvent('download')
  await exp.getByRole('button', { name: /Encrypt & download/ }).click()
  const file = await (await dl).path()
  await page.getByRole('button', { name: /Clear data/ }).click()
  const clear = page.getByRole('alertdialog', { name: 'Delete all local data?' })
  await clear.getByLabel(/Type DELETE/).fill('DELETE')
  await clear.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByText(/All local JobIntel data was deleted/)).toBeVisible()
  await page.getByRole('button', { name: /^Import$/ }).click()
  const imp = page.getByRole('dialog', { name: 'Import encrypted backup' })
  await imp.getByLabel('Backup file').setInputFiles(file)
  await imp.getByLabel('Passphrase').fill(passphrase)
  await imp.getByRole('button', { name: /Decrypt & replace/ }).click()
  await expect(page.getByText(/Backup restored/)).toBeVisible()

  await page.goto('./#/referrals')
  await expect(page.getByRole('heading', { name: 'E2E Lead' })).toBeVisible()
  await page.goto('./#/outreach?lead=' + encodeURIComponent((await page.evaluate(() => location.hash)).split('lead=')[1] ?? ''))
  await page.goto('./#/applications')
  await expect(page.getByRole('article').filter({ hasText: title }).first()).toBeVisible()
  expect(problems).toEqual([])
})
