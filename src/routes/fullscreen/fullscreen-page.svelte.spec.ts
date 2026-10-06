import * as m from '$lib/paraglide/messages';
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FullscreenPage from './+page.svelte';

const currentPage = vi.hoisted(() => new URL('https://moko256.github.io/bip-bop-web/fullscreen'));

vi.mock('$app/state', () => ({
	page: {
		get url() {
			return currentPage;
		}
	}
}));

function themeColor(scheme: 'light' | 'dark'): string | null | undefined {
	return document
		.querySelector(`meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`)
		?.getAttribute('content');
}

describe('fullscreen page', () => {
	it('uses the site title when the resolution is absent', async () => {
		currentPage.href = 'https://moko256.github.io/bip-bop-web/fullscreen';
		render(FullscreenPage);

		await expect.element(page.getByLabelText(m.bip_bop_preview_aria())).toBeVisible();
		expect(document.title).toBe(m.site_title());
		expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
			'noindex, nofollow'
		);
		expect(document.querySelector('meta[name="description"]')).toBeNull();
		expect(document.querySelector('link[rel="canonical"]')).toBeNull();
		expect(document.querySelector('.locale-anchor')).toBeNull();
		expect(themeColor('light')).toBe('#000000');
		expect(themeColor('dark')).toBe('#000000');
		expect(getComputedStyle(document.documentElement).margin).toBe('0px');
		expect(getComputedStyle(document.body).margin).toBe('0px');
		expect(getComputedStyle(document.documentElement).backgroundColor).toBe('rgb(0, 0, 0)');
		expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(0, 0, 0)');
		expect(
			getComputedStyle(document.documentElement).getPropertyValue('--pico-background-color')
		).toBe('');
		expect(getComputedStyle(document.documentElement).scrollbarGutter).toBe('auto');
		expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(
			document.documentElement.clientHeight
		);
	});

	it('puts the first accepted resolution in the title', async () => {
		currentPage.href =
			'https://moko256.github.io/bip-bop-web/fullscreen?resolution=320x240&resolution=1920x1080';
		render(FullscreenPage);

		await expect.poll(() => document.title).toBe(`${m.site_title()} (320x240)`);
	});

	it('keeps the site title when the resolution is outside the limit', async () => {
		currentPage.href = 'https://moko256.github.io/bip-bop-web/fullscreen?resolution=8001x10';
		render(FullscreenPage);

		await expect.poll(() => document.title).toBe(m.site_title());
	});
});
