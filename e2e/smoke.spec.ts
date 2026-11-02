import { expect, test, type Page } from '@playwright/test'

/** Record every request that leaves the local preview origin. */
function trackExternalRequests(page: Page) {
  const external: string[] = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol !== 'data:' && url.protocol !== 'blob:') {
      external.push(req.url())
    }
  })
  return external
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

test('dashboard loads under the project base path with the published feed', async ({ page }) => {
  const external = trackExternalRequests(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Job Feed', exact: true })).toBeVisible()
  await expect(page.getByText(/Discovery (active|feed is stale)/)).toBeVisible()
  await expect(page.getByTestId('readiness-score')).toHaveText('0%')
  await expectNoHorizontalScroll(page)
  expect(external).toEqual([])
})

test('profile persists across a reload and deep links survive refresh', async ({ page }) => {
  const external = trackExternalRequests(page)
  await page.goto('./#/profile?section=identity')
  await page.getByLabel('Current job title').fill('Platform Engineer')
  await page.getByLabel('Years of experience').fill('4')
  await page.getByRole('button', { name: /Save profile/ }).click()
  await expect(page.getByText(/Saved locally/)).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Current job title')).toHaveValue('Platform Engineer')

  await page.goto('./#/profile?section=skills')
  const skills = page.getByLabel('Primary skills', { exact: true })
  await skills.fill('TypeScript')
  await skills.press('Enter')
  await skills.fill('typescript')
  await skills.press('Enter')
  await expect(page.getByRole('alert')).toContainText('already in the list')
  await page.getByRole('button', { name: /Save profile/ }).click()
  await expect(page.getByText(/Saved locally/)).toBeVisible()
  await expectNoHorizontalScroll(page)

  await page.goto('./')
  await expect(page.getByTestId('readiness-score')).toHaveText('27%')
  // Profile fields never leave the browser.
  expect(external).toEqual([])
})

test('encrypted backup exports, and restores after clearing data', async ({ page }) => {
  const passphrase = 'e2e test passphrase only'
  await page.goto('./#/profile?section=identity')
  await page.getByLabel('Current job title').fill('Backup Check Engineer')
  await page.getByRole('button', { name: /Save profile/ }).click()
  await expect(page.getByText(/Saved locally/)).toBeVisible()

  await page.getByRole('button', { name: 'Data & privacy' }).click()
  // Dialog forms must never be nested inside another form.
  await page.getByRole('button', { name: /^Export$/ }).click()
  expect(await page.evaluate(() => document.querySelectorAll('form form').length)).toBe(0)
  const dialog = page.getByRole('dialog', { name: 'Export encrypted backup' })
  await dialog.getByLabel('Passphrase', { exact: true }).fill(passphrase)
  await dialog.getByLabel('Confirm passphrase').fill(passphrase)
  await dialog.getByRole('checkbox').check()
  const downloadPromise = page.waitForEvent('download')
  await dialog.getByRole('button', { name: /Encrypt & download/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^jobintel-backup-.*\.jibak\.json$/)
  const file = await download.path()
  await expect(page.getByText(/Encrypted backup downloaded/)).toBeVisible()

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

  await page.getByRole('button', { name: 'Professional identity' }).click()
  await expect(page.getByLabel('Current job title')).toHaveValue('Backup Check Engineer')
})

test('unknown hash routes fall back to the dashboard', async ({ page }) => {
  await page.goto('./#/does-not-exist')
  await expect(page.getByRole('heading', { name: 'Job Feed', exact: true })).toBeVisible()
})

test('job discovery lists public jobs from the same origin and filters in the browser', async ({ page }) => {
  const external = trackExternalRequests(page)
  const feedRequests: string[] = []
  page.on('request', (r) => r.url().includes('/data/') && feedRequests.push(r.url()))
  await page.goto('./#/jobs')
  await expect(page.getByRole('heading', { name: 'Job Discovery' })).toBeVisible()
  await expect(page.getByTestId('result-count')).toContainText(/Showing \d+ of \d+/)
  const first = page.locator('article.job').first()
  await expect(first.getByRole('link').first()).toHaveAttribute('target', '_blank')
  await first.getByRole('button', { name: /Details/ }).click()
  await expect(first.getByText('Description excerpt')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search jobs' }).fill('zzzz-no-such-job')
  await expect(page.getByText('No jobs match these filters')).toBeVisible()
  await expectNoHorizontalScroll(page)
  // Only the static feed is fetched, with no query string carrying user data.
  expect(feedRequests.every((u) => u.endsWith('/jobintel/data/jobs.json'))).toBe(true)
  expect(external).toEqual([])
})

test('uses the dark blue/cyan theme with no purple accent', async ({ page }) => {
  await page.goto('./')
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(7, 11, 18)')
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase(),
  )
  expect(accent).toBe('#16b8ff')
})
