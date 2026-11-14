import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

import { JOB_HASH, seed } from './helpers'

const ROUTES = [
  ['dashboard', ''],
  ['setup', '#/onboarding'],
  ['setup step', '#/onboarding?step=skills'],
  ['resumes', '#/resumes'],
  ['jobs', '#/jobs'],
  ['jobs with filters', '#/jobs?q=engineer&city=Bengaluru&mode=hybrid&min=0&sort=newest'],
  ['job detail', JOB_HASH],
  ['applications', '#/applications'],
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

async function checkScreen(page: Page, external: string[]) {
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([])
  expect(external).toEqual([])
}

for (const populated of [false, true]) {
  for (const [name, hash] of ROUTES) {
    test(`${name} opens by direct URL and is clean (${populated ? 'with saved data' : 'first visit'})`, async ({ page }) => {
      const external = trackExternalRequests(page)
      if (populated) await seed(page)
      await page.goto(`./${hash}`)
      await checkScreen(page, external)
    })
  }
}

test('no horizontal scroll at 375px on the busiest screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page)
  for (const hash of ['#/jobs', JOB_HASH, '#/applications', '#/settings', '#/onboarding?step=location', '#/resumes']) {
    await page.goto(`./${hash}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, hash).toBeLessThanOrEqual(1)
  }
})

test('unknown routes and the removed /activity route land on the Dashboard', async ({ page }) => {
  for (const hash of ['#/does-not-exist', '#/activity']) {
    await page.goto(`./${hash}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
    await expect(page).toHaveURL(/\/jobintel\/#\/$/)
  }
})

// GitHub Pages serves public/404.html for any path that is not a file. The preview server falls back to
// index.html instead, so serve the real 404.html for these paths and check that its script lands on the hash route.
const NOT_FOUND_PAGE = readFileSync('public/404.html', 'utf8')

for (const [path, expected, heading] of [
  ['/jobintel/jobs', '/jobintel/#/jobs', 'Jobs'],
  ['/jobintel/jobs?q=react&city=Bengaluru', '/jobintel/#/jobs?q=react&city=Bengaluru', 'Jobs'],
  ['/jobintel/applications', '/jobintel/#/applications', 'Applications'],
  ['/jobintel/settings', '/jobintel/#/settings', 'Settings'],
  ['/jobintel/resumes', '/jobintel/#/resumes', 'Resumes'],
  ['/jobintel/onboarding', '/jobintel/#/onboarding', 'Setup'],
] as const) {
  test(`path URL ${path} redirects through 404.html to ${expected}`, async ({ page }) => {
    const target = new URL(path, 'http://localhost:4173')
    await page.route(
      (url) => url.origin === target.origin && url.pathname === target.pathname,
      (route) => route.fulfill({ status: 404, contentType: 'text/html', body: NOT_FOUND_PAGE }),
    )
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${expected.replace(/[.?]/g, '\\$&')}$`))
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  })
}
