import { expect, test } from '@playwright/test';

test('home page shows the bip-bop preview', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas[aria-label="Bip-Bop preview"]')).toBeVisible();
});

test('demo routes are not served', async ({ page }) => {
	for (const path of ['/demo', '/demo/playwright']) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(404);
	}
});
