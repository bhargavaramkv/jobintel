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

test('dashboard loads under the project base path with honest empty states', async ({ page }) => {
  const external = trackExternalRequests(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  await expect(page.getByText('Your job feed is not connected yet')).toBeVisible()
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

test('unknown hash routes fall back to the dashboard', async ({ page }) => {
  await page.goto('./#/does-not-exist')
  await expect(page.getByText('Your job feed is not connected yet')).toBeVisible()
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
