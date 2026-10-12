import { expect, test } from '@playwright/test';
import { siteBase } from '../site-url';

const pagePath = `${siteBase}/`;

for (const scheme of ['light', 'dark'] as const) {
	test.describe(scheme, () => {
		test.use({ colorScheme: scheme });

		test('full page screenshot', async ({ page }) => {
			const response = await page.goto(pagePath);
			expect(response?.ok()).toBeTruthy();
			await expect(page.locator('canvas')).toBeVisible();
			await page.screenshot({
				path: `assets/screenshot-${scheme}.png`,
				fullPage: true,
				animations: 'disabled'
			});
		});
	});
}
