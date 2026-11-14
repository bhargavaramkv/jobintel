import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const ROUTES = [
  ['dashboard', ''],
  ['onboarding', '#/onboarding'],
  ['resumes', '#/resumes'],
  ['discovery', '#/jobs'],
  ['applications', '#/applications'],
  ['activity', '#/activity'],
  ['settings', '#/settings'],
] as const

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

for (const [name, hash] of ROUTES) {
  test(`${name} renders cleanly`, async ({ page }) => {
    const external = trackExternalRequests(page)
    await page.goto(`./${hash}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Prototype data').first()).toBeVisible()
    // Wait for the simulated load to finish before measuring.
    await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([])
    expect(external).toEqual([])
  })
}

test('unknown routes fall back to the Dashboard under the project base path', async ({ page }) => {
  await page.goto('./#/does-not-exist')
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
})
