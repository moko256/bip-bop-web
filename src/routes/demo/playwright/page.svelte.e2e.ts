import { expect, test } from '@playwright/test';
import { siteBase } from '../../../../site-url';

test('has expected h1', async ({ page }) => {
	await page.goto(`${siteBase}/demo/playwright`);
	await expect(page.locator('h1')).toBeVisible();
});
