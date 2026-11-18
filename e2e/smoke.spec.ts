import { expect, test } from './api-process';

test('shows the wordmark and reports database ok', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('JobIntel', { exact: true })).toBeVisible();
  await page.getByLabel('Command').fill('status');
  await page.getByLabel('Command').press('Enter');
  await expect(page.getByText('database: ok')).toBeVisible();
});
