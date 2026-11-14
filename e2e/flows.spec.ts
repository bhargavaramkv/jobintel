import { expect, test } from '@playwright/test'
import { OPEN, seed } from './helpers'

const OPEN_COUNT = OPEN.length

const TEX = Buffer.from('\\documentclass{article}\n\\begin{document}\nHello resume\n\\end{document}\n')

test('Jobs lists the real feed and search and filters survive a reload', async ({ page }) => {
  await page.goto('./#/jobs')
  await expect(page.getByText(`${OPEN_COUNT} of ${OPEN_COUNT} jobs`)).toBeVisible()
  await page.getByLabel('Search').fill('engineer')
  await page.getByLabel('City').selectOption('Hyderabad')
  await expect(page).toHaveURL(/#\/jobs\?q=engineer&city=Hyderabad$/)
  await expect(page.getByText(/^\d+ of \d+ jobs$/)).not.toHaveText(`${OPEN_COUNT} of ${OPEN_COUNT} jobs`)
  const shown = await page.getByText(/^\d+ of \d+ jobs$/).textContent()
  await page.reload()
  await expect(page.getByLabel('Search')).toHaveValue('engineer')
  await expect(page.getByLabel('City')).toHaveValue('Hyderabad')
  await expect(page.getByText(shown!)).toBeVisible()
})

test('a search with no hits shows the empty state and Clear filters restores the list', async ({ page }) => {
  await page.goto('./#/jobs?q=zzzzqqqq')
  await expect(page.getByText('No jobs match these filters')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).last().click()
  await expect(page.getByText(`${OPEN_COUNT} of ${OPEN_COUNT} jobs`)).toBeVisible()
})

test('Track adds a job to Applications, and its status and notes persist after a reload', async ({ page }) => {
  await page.goto('./#/jobs')
  await page.locator('a.select-row').first().click()
  await expect(page.getByRole('link', { name: /Open posting/ })).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(page.getByRole('link', { name: /Open posting/ })).toHaveAttribute('target', '_blank')
  await page.getByRole('button', { name: 'Track' }).click()
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Applications' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Applications' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Saved' })).toHaveCount(1)
  await page.getByLabel(/^Status for/).selectOption('Offer')
  await page.getByLabel(/^Notes for/).fill('Spoke to the recruiter')
  await page.reload()
  await expect(page.getByLabel(/^Status for/)).toHaveValue('offer')
  await expect(page.getByLabel(/^Notes for/)).toHaveValue('Spoke to the recruiter')
  await page.getByRole('link', { name: 'View job' }).click()
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
  await expect(page).toHaveURL(/#\/jobs\/.+/)
  await page.getByRole('link', { name: 'Tracked: view in Applications' }).click()
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('No tracked jobs yet')).toBeVisible()
})

test('uploading a .tex master resume shows its source with line numbers and keeps it after reload', async ({ page }) => {
  await page.goto('./#/resumes')
  await page.getByLabel(/Upload master resume/).setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') })
  await expect(page.getByRole('alert')).toContainText('.tex')
  await page.getByLabel(/Upload master resume/).setInputFiles({ name: 'master.tex', mimeType: 'text/plain', buffer: TEX })
  await expect(page.getByRole('heading', { level: 2, name: 'master.tex' })).toBeVisible()
  await expect(page.getByLabel('Master resume source')).toContainText('Hello resume')
  await page.reload()
  await expect(page.getByLabel('Master resume source')).toContainText('Hello resume')
  await expect(page.locator('.code__no').first()).toHaveText('1')
})

test('Setup finishes, saves the profile in this browser and opens the Dashboard', async ({ page }) => {
  await page.goto('./#/onboarding')
  await page.getByLabel(/Upload master resume/).setInputFiles({ name: 'master.tex', mimeType: 'text/plain', buffer: Buffer.from(String.raw`\documentclass{article}
\begin{document}
\section{Skills}
C\#, .NET, React
\section{Experience}
\role{Software Engineer II}{Example}{2022 -- Present}
\end{document}
`) })
  const next = page.getByRole('button', { name: 'Next' })
  await next.click()
  await page.getByLabel('Name').fill('Test User')
  await page.getByLabel('Current title').fill('Software Engineer')
  await page.getByLabel(/Years of experience/).fill('4')
  await page.getByLabel('Professional summary').fill('Builds services.')
  await next.click()
  await expect(page.getByText('Software Engineer', { exact: true })).toBeVisible()
  await next.click()
  await expect(page.getByText('.NET', { exact: true })).toBeVisible()
  await next.click()
  await page.getByRole('checkbox', { name: 'Hybrid' }).check()
  await next.click()
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Set up your profile to get started')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Set up your profile to get started')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Top matches' })).toBeVisible()
})

test('Dashboard shows real feed numbers and the tracked count for a saved profile', async ({ page }) => {
  await seed(page)
  await page.goto('./')
  const kpis = page.getByRole('region', { name: 'Key numbers' })
  await expect(kpis).toContainText('Open jobs')
  await expect(kpis.locator('.kpi').first().locator('.kpi__value')).toHaveText(String(OPEN_COUNT))
  await expect(kpis.locator('.kpi').nth(3).locator('.kpi__value')).toHaveText('1')
  await expect(page.getByRole('heading', { name: 'Top matches' })).toBeVisible()
})

test('Settings minimum score changes what Jobs shows', async ({ page }) => {
  await seed(page)
  await page.goto('./#/settings')
  await page.getByLabel('Minimum match score').fill('100')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Settings saved' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Jobs' }).click()
  await expect(page.getByLabel('Minimum match score')).toHaveValue('100')
  await expect(page.getByText(/^\d+ of \d+ jobs$/)).toBeVisible()
})

test('an invalid feed shows an error with Retry', async ({ page }) => {
  await page.route('**/data/jobs.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"formatVersion":99}' }))
  await page.goto('./#/jobs')
  await expect(page.getByRole('alert')).toContainText('expected format')
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
})
