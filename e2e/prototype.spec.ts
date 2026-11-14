import { expect, test, type Page } from '@playwright/test'

const progress = (page: Page) => page.getByRole('progressbar', { name: 'Run progress' })
const scenario = (page: Page, label: string) => page.getByRole('combobox', { name: 'Scenario' }).selectOption({ label })
const goTo = (page: Page, name: string) => page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name }).click()

test('start the agent, see progress move, then pause', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Start/ }).click()
  await expect.poll(async () => Number(await progress(page).getAttribute('aria-valuenow')), { timeout: 8000 }).toBeGreaterThan(0)
  await page.getByRole('button', { name: /Pause/ }).click()
  await expect(page.getByRole('heading', { name: 'Agent paused' })).toBeVisible()
})

test('approving the first needs-attention item shows it as Submitted', async ({ page }) => {
  await page.goto('./')
  const list = page.getByRole('region', { name: 'Needs attention' })
  await list.getByRole('button', { name: 'Approve' }).first().click()
  await expect(page.getByRole('status').filter({ hasText: 'Simulated' })).toBeVisible()
  await goTo(page, 'Applications')
  await expect(page.getByRole('heading', { name: /^Submitted \(\d+\)$/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Submitted (2)' })).toBeVisible()
})

test('the empty scenario shows an empty state on Discovery', async ({ page }) => {
  await page.goto('./')
  await scenario(page, 'New user (empty)')
  await goTo(page, 'Discovery')
  await expect(page.getByText('No jobs discovered yet')).toBeVisible()
})

test('the error scenario offers Retry, and Demo recovers', async ({ page }) => {
  await page.goto('./')
  await scenario(page, 'Simulate error')
  await goTo(page, 'Discovery')
  const retry = page.getByRole('button', { name: 'Retry' })
  await expect(retry).toBeVisible()
  await retry.click()
  await expect(retry).toBeVisible()
  await scenario(page, 'Demo')
  await expect(page.getByRole('tab', { name: /Selected/ })).toBeVisible()
})
