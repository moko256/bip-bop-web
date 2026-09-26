import { expect, test } from '@playwright/test';
import { siteBase } from '../site-url';

const pagePath = `${siteBase}/`;
const screenshotPath = 'test-results/full-page.png';

test('full page screenshot', async ({ page }) => {
	const response = await page.goto(pagePath);
	expect(response?.ok()).toBeTruthy();
	await page.screenshot({ path: screenshotPath, fullPage: true });
});
