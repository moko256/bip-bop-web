import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ErrorPage from './+error.svelte';

const kit = vi.hoisted(() => ({
	status: 404,
	error: { message: 'Not Found' } as { message: string } | null
}));

vi.mock('$app/state', () => ({
	page: {
		get status() {
			return kit.status;
		},
		get error() {
			return kit.error;
		}
	}
}));

describe('error page', () => {
	it('shows the status and a link back to the top', async () => {
		render(ErrorPage);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('404 Not Found');
		await expect
			.element(page.getByRole('link', { name: 'Back to TOP' }))
			.toHaveAttribute('href', '/bip-bop-web/');
		expect(themeColor('light')).toBe('#ffffff');
		expect(themeColor('dark')).toBe('#13171f');
		await expect
			.poll(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--pico-background-color')
			)
			.toBe('#fff');
		await expect
			.poll(() => getComputedStyle(document.documentElement).scrollbarGutter)
			.toBe('stable');
	});
});

function themeColor(scheme: 'light' | 'dark'): string | null | undefined {
	return document
		.querySelector(`meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`)
		?.getAttribute('content');
}
